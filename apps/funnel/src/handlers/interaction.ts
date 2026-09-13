import { MessageFlags, type ChatInputCommandInteraction } from 'discord.js'
import { and, eq } from 'drizzle-orm'
import { funnelGuilds, funnelInvites, type Database } from '@gict/db'
import type { InviteCache } from '../invites/cache'
import { readInvites, readVanity } from '../invites/read'
import { persistInvites } from '../invites/store'
import {
  confidenceBreakdown,
  ensureSource,
  invitesWithSources,
  joinsBySource,
  topInviters,
} from '../queries'

/**
 * A mention inside an embed description is inert, but the same text in a plain
 * message pings. Every report here names people, so without this a leaderboard
 * would notify everyone on it each time somebody looked.
 */
const NO_PINGS = { parse: [] } as const

export async function onCommand(
  interaction: ChatInputCommandInteraction,
  database: Database,
  cache: InviteCache,
): Promise<void> {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: 'Funnel only works inside a server.',
      flags: MessageFlags.Ephemeral,
    })
    return
  }

  const group = interaction.options.getSubcommandGroup(false)
  const sub = interaction.options.getSubcommand()

  if (group === 'source') {
    if (sub === 'set') return sourceSet(interaction, database, cache)
    if (sub === 'unset') return sourceUnset(interaction, database)
    if (sub === 'list') return sourceList(interaction, database)
  }

  if (sub === 'setup') return setup(interaction, database)
  if (sub === 'leaderboard') return leaderboard(interaction, database)
  if (sub === 'sources') return sources(interaction, database)
}

/** Accepts a bare code or a pasted link, because people paste the link. */
function parseCode(input: string): string {
  return (
    input
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/^(www\.)?discord\.gg\//, '')
      .replace(/^discord\.com\/invite\//, '')
      .split(/[/?]/)[0] ?? ''
  )
}

async function setup(interaction: ChatInputCommandInteraction, database: Database): Promise<void> {
  const channel = interaction.options.getChannel('channel')

  await database
    .update(funnelGuilds)
    .set({ logChannelId: channel?.id ?? null })
    .where(eq(funnelGuilds.id, interaction.guildId!))

  await interaction.reply({
    content: channel
      ? `Join notices will go to <#${channel.id}>.`
      : 'Join notices are off. Arrivals are still recorded and the reports still work.',
    flags: MessageFlags.Ephemeral,
  })
}

async function sourceSet(
  interaction: ChatInputCommandInteraction,
  database: Database,
  cache: InviteCache,
): Promise<void> {
  const code = parseCode(interaction.options.getString('invite', true))
  const name = interaction.options.getString('name', true).trim()
  const guildId = interaction.guildId!

  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const known = await database
    .select({ code: funnelInvites.code })
    .from(funnelInvites)
    .where(and(eq(funnelInvites.code, code), eq(funnelInvites.guildId, guildId)))
    .limit(1)

  // An invite made since the last sync will not be on file yet, which is the
  // normal case when someone creates one and tags it in the same minute.
  if (known.length === 0 && interaction.guild) {
    const invites = await readInvites(interaction.guild)
    if (invites) {
      cache.replace(guildId, invites, await readVanity(interaction.guild))
      await persistInvites(database, guildId, invites)
    }
    if (!invites?.some((invite) => invite.code === code)) {
      await interaction.editReply(
        `No invite \`${code}\` in this server. Check the code and try again.`,
      )
      return
    }
  }

  const source = await ensureSource(database, guildId, name)
  await database
    .update(funnelInvites)
    .set({ sourceId: source.id })
    .where(and(eq(funnelInvites.code, code), eq(funnelInvites.guildId, guildId)))

  await interaction.editReply(
    `\`${code}\` is now tagged **${source.name}**. Joins through it from here on are counted under that; earlier ones keep whatever they were recorded as.`,
  )
}

async function sourceUnset(
  interaction: ChatInputCommandInteraction,
  database: Database,
): Promise<void> {
  const code = parseCode(interaction.options.getString('invite', true))

  await database
    .update(funnelInvites)
    .set({ sourceId: null })
    .where(and(eq(funnelInvites.code, code), eq(funnelInvites.guildId, interaction.guildId!)))

  await interaction.reply({
    content: `\`${code}\` is no longer tagged.`,
    flags: MessageFlags.Ephemeral,
  })
}

async function sourceList(
  interaction: ChatInputCommandInteraction,
  database: Database,
): Promise<void> {
  const rows = await invitesWithSources(database, interaction.guildId!)

  if (rows.length === 0) {
    await interaction.reply({
      content: 'No invites on file yet. Create one and it will appear here.',
      flags: MessageFlags.Ephemeral,
    })
    return
  }

  const body = rows
    .map(
      (row) =>
        `\`${row.code}\` · ${row.uses} use${row.uses === 1 ? '' : 's'} · ${row.source ?? '_untagged_'}`,
    )
    .join('\n')

  await interaction.reply({
    content: `## Invites\n${body}`.slice(0, 2000),
    flags: MessageFlags.Ephemeral,
  })
}

async function leaderboard(
  interaction: ChatInputCommandInteraction,
  database: Database,
): Promise<void> {
  const rows = await topInviters(database, interaction.guildId!)

  const body =
    rows.length === 0
      ? '_Nobody yet._'
      : rows.map((row, index) => `**${index + 1}.** <@${row.inviterId}> — ${row.joins}`).join('\n')

  await interaction.reply({
    content: `## Top inviters\n${body}\n${await caveat(database, interaction.guildId!)}`,
    allowedMentions: NO_PINGS,
  })
}

async function sources(
  interaction: ChatInputCommandInteraction,
  database: Database,
): Promise<void> {
  const rows = await joinsBySource(database, interaction.guildId!)
  const total = rows.reduce((sum, row) => sum + row.joins, 0)

  const body =
    rows.length === 0
      ? '_Nobody has joined since tracking started._'
      : rows
          .map((row) => {
            const share = total === 0 ? 0 : Math.round((row.joins / total) * 100)
            return `**${row.source}** — ${row.joins} (${share}%)`
          })
          .join('\n')

  await interaction.reply({
    content: `## Where members came from\n${body}\n${await caveat(database, interaction.guildId!)}`,
    allowedMentions: NO_PINGS,
  })
}

/**
 * The honesty line under every report, as Discord subtext.
 *
 * Discord never says which invite was used, so some share of these joins is
 * inferred and some is genuinely unknowable. A breakdown with a third of its
 * joins unattributed is a different thing from one without, and nobody reading
 * it can tell unless it says so.
 */
async function caveat(database: Database, guildId: string): Promise<string> {
  const rows = await confidenceBreakdown(database, guildId)
  const total = rows.reduce((sum, row) => sum + row.joins, 0)
  if (total === 0) return '-# Nothing recorded yet. Counting starts from when the bot joined.'

  const exact = rows.find((row) => row.confidence === 'certain')?.joins ?? 0
  const murky = total - exact
  if (murky === 0) return `-# All time · ${total} joins, every one attributed exactly`

  return `-# All time · ${total} joins · ${murky} could not be pinned to a single invite`
}

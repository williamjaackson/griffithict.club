import { EmbedBuilder, MessageFlags, type ChatInputCommandInteraction } from 'discord.js'
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
  since,
  topInviters,
} from '../queries'

const BRAND = 0xe51b13
const DEFAULT_DAYS = 30

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
    embeds: [
      new EmbedBuilder().setColor(BRAND).setTitle('Invites').setDescription(body.slice(0, 4000)),
    ],
    flags: MessageFlags.Ephemeral,
  })
}

async function leaderboard(
  interaction: ChatInputCommandInteraction,
  database: Database,
): Promise<void> {
  const days = interaction.options.getInteger('days') ?? DEFAULT_DAYS
  const from = since(days)
  const rows = await topInviters(database, interaction.guildId!, from)

  const body =
    rows.length === 0
      ? 'Nobody yet.'
      : rows.map((row, index) => `**${index + 1}.** <@${row.inviterId}> — ${row.joins}`).join('\n')

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(BRAND)
        .setTitle(`Top inviters · last ${days} days`)
        .setDescription(body)
        .setFooter({ text: await caveat(database, interaction.guildId!, from) }),
    ],
  })
}

async function sources(
  interaction: ChatInputCommandInteraction,
  database: Database,
): Promise<void> {
  const days = interaction.options.getInteger('days') ?? DEFAULT_DAYS
  const from = since(days)
  const rows = await joinsBySource(database, interaction.guildId!, from)
  const total = rows.reduce((sum, row) => sum + row.joins, 0)

  const body =
    rows.length === 0
      ? 'Nobody has joined in this window.'
      : rows
          .map((row) => {
            const share = total === 0 ? 0 : Math.round((row.joins / total) * 100)
            return `**${row.source}** — ${row.joins} (${share}%)`
          })
          .join('\n')

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(BRAND)
        .setTitle(`Where members came from · last ${days} days`)
        .setDescription(body)
        .setFooter({ text: await caveat(database, interaction.guildId!, from) }),
    ],
  })
}

/**
 * The honesty line under every report.
 *
 * Discord never says which invite was used, so some share of these joins is
 * inferred and some is genuinely unknowable. A breakdown with a third of its
 * joins unattributed is a different thing from one without, and nobody reading
 * it can tell unless it says so.
 */
async function caveat(database: Database, guildId: string, from: Date): Promise<string> {
  const rows = await confidenceBreakdown(database, guildId, from)
  const total = rows.reduce((sum, row) => sum + row.joins, 0)
  if (total === 0) return 'No joins recorded yet'

  const exact = rows.find((row) => row.confidence === 'certain')?.joins ?? 0
  const murky = total - exact
  if (murky === 0) return `${total} joins, all attributed exactly`

  return `${total} joins · ${murky} could not be pinned to one invite`
}

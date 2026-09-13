import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from 'discord.js'
import { and, eq } from 'drizzle-orm'
import { funnelInvites, type Database } from '@gict/db'
import type { InviteCache } from '../invites/cache'
import { readInvites, readVanity } from '../invites/read'
import { persistInvites, upsertInvite } from '../invites/store'
import { barChart } from '../chart'
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

/**
 * Private unless the caller asked to post it.
 *
 * Returns the flags rather than a boolean so the call sites spread it and
 * cannot accidentally pass `flags: undefined`, which Discord reads as public.
 */
function privacy(interaction: ChatInputCommandInteraction): { flags?: MessageFlags.Ephemeral } {
  return interaction.options.getBoolean('share') ? {} : { flags: MessageFlags.Ephemeral }
}

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
    if (sub === 'create') return sourceCreate(interaction, database, cache)
    if (sub === 'set') return sourceSet(interaction, database, cache)
    if (sub === 'unset') return sourceUnset(interaction, database)
    if (sub === 'list') return sourceList(interaction, database)
  }

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

async function sourceCreate(
  interaction: ChatInputCommandInteraction,
  database: Database,
  cache: InviteCache,
): Promise<void> {
  const name = interaction.options.getString('name', true).trim()
  const requested = interaction.options.getChannel('channel')
  const guildId = interaction.guildId!

  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const channel =
    (requested && interaction.guild?.channels.cache.get(requested.id)) ??
    (interaction.channel?.type === ChannelType.GuildText ? interaction.channel : null)

  if (!channel || channel.type !== ChannelType.GuildText) {
    await interaction.editReply('Pick a text channel for the invite to land in.')
    return
  }

  const me = interaction.guild?.members.me
  if (me && !channel.permissionsFor(me).has(PermissionFlagsBits.CreateInstantInvite)) {
    await interaction.editReply(
      `I cannot create invites in <#${channel.id}>. Grant **Create Invite** there, or re-add me with the current permissions.`,
    )
    return
  }

  let invite
  try {
    invite = await channel.createInvite({
      // The whole point. Without it Discord hands back an existing invite with
      // matching settings and both sources end up sharing one code.
      unique: true,
      // Never expires, unlimited uses: a link printed in a handbook has to keep
      // working, and a use cap would silently kill it mid-campaign.
      maxAge: 0,
      maxUses: 0,
      reason: `Funnel source: ${name}`,
    })
  } catch {
    await interaction.editReply(
      'Discord refused to create the invite. Check my permissions on that channel.',
    )
    return
  }

  const snapshot = {
    code: invite.code,
    uses: invite.uses ?? 0,
    inviterId: invite.inviter?.id ?? null,
    maxUses: invite.maxUses ?? 0,
  }
  cache.add(guildId, snapshot)
  await upsertInvite(database, guildId, snapshot)

  const source = await ensureSource(database, guildId, name)
  await database
    .update(funnelInvites)
    .set({ sourceId: source.id })
    .where(and(eq(funnelInvites.code, invite.code), eq(funnelInvites.guildId, guildId)))

  await interaction.editReply(
    [
      `**${source.name}** → https://discord.gg/${invite.code}`,
      `-# Never expires, unlimited uses. Put this exactly where that source lives and nowhere else, or the numbers blur.`,
    ].join('\n'),
  )
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
  const flags = privacy(interaction)
  const rows = await topInviters(database, interaction.guildId!)

  const body =
    rows.length === 0
      ? '_Nobody yet._'
      : rows.map((row, index) => `**${index + 1}.** <@${row.inviterId}> — ${row.joins}`).join('\n')

  await interaction.reply({
    content: `## Top inviters\n${body}\n${await caveat(database, interaction.guildId!)}`,
    allowedMentions: NO_PINGS,
    ...flags,
  })
}

async function sources(
  interaction: ChatInputCommandInteraction,
  database: Database,
): Promise<void> {
  const flags = privacy(interaction)
  const rows = await joinsBySource(database, interaction.guildId!)

  if (rows.length === 0) {
    await interaction.reply({
      content: `## Where members came from\n_Nobody has joined since tracking started._\n${await caveat(database, interaction.guildId!)}`,
      ...flags,
    })
    return
  }

  const chart = barChart(rows.map((row) => ({ label: row.source, value: row.joins })))

  await interaction.reply({
    content: [
      '## Where members came from',
      // A fenced block, so Discord renders it monospaced and the bars line up.
      // Without it proportional spacing makes the columns wander.
      '```',
      chart,
      '```',
      await caveat(database, interaction.guildId!),
    ].join('\n'),
    allowedMentions: NO_PINGS,
    ...flags,
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

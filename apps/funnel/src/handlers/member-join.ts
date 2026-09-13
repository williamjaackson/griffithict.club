import { ChannelType, type GuildMember } from 'discord.js'
import { eq } from 'drizzle-orm'
import { funnelGuilds, funnelJoins, type Database } from '@gict/db'
import { attribute, type Attribution } from '../invites/attribute'
import type { InviteCache } from '../invites/cache'
import { readInvites, readVanity } from '../invites/read'
import { persistInvites, sourceForInvite } from '../invites/store'

/**
 * A mention in a plain message pings, unlike one inside an embed description.
 * Crediting an inviter should not notify them every time someone joins.
 */
const NO_PINGS = { parse: [] } as const

/**
 * Work out where a new member came from, record it, and say so if asked to.
 *
 * The read has to happen now rather than on a timer. Discord's counts are the
 * only evidence there is, and a second join overwrites the first one's evidence.
 */
export async function onMemberJoin(
  member: GuildMember,
  database: Database,
  cache: InviteCache,
): Promise<void> {
  const { guild } = member

  const before = cache.snapshot(guild.id)
  const vanityBefore = cache.vanitySnapshot(guild.id)

  const after = await readInvites(guild)
  const vanityAfter = await readVanity(guild)

  // Null means Manage Server is missing. Still worth recording the arrival, just
  // with nothing to attribute it to.
  const result: Attribution =
    after === null ? { confidence: 'unknown' } : attribute(before, after, vanityBefore, vanityAfter)

  if (after !== null) {
    cache.replace(guild.id, after, vanityAfter)
    await persistInvites(database, guild.id, after)
  }

  const code = 'code' in result ? result.code : null
  const source = code ? await sourceForInvite(database, guild.id, code) : null

  await database.insert(funnelJoins).values({
    guildId: guild.id,
    memberId: member.id,
    joinedAt: member.joinedAt ?? new Date(),
    inviteCode: code,
    inviterId: result.confidence === 'certain' ? result.inviterId : null,
    sourceId: source?.id ?? null,
    // Frozen here rather than joined at read time, so renaming a source later
    // does not rewrite what earlier reports said.
    sourceName: source?.name ?? null,
    confidence: result.confidence,
    candidates: result.confidence === 'ambiguous' ? result.candidates : null,
    accountCreatedAt: member.user.createdAt,
  })

  await announce(member, database, result, source?.name ?? null)
}

async function announce(
  member: GuildMember,
  database: Database,
  result: Attribution,
  sourceName: string | null,
): Promise<void> {
  const [row] = await database
    .select({ channelId: funnelGuilds.logChannelId })
    .from(funnelGuilds)
    .where(eq(funnelGuilds.id, member.guild.id))
    .limit(1)

  if (!row?.channelId) return

  const channel = member.guild.channels.cache.get(row.channelId)
  if (!channel || channel.type !== ChannelType.GuildText) return

  const content = [
    `**${member.user.username}** ${describe(result, sourceName)}`,
    `-# Account ${accountAge(member.user.createdAt)}`,
  ].join('\n')

  await channel.send({ content, allowedMentions: NO_PINGS }).catch(() => {
    // Losing a notice is not worth losing the row that was already written.
  })
}

/**
 * How old the account is, in words.
 *
 * The cheapest signal there is for telling a recruiting win from a wave of
 * throwaway accounts, which is why it sits on every notice rather than being
 * something you go looking for after the fact.
 */
function accountAge(createdAt: Date): string {
  const days = Math.floor((Date.now() - createdAt.getTime()) / 86_400_000)
  if (days < 1) return 'created today'
  if (days === 1) return 'created yesterday'
  if (days < 30) return `${days} days old`
  if (days < 365) return `${Math.floor(days / 30)} months old`
  const years = Math.floor(days / 365)
  return `${years} year${years === 1 ? '' : 's'} old`
}

/** Says what is actually known, including when that is nothing. */
function describe(result: Attribution, sourceName: string | null): string {
  switch (result.confidence) {
    case 'certain': {
      const who = result.inviterId ? `invited by <@${result.inviterId}>` : `used \`${result.code}\``
      return sourceName ? `Joined from **${sourceName}**, ${who}` : `Joined, ${who}`
    }
    case 'vanity':
      return `Joined through the vanity link \`discord.gg/${result.code}\``
    case 'ambiguous':
      return `Joined, but several invites moved at once: ${result.candidates
        .map((code) => `\`${code}\``)
        .join(', ')}`
    // No 'offline' case: attribute() cannot return it. That value is reserved
    // for reconciling downtime, which nothing writes yet.
    case 'unknown':
      return 'Joined without an invite — Server Discovery, a Student Hub, or a direct add'
  }
}

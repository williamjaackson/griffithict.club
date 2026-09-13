/**
 * Working out which invite a member used.
 *
 * Discord does not tell you. `guildMemberAdd` hands over a member and nothing
 * else, and there has never been a field for this. The only technique that works
 * is to hold every invite's use count, re-read them the moment someone joins, and
 * see which one moved.
 *
 * That inference is exact most of the time and genuinely impossible the rest of
 * it, so this returns how much the answer is worth rather than always naming a
 * single invite. Two people joining in the same second move two counters, and no
 * amount of cleverness pairs them back up. A bot that picks one anyway is quietly
 * wrong a few percent of the time, which is the worst outcome for a number you
 * intend to spend recruiting effort on.
 *
 * Kept free of discord.js on purpose: this is the whole risk of the project, and
 * it is worth being able to test every branch without a gateway connection.
 */

export type InviteSnapshot = {
  code: string
  uses: number
  /** Null for the vanity URL, and when Discord declines to name a creator. */
  inviterId: string | null
  /**
   * The cap, with 0 meaning unlimited, which is Discord's own convention.
   *
   * Not used to attribute anything. It is here so that when an invite
   * disappears, the bot can tell "spent its last use" from "a moderator revoked
   * it" — two very different events that arrive as the same inviteDelete.
   */
  maxUses: number
}

/** The guild's vanity URL, which Discord counts outside the invite list. */
export type VanitySnapshot = { code: string; uses: number } | null

export type Attribution =
  | { confidence: 'certain'; code: string; inviterId: string | null }
  | { confidence: 'vanity'; code: string }
  | { confidence: 'ambiguous'; candidates: string[] }
  | { confidence: 'unknown' }

/**
 * Compare two readings of a guild's invites and name the one that was used.
 *
 * `before` is what we held before the join, `after` what Discord returned once it
 * arrived.
 */
export function attribute(
  before: readonly InviteSnapshot[],
  after: readonly InviteSnapshot[],
  vanityBefore: VanitySnapshot = null,
  vanityAfter: VanitySnapshot = null,
): Attribution {
  const seen = new Map(before.map((invite) => [invite.code, invite]))
  const candidates: string[] = []

  for (const invite of after) {
    const previous = seen.get(invite.code)

    // An invite we had not seen before, already used. Created and taken up in the
    // gap between two reads.
    if (!previous) {
      if (invite.uses > 0) candidates.push(invite.code)
      continue
    }

    if (invite.uses > previous.uses) candidates.push(invite.code)
  }

  /*
   * An invite that has vanished spent its last use: Discord deletes one the
   * moment it hits its limit. A revoked invite disappears the same way, but the
   * bot listens for inviteDelete and drops those from the cache as they happen,
   * so by the time we get here a gap almost always means exhaustion.
   */
  const present = new Set(after.map((invite) => invite.code))
  for (const invite of before) {
    if (!present.has(invite.code)) candidates.push(invite.code)
  }

  if (vanityBefore && vanityAfter && vanityAfter.uses > vanityBefore.uses) {
    candidates.push(vanityAfter.code)
  }

  if (candidates.length === 0) {
    // Server Discovery, a Student Hub, or a bot being added. No invite involved.
    return { confidence: 'unknown' }
  }

  if (candidates.length > 1) {
    return { confidence: 'ambiguous', candidates: candidates.sort() }
  }

  const code = candidates[0]!

  if (vanityAfter && code === vanityAfter.code) {
    return { confidence: 'vanity', code }
  }

  const invite = after.find((entry) => entry.code === code) ?? seen.get(code)
  return { confidence: 'certain', code, inviterId: invite?.inviterId ?? null }
}

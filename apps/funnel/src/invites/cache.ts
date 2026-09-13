import type { InviteSnapshot, VanitySnapshot } from './attribute'

/**
 * What each guild's invites looked like a moment ago.
 *
 * Held in memory because it is read on every join and the answer is needed
 * before the next join lands. It is mirrored into funnel_invites as it changes,
 * which is what lets a restart tell how many joins it missed rather than
 * silently starting again from zero.
 *
 * Kept current by inviteCreate and inviteDelete as well as by joins. That
 * matters more than it looks: it is the reason a code missing from a fetch can
 * be read as "spent its last use" rather than "a moderator revoked it".
 */
export class InviteCache {
  private readonly invites = new Map<string, Map<string, InviteSnapshot>>()
  private readonly vanity = new Map<string, VanitySnapshot>()

  snapshot(guildId: string): InviteSnapshot[] {
    return [...(this.invites.get(guildId)?.values() ?? [])]
  }

  vanitySnapshot(guildId: string): VanitySnapshot {
    return this.vanity.get(guildId) ?? null
  }

  replace(guildId: string, snapshots: readonly InviteSnapshot[], vanity: VanitySnapshot): void {
    this.invites.set(guildId, new Map(snapshots.map((entry) => [entry.code, entry])))
    this.vanity.set(guildId, vanity)
  }

  add(guildId: string, snapshot: InviteSnapshot): void {
    let guild = this.invites.get(guildId)
    if (!guild) {
      guild = new Map()
      this.invites.set(guildId, guild)
    }
    guild.set(snapshot.code, snapshot)
  }

  remove(guildId: string, code: string): void {
    this.invites.get(guildId)?.delete(code)
  }

  forget(guildId: string): void {
    this.invites.delete(guildId)
    this.vanity.delete(guildId)
  }
}

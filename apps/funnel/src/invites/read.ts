import type { Guild } from 'discord.js'
import type { InviteSnapshot, VanitySnapshot } from './attribute'

/**
 * Read a guild's current invites.
 *
 * Returns null rather than throwing when the bot cannot see them, which in
 * practice means it was added without Manage Server. That is a configuration
 * problem for the server owner to fix, not an error worth crashing over, and it
 * has to be distinguishable from "this guild genuinely has no invites" — the
 * difference between the two is an empty array and a null.
 */
export async function readInvites(guild: Guild): Promise<InviteSnapshot[] | null> {
  try {
    const invites = await guild.invites.fetch()
    return invites.map((invite) => ({
      code: invite.code,
      uses: invite.uses ?? 0,
      inviterId: invite.inviter?.id ?? null,
      maxUses: invite.maxUses ?? 0,
    }))
  } catch {
    return null
  }
}

/**
 * Read the vanity URL, which Discord counts outside the invite list entirely.
 *
 * Only boosted guilds have one, and asking a guild without the feature throws,
 * so absence is the normal case rather than a failure.
 */
export async function readVanity(guild: Guild): Promise<VanitySnapshot> {
  if (!guild.features.includes('VANITY_URL')) return null

  try {
    const { code, uses } = await guild.fetchVanityData()
    return code ? { code, uses: uses ?? 0 } : null
  } catch {
    return null
  }
}

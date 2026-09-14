import { PermissionFlagsBits, type Guild, type GuildMember, type Role } from 'discord.js'
import { and, count, eq } from 'drizzle-orm'
import { boostConfig, boostPasses, boostRoles, type BoostConfig, type Database } from '@gict/db'

/** Discord's ceiling. A server near it cannot be given another personal role. */
export const MAX_GUILD_ROLES = 250

let bypass: Set<string> | null = null

/**
 * Ids treated as boosting whether or not they are.
 *
 * For testing perks without paying for them. Read from the environment rather
 * than written into the code or the database: a bypass belongs to one
 * deployment, and one that outlives its purpose should be deleted from a config
 * file rather than found in a migration a year later.
 *
 * Read lazily, because loadRootEnv has not run when this module is imported.
 */
function bypassIds(): Set<string> {
  bypass ??= new Set(
    (process.env.BOOST_TEST_BOOSTERS ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  )
  return bypass
}

/** Anybody on the bypass list, so the whole bot has one answer to this. */
export function isBooster(member: GuildMember): boolean {
  return member.premiumSince !== null || bypassIds().has(member.id)
}

/** Announced at startup so a forgotten bypass cannot sit there quietly. */
export function describeBypass(): string | null {
  const ids = [...bypassIds()]
  return ids.length === 0 ? null : ids.join(', ')
}

export async function configFor(database: Database, guildId: string): Promise<BoostConfig | null> {
  const [row] = await database
    .select()
    .from(boostConfig)
    .where(eq(boostConfig.guildId, guildId))
    .limit(1)
  return row ?? null
}

export async function personalRole(
  database: Database,
  guildId: string,
  userId: string,
): Promise<{ roleId: string; colour: number } | null> {
  const [row] = await database
    .select({ roleId: boostRoles.roleId, colour: boostRoles.colour })
    .from(boostRoles)
    .where(and(eq(boostRoles.guildId, guildId), eq(boostRoles.userId, userId)))
    .limit(1)
  return row ?? null
}

/**
 * Where a personal role goes in the list.
 *
 * Discord shows the colour of the highest role somebody holds that has one, so
 * a role created at the bottom of the list is invisible under every other
 * coloured role they have — it exists, it just does nothing. Just under the
 * configured anchor if there is one, otherwise just under the bot's own top
 * role, which is the highest it is allowed to reach.
 */
export function positionFor(guild: Guild, config: BoostConfig | null): number {
  const anchor = config?.anchorRoleId ? guild.roles.cache.get(config.anchorRoleId) : null
  const ceiling = guild.members.me?.roles.highest.position ?? 1
  const wanted = anchor ? anchor.position : ceiling
  return Math.max(1, Math.min(wanted - 1, ceiling - 1))
}

export type PerkFailure = 'no-permission' | 'role-limit' | 'discord-refused'

/**
 * Make or update somebody's personal role, and give it to them.
 *
 * Idempotent: called on every boost, every rename and every colour change, and
 * has to do the right thing whether the role exists, was deleted by hand, or
 * never existed.
 */
export async function applyPersonalRole(
  database: Database,
  member: GuildMember,
  colour: number,
): Promise<{ ok: true; role: Role } | { ok: false; reason: PerkFailure }> {
  const { guild } = member
  const me = guild.members.me

  if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return { ok: false, reason: 'no-permission' }
  }

  const config = await configFor(database, guild.id)
  const existing = await personalRole(database, guild.id, member.id)
  const name = roleName(member)

  let role = existing ? (guild.roles.cache.get(existing.roleId) ?? null) : null

  // Deleted by hand, or lost when the bot was away. Either way, make it again.
  if (!role) {
    if (guild.roles.cache.size >= MAX_GUILD_ROLES) {
      return { ok: false, reason: 'role-limit' }
    }

    try {
      role = await guild.roles.create({
        name,
        colors: { primaryColor: colour },
        // Not hoisted: one sidebar group per booster would take the member list
        // apart.
        hoist: false,
        mentionable: false,
        permissions: [],
        reason: `Booster perk for ${member.user.tag}`,
      })
      await role.setPosition(positionFor(guild, config)).catch(() => {
        // A role that could not be moved still works, it is just lower than
        // intended. Not worth failing the whole thing.
      })
    } catch {
      return { ok: false, reason: 'discord-refused' }
    }
  } else if (role.name !== name || role.color !== colour) {
    try {
      role = await role.edit({ name, colors: { primaryColor: colour } })
    } catch {
      return { ok: false, reason: 'discord-refused' }
    }
  }

  /*
   * Checked every time, not just when the role is made.
   *
   * A bot cannot place a role above its own, so one created while the bot sat
   * low in the list lands at the bottom, invisible under everything. Moving the
   * bot up afterwards is the obvious fix and it did nothing, because position
   * was only ever set at creation. Now the role catches up.
   */
  const wanted = positionFor(guild, config)
  if (role.position !== wanted && role.editable) {
    await role.setPosition(wanted).catch(() => {})
  }

  if (!member.roles.cache.has(role.id)) {
    await member.roles.add(role, 'Booster perk').catch(() => {})
  }

  await database
    .insert(boostRoles)
    .values({ guildId: guild.id, userId: member.id, roleId: role.id, colour })
    .onConflictDoUpdate({
      target: [boostRoles.guildId, boostRoles.userId],
      set: { roleId: role.id, colour, updatedAt: new Date() },
    })

  return { ok: true, role }
}

/**
 * The role's name follows their Discord username.
 *
 * Their display name would drift with per-server nicknames and read as somebody
 * else's role. Trimmed to Discord's 100 character ceiling, though a username
 * cannot reach it.
 */
export function roleName(member: GuildMember): string {
  return member.user.username.slice(0, 100) || member.id
}

/**
 * Take the perks away when a boost lapses.
 *
 * The role goes rather than being left behind: a server running this for a year
 * would otherwise fill with roles belonging to people who stopped paying. The
 * colour is kept on the row, so somebody who boosts again gets what they had.
 */
export async function revokePerks(
  database: Database,
  guild: Guild,
  userId: string,
): Promise<{ passesRevoked: number }> {
  const existing = await personalRole(database, guild.id, userId)

  if (existing) {
    await guild.roles.cache
      .get(existing.roleId)
      ?.delete('Boost lapsed')
      .catch(() => {})
    await database
      .delete(boostRoles)
      .where(and(eq(boostRoles.guildId, guild.id), eq(boostRoles.userId, userId)))
  }

  /*
   * Passes go too: they were the booster's to give, so they stop when the boost
   * does. The role is not simply pulled, though — somebody else may have passed
   * the same person, and syncPassRole is what knows the difference.
   */
  const given = await database
    .select({ recipientId: boostPasses.recipientId })
    .from(boostPasses)
    .where(and(eq(boostPasses.guildId, guild.id), eq(boostPasses.granterId, userId)))

  if (given.length > 0) {
    await database
      .delete(boostPasses)
      .where(and(eq(boostPasses.guildId, guild.id), eq(boostPasses.granterId, userId)))

    for (const pass of given) {
      await syncPassRole(database, guild, pass.recipientId)
    }
  }

  return { passesRevoked: given.length }
}

export async function passesGiven(
  database: Database,
  guildId: string,
  granterId: string,
): Promise<{ recipientId: string; createdAt: Date }[]> {
  return database
    .select({ recipientId: boostPasses.recipientId, createdAt: boostPasses.createdAt })
    .from(boostPasses)
    .where(and(eq(boostPasses.guildId, guildId), eq(boostPasses.granterId, granterId)))
    .orderBy(boostPasses.createdAt)
}

/** Everybody who has given this person a pass. */
export async function passesReceived(
  database: Database,
  guildId: string,
  recipientId: string,
): Promise<{ granterId: string; createdAt: Date }[]> {
  return database
    .select({ granterId: boostPasses.granterId, createdAt: boostPasses.createdAt })
    .from(boostPasses)
    .where(and(eq(boostPasses.guildId, guildId), eq(boostPasses.recipientId, recipientId)))
    .orderBy(boostPasses.createdAt)
}

/**
 * Take the pass role off somebody, but only if nothing is holding it up.
 *
 * Several boosters can pass the same person, so a revoked pass is not the same
 * as a lost role. Removing it without checking would let one booster strip a
 * role two others also granted.
 */
export async function syncPassRole(
  database: Database,
  guild: Guild,
  recipientId: string,
): Promise<void> {
  const config = await configFor(database, guild.id)
  if (!config?.passRoleId) return

  const remaining = await passesReceived(database, guild.id, recipientId)
  const member = await guild.members.fetch(recipientId).catch(() => null)
  if (!member) return

  const has = member.roles.cache.has(config.passRoleId)

  if (remaining.length > 0 && !has) {
    await member.roles.add(config.passRoleId, 'Holds a booster pass').catch(() => {})
  } else if (remaining.length === 0 && has) {
    await member.roles.remove(config.passRoleId, 'No booster passes left').catch(() => {})
  }
}

export async function countBoosterRoles(database: Database, guildId: string): Promise<number> {
  const [row] = await database
    .select({ total: count() })
    .from(boostRoles)
    .where(eq(boostRoles.guildId, guildId))
  return row?.total ?? 0
}

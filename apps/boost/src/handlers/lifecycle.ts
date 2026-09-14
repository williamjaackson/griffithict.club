import type { Guild, GuildMember, PartialGuildMember, PartialUser, User } from 'discord.js'
import { and, eq } from 'drizzle-orm'
import { boostPasses, boostRoles, type Database } from '@gict/db'
import { UNSET } from '../colour'
import {
  applyPersonalRole,
  configFor,
  isBooster,
  personalRole,
  revokePerks,
  roleName,
} from '../perks'

/**
 * Boosting started, stopped, or neither.
 *
 * premiumSince is the only thing Discord gives you: a timestamp when they are
 * boosting and null when they are not. There is no boost event, so the change
 * has to be read off two snapshots of the member.
 */
export async function onMemberUpdate(
  before: GuildMember | PartialGuildMember,
  after: GuildMember,
  database: Database,
): Promise<void> {
  // The bypass makes somebody a booster from the bot's point of view, so a
  // member update for them must not read as a lapse.
  const was = before.premiumSince !== null || isBooster(after)
  const is = isBooster(after)

  if (!was && is) {
    /*
     * Their old colour if they have boosted before, so somebody who lapses and
     * comes back gets what they had rather than starting again. Uncoloured
     * otherwise: until they pick something, the role should not override the
     * colour they already had from their other roles.
     */
    const previous = await personalRole(database, after.guild.id, after.id)
    const result = await applyPersonalRole(database, after, previous?.colour ?? UNSET)

    if (!result.ok) {
      console.warn(
        `[${after.guild.name}] could not make a role for ${after.user.tag}: ${result.reason}`,
      )
    }
    return
  }

  if (was && !is) {
    const { passesRevoked } = await revokePerks(database, after.guild, after.id)
    console.log(
      `[${after.guild.name}] ${after.user.tag} stopped boosting; role removed, ${passesRevoked} pass(es) revoked`,
    )
    return
  }

  // Still boosting. Their per-server nickname may have changed, which the role
  // deliberately does not follow, but their username is handled in onUserUpdate.
}

/**
 * Somebody left.
 *
 * A member who leaves while boosting never fires guildMemberUpdate, so without
 * this their personal role sits there for ever and — worse — everybody they
 * gave a pass to keeps it. Leaving is a boost ending as far as this server is
 * concerned.
 */
export async function onMemberRemove(
  member: GuildMember | PartialGuildMember,
  database: Database,
): Promise<void> {
  const existing = await personalRole(database, member.guild.id, member.id)
  const given = await database
    .select({ recipientId: boostPasses.recipientId })
    .from(boostPasses)
    .where(and(eq(boostPasses.guildId, member.guild.id), eq(boostPasses.granterId, member.id)))

  if (!existing && given.length === 0) return

  const { passesRevoked } = await revokePerks(database, member.guild, member.id)
  console.log(
    `[${member.guild.name}] ${member.user?.tag ?? member.id} left; role removed, ${passesRevoked} pass(es) revoked`,
  )
}

/**
 * Somebody came back.
 *
 * A pass holder loses the role by leaving, but the pass is still spent from the
 * granter's allowance. Giving the role back on return is the only reading that
 * matches what the granter was told: they keep it until you take it back.
 */
export async function onMemberAdd(member: GuildMember, database: Database): Promise<void> {
  const config = await configFor(database, member.guild.id)
  if (!config?.passRoleId) return

  const [pass] = await database
    .select({ granterId: boostPasses.granterId })
    .from(boostPasses)
    .where(and(eq(boostPasses.guildId, member.guild.id), eq(boostPasses.recipientId, member.id)))
    .limit(1)

  if (!pass) return

  await member.roles.add(config.passRoleId, 'Returning booster pass holder').catch(() => {})
}

/**
 * The username changed, so every role named after it has to change too.
 *
 * userUpdate is global: it fires once for the user, not once per guild, so
 * every guild where they hold a personal role needs updating from one event.
 */
export async function onUserUpdate(
  before: User | PartialUser,
  after: User,
  database: Database,
): Promise<void> {
  if (before.username === after.username) return

  const rows = await database
    .select({ guildId: boostRoles.guildId, roleId: boostRoles.roleId })
    .from(boostRoles)
    .where(eq(boostRoles.userId, after.id))

  for (const row of rows) {
    const guild = after.client.guilds.cache.get(row.guildId)
    const role = guild?.roles.cache.get(row.roleId)
    if (!guild || !role) continue

    const member = await guild.members.fetch(after.id).catch(() => null)
    if (!member) continue

    const name = roleName(member)
    if (role.name === name) continue

    await role.edit({ name, reason: 'Username changed' }).catch(() => {})
  }
}

/**
 * Catch up on what happened while the bot was away.
 *
 * Boosts start and stop whether or not anything is listening, so on startup
 * every guild is reconciled: boosters missing a role get one, and rows for
 * people who have stopped are cleaned up. Without this a restart at the wrong
 * moment leaves somebody paying for a perk they never received.
 */
export async function reconcile(database: Database, guild: Guild): Promise<void> {
  const members = await guild.members.fetch().catch(() => null)
  if (!members) return

  const boosting = members.filter((member) => isBooster(member))
  const rows = await database
    .select({ userId: boostRoles.userId })
    .from(boostRoles)
    .where(eq(boostRoles.guildId, guild.id))

  const onFile = new Set(rows.map((row) => row.userId))

  /*
   * Every booster, not only the ones missing a row. Reapplying is cheap and it
   * is what repairs a role that was created while the bot sat too low in the
   * list to place it usefully, or renamed, or recoloured by hand.
   */
  for (const member of boosting.values()) {
    const existing = await personalRole(database, guild.id, member.id)
    const result = await applyPersonalRole(database, member, existing?.colour ?? UNSET)
    if (!result.ok) {
      console.warn(`[${guild.name}] could not set up ${member.user.tag}: ${result.reason}`)
    }
  }

  for (const userId of onFile) {
    if (boosting.has(userId)) continue
    await revokePerks(database, guild, userId)
  }

  const revoked = await reconcilePasses(database, guild, new Set(boosting.keys()))

  console.log(
    `[${guild.name}] ${boosting.size} booster(s)` +
      (revoked > 0 ? `, ${revoked} stale pass(es) revoked` : ''),
  )
}

/**
 * Bring the pass role back in line with who should have it.
 *
 * Three things drift while nothing is listening: a granter stops boosting, a
 * holder has the role taken off by hand, and a holder leaves. The first frees
 * the pass, the second is repaired, and the third is left alone because they
 * get it back if they return.
 */
async function reconcilePasses(
  database: Database,
  guild: Guild,
  boosting: ReadonlySet<string>,
): Promise<number> {
  const config = await configFor(database, guild.id)
  if (!config?.passRoleId) return 0

  const passes = await database
    .select({ granterId: boostPasses.granterId, recipientId: boostPasses.recipientId })
    .from(boostPasses)
    .where(eq(boostPasses.guildId, guild.id))

  let revoked = 0

  for (const pass of passes) {
    const holder = guild.members.cache.get(pass.recipientId) ?? null

    if (!boosting.has(pass.granterId)) {
      await holder?.roles
        .remove(config.passRoleId, 'Granting booster no longer boosts')
        .catch(() => {})
      await database
        .delete(boostPasses)
        .where(
          and(eq(boostPasses.guildId, guild.id), eq(boostPasses.recipientId, pass.recipientId)),
        )
      revoked += 1
      continue
    }

    // Still valid. If the role went missing while nothing was watching, restore
    // it; if they are not here, leave the row so a return gives it back.
    if (holder && !holder.roles.cache.has(config.passRoleId)) {
      await holder.roles.add(config.passRoleId, 'Restoring a booster pass').catch(() => {})
    }
  }

  return revoked
}

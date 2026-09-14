import { index, integer, pgTable, timestamp, unique, varchar } from 'drizzle-orm/pg-core'

/**
 * Boost — booster perks, in apps/boost.
 *
 * Guild-scoped like the other bots'. One instance serves any server that adds
 * it, so every row carries the guild it belongs to.
 */

export const boostConfig = pgTable('boost_config', {
  guildId: varchar('guild_id', { length: 20 }).primaryKey(),

  /**
   * The role a booster hands out with a pass.
   *
   * Configured rather than created, because what a pass is worth is entirely
   * up to the server: it might be a colour, a private channel, or nothing but
   * a badge.
   */
  passRoleId: varchar('pass_role_id', { length: 20 }),

  /** How many people one booster may pass the role to. */
  passesPerBooster: integer('passes_per_booster').notNull().default(1),

  /**
   * Personal roles are created just under this one.
   *
   * Discord shows the colour of the highest coloured role somebody holds, so a
   * personal role created at the bottom of the list is invisible under every
   * other coloured role they have. An anchor lets a server say where they go.
   */
  anchorRoleId: varchar('anchor_role_id', { length: 20 }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * A booster's personal role.
 *
 * One per booster per guild. Named after them and recoloured on request;
 * deleted when the boost lapses, because a server that has run this for a year
 * would otherwise be full of roles belonging to people who stopped paying.
 */
export const boostRoles = pgTable(
  'boost_roles',
  {
    guildId: varchar('guild_id', { length: 20 }).notNull(),
    userId: varchar('user_id', { length: 20 }).notNull(),
    roleId: varchar('role_id', { length: 20 }).notNull(),

    /** Stored so the role can be recreated with the same colour after a lapse. */
    colour: integer('colour').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('boost_roles_guild_user').on(table.guildId, table.userId),
    index('boost_roles_role').on(table.roleId),
  ],
)

/**
 * A pass a booster has given somebody.
 *
 * The row is the grant: counting them is how many passes a booster has used,
 * and deleting one is how a pass comes back.
 *
 * Several boosters may pass the same person, so the pair is what is unique
 * rather than the recipient. That makes holding the role a question of whether
 * any pass survives, not whether a particular one does: taking yours back must
 * not strip a role somebody else also gave them.
 */
export const boostPasses = pgTable(
  'boost_passes',
  {
    guildId: varchar('guild_id', { length: 20 }).notNull(),
    granterId: varchar('granter_id', { length: 20 }).notNull(),
    recipientId: varchar('recipient_id', { length: 20 }).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('boost_passes_guild_pair').on(table.guildId, table.granterId, table.recipientId),
    index('boost_passes_recipient').on(table.guildId, table.recipientId),
    index('boost_passes_granter').on(table.guildId, table.granterId),
  ],
)

export type BoostConfig = typeof boostConfig.$inferSelect
export type BoostRole = typeof boostRoles.$inferSelect
export type BoostPass = typeof boostPasses.$inferSelect

import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

/**
 * Funnel — the invite attribution bot in apps/funnel.
 *
 * Every table here is scoped by guild. One instance serves any server that adds
 * it, not just this club's, so a guild id on each row is what keeps two servers'
 * numbers from bleeding into each other. The `funnel_` prefix marks them off from
 * the website's tables, which share this database but nothing else.
 *
 * Snowflakes are stored as varchar, not bigint. They exceed 2^53 so JavaScript
 * cannot hold them as numbers, and every Discord API response gives them as
 * strings anyway.
 */

export const funnelGuilds = pgTable('funnel_guilds', {
  id: varchar('id', { length: 20 }).primaryKey(),

  /** Cached for display, so a leaderboard does not need an API call per row. */
  name: varchar('name', { length: 100 }).notNull(),

  /** Where join notices get posted. Null tracks silently, which is the default. */
  logChannelId: varchar('log_channel_id', { length: 20 }),

  addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),

  /**
   * Set when the bot is removed rather than deleting the guild's rows. Servers
   * remove bots by accident, and a re-add should resume the history rather than
   * start from nothing.
   */
  removedAt: timestamp('removed_at', { withTimezone: true }),
})

/**
 * Where members come from: "Website", "Campus Groups", "Handbook".
 *
 * Deliberately not the same thing as an invite code. Codes get revoked and
 * remade, so a single source outlives several of them, and counting by code
 * would split one channel's numbers across however many codes it has had.
 */
export const funnelSources = pgTable(
  'funnel_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guildId: varchar('guild_id', { length: 20 }).notNull(),
    name: varchar('name', { length: 60 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique('funnel_sources_guild_name').on(table.guildId, table.name)],
)

export const funnelInvites = pgTable(
  'funnel_invites',
  {
    /** Invite codes are unique across Discord, so the code is the key. */
    code: varchar('code', { length: 32 }).primaryKey(),

    guildId: varchar('guild_id', { length: 20 }).notNull(),

    /** Null for the vanity URL, and for invites Discord will not name a creator for. */
    inviterId: varchar('inviter_id', { length: 20 }),

    sourceId: uuid('source_id').references(() => funnelSources.id, { onDelete: 'set null' }),

    /**
     * The last count we saw.
     *
     * Persisted rather than held only in memory, so a restart can tell how many
     * joins it missed instead of quietly resetting to zero and under-reporting
     * every invite for the rest of its life.
     */
    uses: integer('uses').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('funnel_invites_guild').on(table.guildId)],
)

/**
 * How much the attribution on a join is worth.
 *
 * Discord never says which invite a member used, so every attribution is
 * inferred by watching use counts move. Most of the time that is exact. Some of
 * the time it genuinely is not, and recording that honestly is the difference
 * between a number you can spend money on and one you cannot.
 */
export const funnelConfidence = pgEnum('funnel_confidence', [
  /** One invite went up by one. */
  'certain',
  /** Several moved at once, usually simultaneous joins. `candidates` holds them. */
  'ambiguous',
  /** The guild's vanity URL, which Discord counts separately. */
  'vanity',
  /** Nothing moved: Server Discovery, a Student Hub, or a bot being added. */
  'unknown',
  /** Reconciled after downtime. The count is right, the specific member is not. */
  'offline',
])

export const funnelJoins = pgTable(
  'funnel_joins',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    guildId: varchar('guild_id', { length: 20 }).notNull(),
    memberId: varchar('member_id', { length: 20 }).notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull(),

    inviteCode: varchar('invite_code', { length: 32 }),
    inviterId: varchar('inviter_id', { length: 20 }),
    sourceId: uuid('source_id').references(() => funnelSources.id, { onDelete: 'set null' }),

    /**
     * The source's name as it read when they joined.
     *
     * Frozen on purpose. Renaming "Website" to "Homepage" next year should not
     * silently rewrite what last year's report said.
     */
    sourceName: varchar('source_name', { length: 60 }),

    confidence: funnelConfidence('confidence').notNull(),

    /** The codes it could have been, when more than one moved at once. */
    candidates: jsonb('candidates').$type<string[]>(),

    /**
     * How old the account was when it joined. The cheapest signal there is for
     * telling a recruiting win from a wave of throwaway accounts.
     */
    accountCreatedAt: timestamp('account_created_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('funnel_joins_guild_joined').on(table.guildId, table.joinedAt),
    index('funnel_joins_guild_inviter').on(table.guildId, table.inviterId),
    unique('funnel_joins_guild_member').on(table.guildId, table.memberId, table.joinedAt),
  ],
)

export type FunnelGuild = typeof funnelGuilds.$inferSelect
export type FunnelSource = typeof funnelSources.$inferSelect
export type FunnelInvite = typeof funnelInvites.$inferSelect
export type FunnelJoin = typeof funnelJoins.$inferSelect
export type NewFunnelJoin = typeof funnelJoins.$inferInsert

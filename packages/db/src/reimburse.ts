import {
  bigint,
  customType,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

/**
 * The reimbursements bot in apps/reimburse.
 *
 * Guild-scoped like Funnel's tables: one instance serves any server that adds
 * it. The `reimburse_` prefix marks them off from the website's tables and the
 * bot's, which share this database and nothing else.
 */

const bytea = customType<{ data: Buffer; default: false }>({
  dataType: () => 'bytea',
})

/**
 * Where a claim is in the club's money flow.
 *
 * The club does not hold its own funds, so `submitted` means the treasurer has
 * passed it up to the Guild, not that the member has filed it. `rejected` is
 * terminal and exists so a bad claim can be closed; without it one sits in
 * `pending` forever with nothing anybody can do about it.
 */
export const claimStatus = pgEnum('reimburse_status', ['pending', 'submitted', 'paid', 'rejected'])

export const reimburseConfig = pgTable('reimburse_config', {
  guildId: varchar('guild_id', { length: 20 }).primaryKey(),

  /** Where claims are posted for the treasurer. Private, by strong preference. */
  reviewChannelId: varchar('review_channel_id', { length: 20 }),

  /**
   * Who may move a claim along.
   *
   * A role rather than Manage Server: a treasurer is frequently not a server
   * admin, and making them one to approve expenses is the wrong trade.
   */
  treasurerRoleId: varchar('treasurer_role_id', { length: 20 }),

  /** ISO 4217. Only ever used for display; amounts are stored as minor units. */
  currency: varchar('currency', { length: 3 }).notNull().default('AUD'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const reimburseClaims = pgTable(
  'reimburse_claims',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guildId: varchar('guild_id', { length: 20 }).notNull(),

    /** Short, human-quotable, unique per guild. Nobody reads a UUID aloud. */
    reference: integer('reference').notNull(),

    claimantId: varchar('claimant_id', { length: 20 }).notNull(),

    /**
     * Minor units, always. Never a float.
     *
     * bigint because cents overflow nothing at club scale but the type costs
     * nothing, and because money in a float is the oldest bug in the field.
     */
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),

    description: text('description').notNull(),
    status: claimStatus('status').notNull().default('pending'),

    /** The message holding the buttons, so it can be edited as the state moves. */
    reviewMessageId: varchar('review_message_id', { length: 20 }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('reimburse_claims_guild_status').on(table.guildId, table.status),
    index('reimburse_claims_claimant').on(table.guildId, table.claimantId),
    // References are handed out as max+1 per guild, which two claims submitted in
    // the same instant can both read. This is what turns that into a retry
    // rather than two claims quietly sharing a number.
    unique('reimburse_claims_guild_reference').on(table.guildId, table.reference),
  ],
)

/**
 * The receipt itself, bytes and all.
 *
 * Not a Discord CDN link. Those carry signed expiry parameters and 404 once it
 * passes, so a stored URL gives you a receipt that dies before the semester
 * does. A claim has to survive an audit and a committee handover, so the file
 * is pulled down at submission and kept.
 */
export const reimburseReceipts = pgTable(
  'reimburse_receipts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    claimId: uuid('claim_id')
      .notNull()
      .references(() => reimburseClaims.id, { onDelete: 'cascade' }),

    filename: varchar('filename', { length: 260 }).notNull(),
    contentType: varchar('content_type', { length: 120 }),
    bytes: integer('bytes').notNull(),

    /** Lets a duplicate submission be spotted without comparing blobs. */
    sha256: varchar('sha256', { length: 64 }).notNull(),

    data: bytea('data').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('reimburse_receipts_claim').on(table.claimId)],
)

/**
 * Append-only history. Never updated, never deleted.
 *
 * The status column says where a claim is now; this says how it got there and
 * who decided. "Who approved this" is the question an audit asks, and a mutable
 * column cannot answer it.
 */
export const reimburseEvents = pgTable(
  'reimburse_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    claimId: uuid('claim_id')
      .notNull()
      .references(() => reimburseClaims.id, { onDelete: 'cascade' }),

    actorId: varchar('actor_id', { length: 20 }).notNull(),
    fromStatus: claimStatus('from_status'),
    toStatus: claimStatus('to_status').notNull(),
    note: text('note'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('reimburse_events_claim').on(table.claimId)],
)

export type ReimburseConfig = typeof reimburseConfig.$inferSelect
export type ReimburseClaim = typeof reimburseClaims.$inferSelect
export type NewReimburseClaim = typeof reimburseClaims.$inferInsert
export type ReimburseReceipt = typeof reimburseReceipts.$inferSelect
export type ReimburseEvent = typeof reimburseEvents.$inferSelect

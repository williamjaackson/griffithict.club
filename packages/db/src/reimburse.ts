import {
  bigint,
  customType,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
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
 * Where a claim is.
 *
 * `submitted` means the treasurer has sent it on for payment, wherever that is
 * for a given server: a student guild, a finance team, someone's accountant.
 * `rejected` exists so a claim that is not going anywhere can be closed rather
 * than sitting in `pending` forever.
 *
 * None of these is a dead end. A treasurer can set any state from any other,
 * because the common mistake is pressing the wrong button and the expensive
 * failure is having no way back.
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

    /*
     * Where the money was to go, as given at the time.
     *
     * Copied onto the claim rather than joined from the payee record, for the
     * same reason a source name is frozen onto a join: somebody updating their
     * bank details next year must not silently rewrite which account last
     * year's claim was paid into.
     */
    payeeName: varchar('payee_name', { length: 120 }),
    payeeBankCode: varchar('payee_bank_code', { length: 20 }),
    payeeAccountNumber: varchar('payee_account_number', { length: 34 }),

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

/**
 * Where to send somebody's money, remembered between claims.
 *
 * `bankCode` rather than `bsb`: the label is Australian, the concept is not.
 * Sort codes, routing numbers and IBANs all sit in the same place, and naming
 * the column after one country would need a migration to serve another.
 */
export const reimbursePayees = pgTable(
  'reimburse_payees',
  {
    guildId: varchar('guild_id', { length: 20 }).notNull(),
    userId: varchar('user_id', { length: 20 }).notNull(),

    accountName: varchar('account_name', { length: 120 }).notNull(),
    bankCode: varchar('bank_code', { length: 20 }).notNull(),
    accountNumber: varchar('account_number', { length: 34 }).notNull(),

    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.guildId, table.userId] })],
)

export type ReimbursePayee = typeof reimbursePayees.$inferSelect
export type ReimburseConfig = typeof reimburseConfig.$inferSelect
export type ReimburseClaim = typeof reimburseClaims.$inferSelect
export type NewReimburseClaim = typeof reimburseClaims.$inferInsert
export type ReimburseReceipt = typeof reimburseReceipts.$inferSelect
export type ReimburseEvent = typeof reimburseEvents.$inferSelect

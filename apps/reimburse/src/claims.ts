import { and, count, desc, eq, inArray, sql, sum } from 'drizzle-orm'
import {
  reimburseClaims,
  reimburseConfig,
  reimburseEvents,
  reimbursePayees,
  reimburseReceipts,
  type Database,
  type ReimburseClaim,
  type ReimburseConfig,
  type ReimbursePayee,
} from '@gict/db'
import type { ClaimStatus } from './status'

export type { ClaimStatus } from './status'

export const ALL_STATUSES: ClaimStatus[] = ['pending', 'submitted', 'paid', 'rejected']

/**
 * Any state can become any other, except itself.
 *
 * There was a one-way graph here: pending to submitted to paid, with no way
 * back. That is how the money moves, but it is not how the buttons get pressed.
 * Marking something paid by mistake and having no way to undo it is worse than
 * any problem the restriction solved, and reimburse_events keeps the correction
 * visible anyway.
 */
export function canMoveTo(from: ClaimStatus, to: ClaimStatus): boolean {
  return from !== to && ALL_STATUSES.includes(to)
}

/** What we last knew about where to pay somebody. */
export async function payeeFor(
  database: Database,
  guildId: string,
  userId: string,
): Promise<ReimbursePayee | null> {
  const [row] = await database
    .select()
    .from(reimbursePayees)
    .where(and(eq(reimbursePayees.guildId, guildId), eq(reimbursePayees.userId, userId)))
    .limit(1)
  return row ?? null
}

export async function rememberPayee(
  database: Database,
  guildId: string,
  userId: string,
  details: { accountName: string; bankCode: string; accountNumber: string },
): Promise<void> {
  await database
    .insert(reimbursePayees)
    .values({ guildId, userId, ...details })
    .onConflictDoUpdate({
      target: [reimbursePayees.guildId, reimbursePayees.userId],
      set: { ...details, updatedAt: new Date() },
    })
}

export async function configFor(
  database: Database,
  guildId: string,
): Promise<ReimburseConfig | null> {
  const [row] = await database
    .select()
    .from(reimburseConfig)
    .where(eq(reimburseConfig.guildId, guildId))
    .limit(1)
  return row ?? null
}

export type NewReceipt = {
  filename: string
  contentType: string | null
  bytes: number
  sha256: string
  data: Buffer
}

/**
 * Write the claim, its receipts and its first event together.
 *
 * One transaction, because a claim with no receipt is useless and a receipt
 * with no claim is unreachable. The reference is max+1 for the guild, which two
 * simultaneous claims can both read; the unique constraint turns that into a
 * failed insert rather than two claims sharing a number, and the caller retries.
 */
export async function createClaim(
  database: Database,
  input: {
    guildId: string
    claimantId: string
    amountCents: number
    description: string
    receipts: NewReceipt[]
  },
): Promise<ReimburseClaim> {
  return database.transaction(async (tx) => {
    const [highest] = await tx
      .select({ next: sql<number>`coalesce(max(${reimburseClaims.reference}), 0) + 1` })
      .from(reimburseClaims)
      .where(eq(reimburseClaims.guildId, input.guildId))

    const [claim] = await tx
      .insert(reimburseClaims)
      .values({
        guildId: input.guildId,
        reference: highest?.next ?? 1,
        claimantId: input.claimantId,
        amountCents: input.amountCents,
        description: input.description,
      })
      .returning()

    await tx
      .insert(reimburseReceipts)
      .values(input.receipts.map((receipt) => ({ ...receipt, claimId: claim!.id })))

    await tx.insert(reimburseEvents).values({
      claimId: claim!.id,
      actorId: input.claimantId,
      fromStatus: null,
      toStatus: 'pending',
    })

    return claim!
  })
}

/**
 * Move a claim on, recording who did it.
 *
 * The status is only changed where it still reads as expected, so two treasurers
 * pressing the same button at once cannot both succeed. Returns null when the
 * claim had already moved, and the caller says so rather than pretending.
 */
export async function moveClaim(
  database: Database,
  claimId: string,
  from: ClaimStatus,
  to: ClaimStatus,
  actorId: string,
): Promise<ReimburseClaim | null> {
  return database.transaction(async (tx) => {
    const [claim] = await tx
      .update(reimburseClaims)
      .set({ status: to, updatedAt: new Date() })
      .where(and(eq(reimburseClaims.id, claimId), eq(reimburseClaims.status, from)))
      .returning()

    if (!claim) return null

    await tx.insert(reimburseEvents).values({
      claimId,
      actorId,
      fromStatus: from,
      toStatus: to,
    })

    return claim
  })
}

export async function claimById(
  database: Database,
  claimId: string,
): Promise<ReimburseClaim | null> {
  const [row] = await database
    .select()
    .from(reimburseClaims)
    .where(eq(reimburseClaims.id, claimId))
    .limit(1)
  return row ?? null
}

export async function receiptsFor(database: Database, claimId: string) {
  return database
    .select({
      filename: reimburseReceipts.filename,
      data: reimburseReceipts.data,
    })
    .from(reimburseReceipts)
    .where(eq(reimburseReceipts.claimId, claimId))
}

export type ClaimFilter = { claimantId?: string; status?: ClaimStatus }

function matching(guildId: string, filter: ClaimFilter) {
  const wheres = [eq(reimburseClaims.guildId, guildId)]
  if (filter.claimantId) wheres.push(eq(reimburseClaims.claimantId, filter.claimantId))
  if (filter.status) wheres.push(eq(reimburseClaims.status, filter.status))
  return and(...wheres)
}

/** One page, newest first. */
export async function claimsPage(
  database: Database,
  guildId: string,
  filter: ClaimFilter,
  offset: number,
  limit: number,
): Promise<ReimburseClaim[]> {
  return database
    .select()
    .from(reimburseClaims)
    .where(matching(guildId, filter))
    .orderBy(desc(reimburseClaims.reference))
    .limit(limit)
    .offset(offset)
}

export async function countClaims(
  database: Database,
  guildId: string,
  filter: ClaimFilter,
): Promise<number> {
  const [row] = await database
    .select({ total: count() })
    .from(reimburseClaims)
    .where(matching(guildId, filter))
  return row?.total ?? 0
}

/**
 * What is still owed, split by where it has got to.
 *
 * One total hid the thing a treasurer actually wants to know: money sitting in
 * `pending` is waiting on them, money in `submitted` is waiting on somebody
 * else. Those are different problems and a single figure conflates them.
 */
export async function outstandingByStatus(
  database: Database,
  guildId: string,
  claimantId?: string,
): Promise<{ status: ClaimStatus; cents: number; claims: number }[]> {
  const wheres = [
    eq(reimburseClaims.guildId, guildId),
    inArray(reimburseClaims.status, ['pending', 'submitted']),
  ]
  if (claimantId) wheres.push(eq(reimburseClaims.claimantId, claimantId))

  const rows = await database
    .select({
      status: reimburseClaims.status,
      cents: sum(reimburseClaims.amountCents),
      claims: count(),
    })
    .from(reimburseClaims)
    .where(and(...wheres))
    .groupBy(reimburseClaims.status)

  return rows.map((row) => ({
    status: row.status,
    cents: Number(row.cents ?? 0),
    claims: row.claims,
  }))
}

/**
 * Move exactly these claims, named by their reference numbers.
 *
 * References rather than ids because the selection has to survive a round trip
 * through a Discord custom id, which is capped at 100 characters. A UUID is 36
 * of them; "7,8,12" is six.
 *
 * Writes an event per claim, so a batch reads in the trail exactly as it would
 * had each been done by hand.
 */
export async function moveClaimsByReference(
  database: Database,
  guildId: string,
  references: readonly number[],
  to: ClaimStatus,
  actorId: string,
): Promise<number> {
  if (references.length === 0) return 0

  return database.transaction(async (tx) => {
    const current = await tx
      .select({ id: reimburseClaims.id, status: reimburseClaims.status })
      .from(reimburseClaims)
      .where(
        and(
          eq(reimburseClaims.guildId, guildId),
          inArray(reimburseClaims.reference, [...references]),
        ),
      )

    // Skip anything already there, so a repeated press is not recorded as a
    // change that did not happen.
    const moving = current.filter((claim) => claim.status !== to)
    if (moving.length === 0) return 0

    await tx
      .update(reimburseClaims)
      .set({ status: to, updatedAt: new Date() })
      .where(
        inArray(
          reimburseClaims.id,
          moving.map((claim) => claim.id),
        ),
      )

    await tx.insert(reimburseEvents).values(
      moving.map((claim) => ({
        claimId: claim.id,
        actorId,
        fromStatus: claim.status,
        toStatus: to,
      })),
    )

    return moving.length
  })
}

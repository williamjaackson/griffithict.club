import { and, desc, eq, sql } from 'drizzle-orm'
import {
  reimburseClaims,
  reimburseConfig,
  reimburseEvents,
  reimburseReceipts,
  type Database,
  type ReimburseClaim,
  type ReimburseConfig,
} from '@gict/db'

export type ClaimStatus = ReimburseClaim['status']

/** The states a claim can move to from where it is. */
const NEXT: Record<ClaimStatus, ClaimStatus[]> = {
  pending: ['submitted', 'rejected'],
  submitted: ['paid', 'rejected'],
  paid: [],
  rejected: [],
}

export function canMoveTo(from: ClaimStatus, to: ClaimStatus): boolean {
  return NEXT[from].includes(to)
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

export async function claimsFor(
  database: Database,
  guildId: string,
  filter?: { claimantId?: string; status?: ClaimStatus },
): Promise<ReimburseClaim[]> {
  const wheres = [eq(reimburseClaims.guildId, guildId)]
  if (filter?.claimantId) wheres.push(eq(reimburseClaims.claimantId, filter.claimantId))
  if (filter?.status) wheres.push(eq(reimburseClaims.status, filter.status))

  return database
    .select()
    .from(reimburseClaims)
    .where(and(...wheres))
    .orderBy(desc(reimburseClaims.createdAt))
    .limit(25)
}

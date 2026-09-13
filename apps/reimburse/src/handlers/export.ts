import { AttachmentBuilder, MessageFlags, type ButtonInteraction } from 'discord.js'
import { and, asc, eq, inArray } from 'drizzle-orm'
import {
  reimburseClaims,
  reimbursePayees,
  reimburseReceipts,
  type Database,
  type ReimburseClaim,
} from '@gict/db'
import { configFor, type ClaimFilter } from '../claims'
import { decimalAmount, isoDate, toCsv, type Column } from '../csv'
import { formatBankCode } from '../payee'
import { STATUS } from '../status'
import { createZip, safeName, type ZipEntry } from '../zip'

/**
 * Discord's ceiling for a bot upload, with room left for the archive's own
 * bookkeeping. Receipts are photographs, so a few dozen claims will reach this.
 */
const MAX_UPLOAD_BYTES = 9 * 1024 * 1024

/**
 * One export: the spreadsheet and the receipts together, in a zip.
 *
 * They were two buttons, and the difference between them was never real — one
 * was the same rows with bank details added. Worse, neither carried the
 * receipts, which is half of what actually gets submitted for payment. A
 * treasurer was downloading a CSV and then saving a dozen images out of Discord
 * by hand.
 *
 * Exports whatever the console is currently filtered to, so the filter does the
 * job the second button was pretending to.
 */
export async function onExport(
  interaction: ButtonInteraction,
  database: Database,
  filter: ClaimFilter & { references?: number[] },
  label: string,
): Promise<void> {
  const guildId = interaction.guildId!

  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const config = await configFor(database, guildId)
  const currency = config?.currency ?? 'AUD'

  const wheres = [eq(reimburseClaims.guildId, guildId)]
  // An explicit selection wins over the filter: somebody who picked six claims
  // out of eleven meant those six.
  if (filter.references) wheres.push(inArray(reimburseClaims.reference, filter.references))
  else if (filter.status) wheres.push(eq(reimburseClaims.status, filter.status))

  const rows = await database
    .select()
    .from(reimburseClaims)
    .where(and(...wheres))
    .orderBy(asc(reimburseClaims.reference))

  if (rows.length === 0) {
    await interaction.editReply('Nothing to export in this view.')
    return
  }

  const names = await displayNames(interaction, rows)
  const payees = await payeeLookup(database, guildId)

  const entries: ZipEntry[] = [
    {
      name: 'claims.csv',
      data: Buffer.from(toCsv(rows, columns(names, payees, currency)), 'utf8'),
      modified: new Date(),
    },
  ]

  const { included, skipped } = await receiptEntries(database, rows, entries[0]!.data.byteLength)
  entries.push(...included)

  const stamp = isoDate(new Date())
  const file = new AttachmentBuilder(Buffer.from(createZip(entries)), {
    name: `reimbursements-${label.toLowerCase().replace(/\s+/g, '-')}-${stamp}.zip`,
  })

  const lines = [
    `${rows.length} claim${rows.length === 1 ? '' : 's'}, ${included.length} receipt${included.length === 1 ? '' : 's'}.`,
  ]
  if (skipped > 0) {
    lines.push(
      `-# ${skipped} receipt${skipped === 1 ? '' : 's'} left out to stay under Discord's upload limit. Narrow the filter and export again to get them.`,
    )
  }
  lines.push('-# Contains account numbers. Do not post it anywhere.')

  await interaction.editReply({ content: lines.join('\n'), files: [file] })
}

/**
 * Receipts, named so they sort beside the claim they belong to.
 *
 * Stops before Discord refuses the upload rather than failing at the end, and
 * says how many were left behind. Silently truncating a set of financial
 * records would be worse than not exporting at all.
 */
async function receiptEntries(
  database: Database,
  claims: readonly ReimburseClaim[],
  usedBytes: number,
): Promise<{ included: ZipEntry[]; skipped: number }> {
  const byClaim = new Map(claims.map((claim) => [claim.id, claim]))

  const receipts = await database
    .select()
    .from(reimburseReceipts)
    .where(inArray(reimburseReceipts.claimId, [...byClaim.keys()]))

  const included: ZipEntry[] = []
  let total = usedBytes
  let skipped = 0

  for (const receipt of receipts) {
    const claim = byClaim.get(receipt.claimId)
    if (!claim) continue

    if (total + receipt.bytes > MAX_UPLOAD_BYTES) {
      skipped += 1
      continue
    }

    included.push({
      name: `receipts/${String(claim.reference).padStart(3, '0')}-${safeName(receipt.filename)}`,
      data: receipt.data,
      modified: receipt.createdAt,
    })
    total += receipt.bytes
  }

  return { included, skipped }
}

/**
 * Server nicknames where they exist, usernames otherwise.
 *
 * A spreadsheet full of snowflakes is unreadable to whoever has to reconcile
 * it, and the id keeps its own column for anyone matching rows up.
 */
async function displayNames(
  interaction: ButtonInteraction,
  claims: readonly ReimburseClaim[],
): Promise<Map<string, string>> {
  const ids = [...new Set(claims.map((claim) => claim.claimantId))]
  const names = new Map<string, string>()

  for (const id of ids) {
    const member = await interaction.guild?.members.fetch(id).catch(() => null)
    names.set(id, member?.displayName ?? member?.user.username ?? id)
  }

  return names
}

type Payee = { accountName: string; bankCode: string; accountNumber: string }

async function payeeLookup(database: Database, guildId: string): Promise<Map<string, Payee>> {
  const rows = await database
    .select()
    .from(reimbursePayees)
    .where(eq(reimbursePayees.guildId, guildId))

  return new Map(rows.map((row) => [row.userId, row]))
}

function columns(
  names: Map<string, string>,
  payees: Map<string, Payee>,
  currency: string,
): Column<ReimburseClaim>[] {
  return [
    { header: 'Reference', value: (claim) => claim.reference },
    { header: 'Date', value: (claim) => isoDate(claim.createdAt) },
    { header: 'Claimant', value: (claim) => names.get(claim.claimantId) ?? claim.claimantId },
    { header: 'Discord ID', value: (claim) => claim.claimantId },
    { header: 'Amount', value: (claim) => decimalAmount(claim.amountCents) },
    { header: 'Currency', value: () => currency },
    { header: 'Status', value: (claim) => STATUS[claim.status].label },
    { header: 'Description', value: (claim) => claim.description },
    {
      header: 'Account name',
      value: (claim) => payees.get(claim.claimantId)?.accountName ?? '',
    },
    {
      header: 'BSB',
      value: (claim) => {
        const code = payees.get(claim.claimantId)?.bankCode
        return code ? formatBankCode(code) : ''
      },
    },
    {
      header: 'Account number',
      value: (claim) => payees.get(claim.claimantId)?.accountNumber ?? '',
    },
    { header: 'Last updated', value: (claim) => isoDate(claim.updatedAt) },
  ]
}

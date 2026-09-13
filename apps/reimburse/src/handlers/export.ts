import { AttachmentBuilder, MessageFlags, type ButtonInteraction } from 'discord.js'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { reimburseClaims, reimbursePayees, type Database, type ReimburseClaim } from '@gict/db'
import { configFor } from '../claims'
import { decimalAmount, isoDate, toCsv, type Column } from '../csv'
import { formatBankCode } from '../payee'
import { STATUS } from '../status'

/**
 * Two exports, because they answer different questions.
 *
 * `claims` is the record: every claim, no bank details, safe to hand to an
 * auditor or the next committee. `payments` is a worklist: what is owed and
 * where to send it, which means it carries account numbers and should not
 * leave the treasurer's machine.
 */
export async function onExport(
  interaction: ButtonInteraction,
  database: Database,
  kind: 'claims' | 'payments',
): Promise<void> {
  const guildId = interaction.guildId!

  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const config = await configFor(database, guildId)
  const currency = config?.currency ?? 'AUD'

  const claims = await database
    .select()
    .from(reimburseClaims)
    .where(
      kind === 'payments'
        ? and(
            eq(reimburseClaims.guildId, guildId),
            inArray(reimburseClaims.status, ['pending', 'submitted']),
          )
        : eq(reimburseClaims.guildId, guildId),
    )
    .orderBy(asc(reimburseClaims.reference))

  if (claims.length === 0) {
    await interaction.editReply(
      kind === 'payments' ? 'Nothing is waiting to be paid.' : 'No claims yet.',
    )
    return
  }

  const names = await displayNames(interaction, claims)
  const csv =
    kind === 'payments'
      ? toCsv(claims, await paymentColumns(database, guildId, names, currency))
      : toCsv(claims, claimColumns(names, currency))

  const stamp = isoDate(new Date())
  const file = new AttachmentBuilder(Buffer.from(csv, 'utf8'), {
    name: `${kind}-${stamp}.csv`,
  })

  await interaction.editReply({
    content:
      kind === 'payments'
        ? `${claims.length} claim${claims.length === 1 ? '' : 's'} waiting to be paid.\n-# Contains account numbers. Do not post it anywhere.`
        : `${claims.length} claim${claims.length === 1 ? '' : 's'}.`,
    files: [file],
  })
}

/**
 * Server nicknames where they exist, usernames otherwise.
 *
 * A CSV full of snowflakes is unreadable by the person who has to reconcile it,
 * and the id stays in its own column for anyone who needs to match rows up.
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

function claimColumns(names: Map<string, string>, currency: string): Column<ReimburseClaim>[] {
  return [
    { header: 'Reference', value: (claim) => claim.reference },
    { header: 'Date', value: (claim) => isoDate(claim.createdAt) },
    { header: 'Claimant', value: (claim) => names.get(claim.claimantId) ?? claim.claimantId },
    { header: 'Discord ID', value: (claim) => claim.claimantId },
    { header: 'Amount', value: (claim) => decimalAmount(claim.amountCents) },
    { header: 'Currency', value: () => currency },
    { header: 'Status', value: (claim) => STATUS[claim.status].label },
    { header: 'Description', value: (claim) => claim.description },
    { header: 'Last updated', value: (claim) => isoDate(claim.updatedAt) },
  ]
}

async function paymentColumns(
  database: Database,
  guildId: string,
  names: Map<string, string>,
  currency: string,
): Promise<Column<ReimburseClaim>[]> {
  const rows = await database
    .select()
    .from(reimbursePayees)
    .where(eq(reimbursePayees.guildId, guildId))

  const payees = new Map(rows.map((row) => [row.userId, row]))

  return [
    { header: 'Reference', value: (claim) => claim.reference },
    { header: 'Claimant', value: (claim) => names.get(claim.claimantId) ?? claim.claimantId },
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
    { header: 'Amount', value: (claim) => decimalAmount(claim.amountCents) },
    { header: 'Currency', value: () => currency },
    { header: 'Status', value: (claim) => STATUS[claim.status].label },
    { header: 'Reference text', value: (claim) => `Claim ${claim.reference}` },
    { header: 'Description', value: (claim) => claim.description },
  ]
}

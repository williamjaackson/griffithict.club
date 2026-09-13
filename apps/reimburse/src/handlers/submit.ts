import { createHash } from 'node:crypto'
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageFlags,
  type Attachment,
  type ModalSubmitInteraction,
} from 'discord.js'
import { eq } from 'drizzle-orm'
import { reimburseClaims, type Database, type ReimburseClaim } from '@gict/db'
import {
  ALL_STATUSES,
  canMoveTo,
  configFor,
  createClaim,
  payeeFor,
  type NewReceipt,
} from '../claims'
import { formatAmount, parseAmount } from '../money'
import { formatBankCode } from '../payee'
import { FIELD_AMOUNT, FIELD_DESCRIPTION, FIELD_RECEIPT } from '../modal'
import { STATUS } from '../status'

/** Discord's own ceiling for a free upload. Anything larger never arrives. */
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024

export async function onClaimSubmit(
  interaction: ModalSubmitInteraction,
  database: Database,
): Promise<void> {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: 'Claims have to be made inside a server.',
      flags: MessageFlags.Ephemeral,
    })
    return
  }

  const amount = parseAmount(interaction.fields.getTextInputValue(FIELD_AMOUNT))
  if (!amount.ok) {
    await interaction.reply({ content: amount.error, flags: MessageFlags.Ephemeral })
    return
  }

  const description = interaction.fields.getTextInputValue(FIELD_DESCRIPTION).trim()
  if (description === '') {
    await interaction.reply({
      content: 'Say what the money went on.',
      flags: MessageFlags.Ephemeral,
    })
    return
  }

  /*
   * Read rather than asked for. The claim form has no room for bank details and
   * nobody wants to retype them every time, so /reimbursement sends a first-time
   * claimant through the bank modal before ever showing this one.
   */
  const payee = await payeeFor(database, interaction.guildId, interaction.user.id)
  if (!payee) {
    await interaction.reply({
      content: 'Add your bank details first with `/reimbursements bank`.',
      flags: MessageFlags.Ephemeral,
    })
    return
  }

  const config = await configFor(database, interaction.guildId)
  if (!config?.reviewChannelId) {
    await interaction.reply({
      content: 'Nobody has set this up yet. An admin needs to run `/reimbursements setup` first.',
      flags: MessageFlags.Ephemeral,
    })
    return
  }

  // Downloading takes longer than Discord's three second reply window.
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const uploads = [...interaction.fields.getUploadedFiles(FIELD_RECEIPT, true).values()]
  let receipts: NewReceipt[]
  try {
    receipts = await Promise.all(uploads.map(download))
  } catch (error) {
    console.error('Receipt download failed:', error)
    await interaction.editReply('Could not read the receipt from Discord. Try attaching it again.')
    return
  }

  const oversized = receipts.find((receipt) => receipt.bytes > MAX_RECEIPT_BYTES)
  if (oversized) {
    await interaction.editReply(
      `\`${oversized.filename}\` is too large to store. Keep receipts under 10MB.`,
    )
    return
  }

  const claim = await createClaim(database, {
    guildId: interaction.guildId,
    claimantId: interaction.user.id,
    amountCents: amount.cents,
    description,
    receipts,
  })

  await post(interaction, database, claim, config.reviewChannelId, config.currency, receipts)

  /*
   * Offered here rather than on the management screen. This is the moment
   * somebody has just been told where their money is going, so it is the moment
   * they will notice it is the wrong account. Optional, because it is already
   * correct almost every time.
   */
  await interaction.editReply({
    content: [
      `Claim **#${claim.reference}** for ${formatAmount(claim.amountCents, config.currency)} is in. You will hear back when the treasurer moves it along.`,
      `-# Paid to ${payee.accountName} · ${formatBankCode(payee.bankCode)}`,
    ].join('\n'),
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('rc:bank')
          .setEmoji('🏦')
          .setLabel('Change bank details')
          .setStyle(ButtonStyle.Secondary),
      ),
    ],
  })
}

/**
 * Pull the file down and keep the bytes.
 *
 * Discord's CDN links carry signed expiry parameters, so the URL in this
 * interaction stops working within the day. Storing it would leave a receipt
 * that 404s long before anyone needs to look at it.
 */
async function download(attachment: Attachment): Promise<NewReceipt> {
  const response = await fetch(attachment.url, { signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`Discord returned ${response.status} for ${attachment.name}`)

  const data = Buffer.from(await response.arrayBuffer())

  return {
    filename: attachment.name,
    contentType: attachment.contentType,
    bytes: data.byteLength,
    sha256: createHash('sha256').update(data).digest('hex'),
    data,
  }
}

/**
 * One button per state the claim is not currently in.
 *
 * Every state is reachable from every other, so a wrong press is one more press
 * to undo rather than something that needs a database.
 */
export function reviewButtons(claim: ReimburseClaim): ActionRowBuilder<ButtonBuilder>[] {
  const STYLE: Record<ReimburseClaim['status'], ButtonStyle> = {
    pending: ButtonStyle.Secondary,
    submitted: ButtonStyle.Primary,
    paid: ButtonStyle.Success,
    rejected: ButtonStyle.Danger,
  }

  const buttons = ALL_STATUSES.filter((status) => canMoveTo(claim.status, status)).map((status) =>
    new ButtonBuilder()
      .setCustomId(`claim:${status}:${claim.id}`)
      .setEmoji(STATUS[status].icon)
      .setLabel(STATUS[status].button)
      .setStyle(STYLE[status]),
  )

  /*
   * Always offered, in every state. Before paying it is the point of the thing,
   * and afterwards it is how somebody checks what was actually sent where.
   */
  buttons.push(
    new ButtonBuilder()
      .setCustomId(`claim:details:${claim.id}`)
      .setEmoji('🏦')
      .setLabel('Payment details')
      .setStyle(ButtonStyle.Secondary),
  )

  return [new ActionRowBuilder<ButtonBuilder>().addComponents(buttons)]
}

/**
 * The whole claim post: text, buttons, and mentions turned off.
 *
 * One function because it is written in four places — once on send and three
 * times on edit — and Discord re-evaluates mentions on every edit unless told
 * not to. Suppressing it at three of the four call sites is how a claimant ends
 * up pinged every time a treasurer touches their claim.
 */
export function claimMessage(claim: ReimburseClaim, currency: string) {
  return {
    content: claimSummary(claim, currency),
    components: reviewButtons(claim),
    allowedMentions: { parse: [] as const },
  }
}

export function claimSummary(claim: ReimburseClaim, currency: string): string {
  /*
   * No bank details here, not even masked ones. A partial number cannot be used
   * to pay anybody, so its only job was hinting that details exist, and the
   * Payment details button answers that properly and in private.
   */
  return [
    `## ${STATUS[claim.status].icon} Claim #${claim.reference} · ${formatAmount(claim.amountCents, currency)}`,
    `<@${claim.claimantId}> · **${STATUS[claim.status].label}**`,
    '',
    claim.description,
  ].join('\n')
}

async function post(
  interaction: ModalSubmitInteraction,
  database: Database,
  claim: ReimburseClaim,
  channelId: string,
  currency: string,
  receipts: NewReceipt[],
): Promise<void> {
  const channel = interaction.guild?.channels.cache.get(channelId)
  if (!channel || channel.type !== ChannelType.GuildText) return

  const message = await channel.send({
    ...claimMessage(claim, currency),
    // Re-uploaded from what was stored, not linked. The original link expires.
    files: receipts.map((receipt) => ({ attachment: receipt.data, name: receipt.filename })),
  })

  await database
    .update(reimburseClaims)
    .set({ reviewMessageId: message.id })
    .where(eq(reimburseClaims.id, claim.id))
}

import { ModalBuilder, TextInputStyle } from 'discord.js'
import type { ReimbursePayee } from '@gict/db'

export const MODAL_ID = 'reimbursement:new'
export const FIELD_AMOUNT = 'amount'
export const FIELD_DESCRIPTION = 'description'
export const FIELD_RECEIPT = 'receipt'
export const FIELD_ACCOUNT_NAME = 'accountName'
export const FIELD_BANK_CODE = 'bankCode'
export const FIELD_ACCOUNT_NUMBER = 'accountNumber'

/**
 * The claim form.
 *
 * A file upload inside a modal, which Discord only made possible in late 2025.
 * Before that a receipt had to come in as a slash command attachment option,
 * which meant picking the file before seeing the form.
 *
 * Bank details are always on the form, pre-filled from last time once there is
 * a last time. Asking only on the first claim would mean a separate command to
 * ever change them, and somebody whose account has changed would have no way to
 * say so at the moment they are thinking about it.
 *
 * Five fields, which is the modal's ceiling. Anything else this form ever needs
 * has to replace something.
 */
export function claimModal(payee: ReimbursePayee | null): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(MODAL_ID)
    .setTitle('Reimbursement claim')
    .addLabelComponents(
      (label) =>
        label
          .setLabel('Amount')
          .setTextInputComponent((input) =>
            input
              .setCustomId(FIELD_AMOUNT)
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('12.50')
              .setRequired(true)
              .setMaxLength(20),
          ),
      (label) =>
        label
          .setLabel('What was it for?')
          .setDescription('Enough that a treasurer reading it in six months still knows.')
          .setTextInputComponent((input) =>
            input
              .setCustomId(FIELD_DESCRIPTION)
              .setStyle(TextInputStyle.Paragraph)
              .setPlaceholder('Pizza for the September hackathon, 30 people')
              .setRequired(true)
              .setMaxLength(600),
          ),
      (label) =>
        label
          .setLabel('Receipt')
          .setDescription('A photo or PDF. Up to five files.')
          .setFileUploadComponent((upload) =>
            upload.setCustomId(FIELD_RECEIPT).setMinValues(1).setMaxValues(5).setRequired(true),
          ),
      (label) =>
        label.setLabel('Account name').setTextInputComponent((input) =>
          input
            .setCustomId(FIELD_ACCOUNT_NAME)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('The name on the account')
            .setRequired(true)
            .setMaxLength(120)
            .setValue(payee?.accountName ?? ''),
        ),
      (label) =>
        label
          .setLabel('BSB and account number')
          .setDescription('Where the money goes. Remembered for next time.')
          .setTextInputComponent((input) =>
            input
              .setCustomId(FIELD_BANK_CODE)
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('123-456 / 12345678')
              .setRequired(true)
              .setMaxLength(60)
              .setValue(combined(payee)),
          ),
    )
}

/**
 * BSB and account number in one field.
 *
 * Not because they belong together, but because the modal holds five components
 * and the receipt, amount and description have stronger claims on the other
 * four. They are split apart again on the way in.
 */
function combined(payee: ReimbursePayee | null): string {
  return payee ? `${payee.bankCode} / ${payee.accountNumber}` : ''
}

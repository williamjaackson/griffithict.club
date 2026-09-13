import { ChannelType, ModalBuilder, TextInputStyle } from 'discord.js'
import type { ReimbursePayee } from '@gict/db'

export const CLAIM_MODAL_ID = 'reimbursement:claim'
export const BANK_MODAL_ID = 'reimbursement:bank'
export const SETUP_MODAL_ID = 'reimbursement:setup'

export const FIELD_CHANNEL = 'channel'
export const FIELD_TREASURER = 'treasurer'
export const FIELD_CURRENCY = 'currency'

export const FIELD_AMOUNT = 'amount'
export const FIELD_DESCRIPTION = 'description'
export const FIELD_RECEIPT = 'receipt'
export const FIELD_ACCOUNT_NAME = 'accountName'
export const FIELD_BANK_CODE = 'bankCode'
export const FIELD_ACCOUNT_NUMBER = 'accountNumber'

/*
 * Two modals rather than one.
 *
 * A modal holds five components, and the claim needs three while the bank
 * details need three. An earlier version squeezed the BSB and account number
 * into a single field to fit, which made people type a separator and made the
 * parser guess what they meant by it.
 *
 * They are asked for separately because they are answered at different times:
 * bank details once, the claim every time. Discord will not let a modal submit
 * open another modal, so the first hands over through a button.
 */

/** What the money went on. Shown every time. */
export function claimModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(CLAIM_MODAL_ID)
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
    )
}

/** Where the money goes. Asked once, then pre-filled whenever it is changed. */
export function bankModal(payee: ReimbursePayee | null): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(BANK_MODAL_ID)
    .setTitle(payee ? 'Update your bank details' : 'Your bank details')
    .addLabelComponents(
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
        label.setLabel('BSB').setTextInputComponent((input) =>
          input
            .setCustomId(FIELD_BANK_CODE)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('123-456')
            .setRequired(true)
            .setMaxLength(20)
            .setValue(payee?.bankCode ?? ''),
        ),
      (label) =>
        label
          .setLabel('Account number')
          .setDescription('Remembered, so you only do this once.')
          .setTextInputComponent((input) =>
            input
              .setCustomId(FIELD_ACCOUNT_NUMBER)
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('12345678')
              .setRequired(true)
              .setMaxLength(34)
              .setValue(payee?.accountNumber ?? ''),
          ),
    )
}

/**
 * Where claims go and who can act on them.
 *
 * A modal rather than a command, now that they take channel and role pickers.
 * Setup is run once per server and then never again, which makes it the worst
 * possible thing to give a permanent slot in everybody's command list.
 */
export function setupModal(
  config: {
    reviewChannelId: string | null
    treasurerRoleId: string | null
    currency: string
  } | null,
): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(SETUP_MODAL_ID)
    .setTitle('Reimbursement setup')
    .addLabelComponents(
      (label) =>
        label
          .setLabel('Where claims are posted')
          .setDescription('Make it private. Claims carry names and amounts.')
          .setChannelSelectMenuComponent((select) =>
            select
              .setCustomId(FIELD_CHANNEL)
              .setChannelTypes(ChannelType.GuildText)
              .setRequired(true)
              .setDefaultChannels(config?.reviewChannelId ? [config.reviewChannelId] : []),
          ),
      (label) =>
        label
          .setLabel('Who can act on claims')
          .setDescription('A role, not an admin permission. Treasurers are rarely admins.')
          .setRoleSelectMenuComponent((select) =>
            select
              .setCustomId(FIELD_TREASURER)
              .setRequired(true)
              .setDefaultRoles(config?.treasurerRoleId ? [config.treasurerRoleId] : []),
          ),
      (label) =>
        label.setLabel('Currency').setTextInputComponent((input) =>
          input
            .setCustomId(FIELD_CURRENCY)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('AUD')
            .setRequired(true)
            .setMaxLength(3)
            .setValue(config?.currency ?? 'AUD'),
        ),
    )
}

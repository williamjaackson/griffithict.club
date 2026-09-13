import { ModalBuilder, TextInputStyle } from 'discord.js'

export const MODAL_ID = 'reimbursement:new'
export const FIELD_AMOUNT = 'amount'
export const FIELD_DESCRIPTION = 'description'
export const FIELD_RECEIPT = 'receipt'

/**
 * The claim form.
 *
 * A file upload inside a modal, which Discord only made possible in late 2025.
 * Before that a receipt had to come in as a slash command attachment option,
 * which meant picking the file before seeing the form.
 */
export function claimModal(): ModalBuilder {
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
    )
}

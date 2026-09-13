import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  type ModalSubmitInteraction,
} from 'discord.js'
import type { Database } from '@gict/db'
import { rememberPayee } from '../claims'
import { FIELD_ACCOUNT_NAME, FIELD_ACCOUNT_NUMBER, FIELD_BANK_CODE } from '../modal'
import { formatBankCode, maskAccount, parsePayee } from '../payee'

export const CONTINUE_BUTTON = 'reimbursement:continue'

export async function onBankSubmit(
  interaction: ModalSubmitInteraction,
  database: Database,
): Promise<void> {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: 'Bank details are kept per server, so this has to be done inside one.',
      flags: MessageFlags.Ephemeral,
    })
    return
  }

  const payee = parsePayee(
    interaction.fields.getTextInputValue(FIELD_ACCOUNT_NAME),
    interaction.fields.getTextInputValue(FIELD_BANK_CODE),
    interaction.fields.getTextInputValue(FIELD_ACCOUNT_NUMBER),
  )

  if (!payee.ok) {
    await interaction.reply({ content: payee.error, flags: MessageFlags.Ephemeral })
    return
  }

  await rememberPayee(database, interaction.guildId, interaction.user.id, payee.details)

  /*
   * A button rather than the claim form directly. Discord will not let a modal
   * submission open another modal, and this is the only way to get somebody from
   * the first form to the second without making them run the command again.
   */
  await interaction.reply({
    content: [
      `Saved: **${payee.details.accountName}** · ${formatBankCode(payee.details.bankCode)} · ${maskAccount(payee.details.accountNumber)}`,
      '-# Only asked once. Change it any time with `/reimbursements bank`.',
    ].join('\n'),
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(CONTINUE_BUTTON)
          .setLabel('Make your claim')
          .setStyle(ButtonStyle.Primary),
      ),
    ],
    flags: MessageFlags.Ephemeral,
  })
}

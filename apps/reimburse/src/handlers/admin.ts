import { MessageFlags, type ModalSubmitInteraction } from 'discord.js'
import { reimburseConfig, type Database } from '@gict/db'
import { FIELD_CHANNEL, FIELD_CURRENCY, FIELD_TREASURER } from '../modal'

export async function onSetupSubmit(
  interaction: ModalSubmitInteraction,
  database: Database,
): Promise<void> {
  const channel = interaction.fields.getSelectedChannels(FIELD_CHANNEL, true).first()
  const treasurer = interaction.fields.getSelectedRoles(FIELD_TREASURER, true).first()
  const currency = interaction.fields.getTextInputValue(FIELD_CURRENCY).trim().toUpperCase()

  if (!channel || !treasurer) {
    await interaction.reply({
      content: 'Pick both a channel and a role.',
      flags: MessageFlags.Ephemeral,
    })
    return
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    await interaction.reply({
      content: 'Currency should be a three letter code, like AUD.',
      flags: MessageFlags.Ephemeral,
    })
    return
  }

  await database
    .insert(reimburseConfig)
    .values({
      guildId: interaction.guildId!,
      reviewChannelId: channel.id,
      treasurerRoleId: treasurer.id,
      currency,
    })
    .onConflictDoUpdate({
      target: reimburseConfig.guildId,
      set: { reviewChannelId: channel.id, treasurerRoleId: treasurer.id, currency },
    })

  await interaction.reply({
    content: [
      `Claims go to <#${channel.id}>, <@&${treasurer.id}> can act on them, amounts in ${currency}.`,
      '-# Check that channel is private. Claims carry names and what people spent.',
    ].join('\n'),
    flags: MessageFlags.Ephemeral,
    allowedMentions: { parse: [] },
  })
}

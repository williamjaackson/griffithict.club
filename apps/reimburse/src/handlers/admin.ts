import { MessageFlags, type ButtonInteraction, type ModalSubmitInteraction } from 'discord.js'
import { reimburseConfig, type Database } from '@gict/db'
import { claimsFor, configFor } from '../claims'
import { FIELD_CHANNEL, FIELD_CURRENCY, FIELD_TREASURER } from '../modal'
import { formatAmount, totalCents } from '../money'
import { statusText } from '../status'

/** Every claim in the server, for whoever is chasing them. */
export async function showAllClaims(
  interaction: ButtonInteraction,
  database: Database,
): Promise<void> {
  const config = await configFor(database, interaction.guildId!)
  const currency = config?.currency ?? 'AUD'
  const claims = await claimsFor(database, interaction.guildId!)

  if (claims.length === 0) {
    await interaction.reply({ content: 'No claims yet.', flags: MessageFlags.Ephemeral })
    return
  }

  const outstanding = claims.filter(
    (claim) => claim.status !== 'paid' && claim.status !== 'rejected',
  )

  await interaction.reply({
    content: [
      '## All claims',
      ...claims.map(
        (claim) =>
          `${statusText(claim.status)} · \`#${claim.reference}\` ${formatAmount(claim.amountCents, currency)} · <@${claim.claimantId}>`,
      ),
      `-# ${formatAmount(totalCents(outstanding), currency)} outstanding across ${outstanding.length} claim${outstanding.length === 1 ? '' : 's'}`,
    ].join('\n'),
    flags: MessageFlags.Ephemeral,
    allowedMentions: { parse: [] },
  })
}

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

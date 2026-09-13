import { ChannelType, MessageFlags, ModalBuilder, type ModalSubmitInteraction } from 'discord.js'
import { eq } from 'drizzle-orm'
import { funnelGuilds, type Database } from '@gict/db'

export const SETUP_MODAL_ID = 'funnel:setup'
const FIELD_CHANNEL = 'logChannel'

/**
 * Where join notices are posted.
 *
 * A modal rather than command options: this is run once per server and then
 * never again, which is the worst possible reason to take a permanent slot in
 * everybody's command list.
 */
export function setupModal(currentChannelId: string | null): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(SETUP_MODAL_ID)
    .setTitle('Invite tracking setup')
    .addLabelComponents((label) =>
      label
        .setLabel('Where join notices are posted')
        .setDescription('Leave it empty to track silently. The reports still work.')
        .setChannelSelectMenuComponent((select) =>
          select
            .setCustomId(FIELD_CHANNEL)
            .setChannelTypes(ChannelType.GuildText)
            .setRequired(false)
            .setDefaultChannels(currentChannelId ? [currentChannelId] : []),
        ),
    )
}

export async function onSetupSubmit(
  interaction: ModalSubmitInteraction,
  database: Database,
): Promise<void> {
  const channel = interaction.fields.getSelectedChannels(FIELD_CHANNEL, false)?.first() ?? null

  await database
    .update(funnelGuilds)
    .set({ logChannelId: channel?.id ?? null })
    .where(eq(funnelGuilds.id, interaction.guildId!))

  await interaction.reply({
    content: channel
      ? `Join notices will go to <#${channel.id}>.`
      : 'Join notices are off. Arrivals are still recorded and the reports still work.',
    flags: MessageFlags.Ephemeral,
  })
}

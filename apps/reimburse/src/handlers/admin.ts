import { MessageFlags, type ChatInputCommandInteraction } from 'discord.js'
import { reimburseConfig, type Database } from '@gict/db'
import { claimsFor, configFor } from '../claims'
import { statusText, type ClaimStatus } from '../status'
import { formatAmount, totalCents } from '../money'

export async function onAdminCommand(
  interaction: ChatInputCommandInteraction,
  database: Database,
): Promise<void> {
  const sub = interaction.options.getSubcommand()
  if (sub === 'setup') return setup(interaction, database)
  if (sub === 'list') return list(interaction, database, false)
  if (sub === 'mine') return list(interaction, database, true)
}

async function setup(interaction: ChatInputCommandInteraction, database: Database): Promise<void> {
  const channel = interaction.options.getChannel('channel', true)
  const treasurer = interaction.options.getRole('treasurer', true)
  const currency = (interaction.options.getString('currency') ?? 'AUD').toUpperCase()

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
      `Claims will be posted in <#${channel.id}> and <@&${treasurer.id}> can move them along. Amounts in ${currency}.`,
      `-# Check that channel is private. Claims carry people's names and what they spent.`,
    ].join('\n'),
    flags: MessageFlags.Ephemeral,
    allowedMentions: { parse: [] },
  })
}

async function list(
  interaction: ChatInputCommandInteraction,
  database: Database,
  onlyMine: boolean,
): Promise<void> {
  const config = await configFor(database, interaction.guildId!)
  const currency = config?.currency ?? 'AUD'
  const status = interaction.options.getString('status') as ClaimStatus | null

  const claims = await claimsFor(database, interaction.guildId!, {
    claimantId: onlyMine ? interaction.user.id : undefined,
    status: status ?? undefined,
  })

  if (claims.length === 0) {
    await interaction.reply({ content: 'Nothing to show.', flags: MessageFlags.Ephemeral })
    return
  }

  const rows = claims
    .map(
      (claim) =>
        `${statusText(claim.status)} · \`#${String(claim.reference).padStart(3, '0')}\` ${formatAmount(claim.amountCents, currency)}${
          onlyMine ? '' : ` · <@${claim.claimantId}>`
        }`,
    )
    .join('\n')

  const outstanding = claims.filter(
    (claim) => claim.status !== 'paid' && claim.status !== 'rejected',
  )

  await interaction.reply({
    content: [
      `## ${onlyMine ? 'Your claims' : 'Claims'}`,
      rows,
      `-# ${formatAmount(totalCents(outstanding), currency)} still owed across ${outstanding.length} claim${outstanding.length === 1 ? '' : 's'}`,
    ].join('\n'),
    flags: MessageFlags.Ephemeral,
    allowedMentions: { parse: [] },
  })
}

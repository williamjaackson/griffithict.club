import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type GuildMember,
  type RepliableInteraction,
} from 'discord.js'
import type { Database } from '@gict/db'
import { claimsFor, configFor, payeeFor } from '../claims'
import { formatAmount, totalCents } from '../money'
import { formatBankCode } from '../payee'
import { statusText } from '../status'

export const BUTTON = {
  claim: 'rb:claim',
  bank: 'rb:bank',
  all: 'rb:all',
  exportClaims: 'rb:export:claims',
  exportPayments: 'rb:export:payments',
  setup: 'rb:setup',
} as const

/**
 * Whether someone is allowed to see the whole server's claims.
 *
 * The treasurer role counts as well as Manage Server, because the treasurer is
 * who these are for and is frequently not an admin.
 */
export async function isCommittee(
  interaction: RepliableInteraction,
  database: Database,
): Promise<boolean> {
  if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return true

  const config = await configFor(database, interaction.guildId!)
  if (!config?.treasurerRoleId) return false

  const member = interaction.member as GuildMember | null
  return member?.roles?.cache?.has(config.treasurerRoleId) ?? false
}

export async function showDashboard(
  interaction: ChatInputCommandInteraction,
  database: Database,
): Promise<void> {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: 'Reimbursements are per server, so this has to be used inside one.',
      flags: MessageFlags.Ephemeral,
    })
    return
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const config = await configFor(database, interaction.guildId)
  const currency = config?.currency ?? 'AUD'
  const [payee, mine, committee] = await Promise.all([
    payeeFor(database, interaction.guildId, interaction.user.id),
    claimsFor(database, interaction.guildId, { claimantId: interaction.user.id }),
    isCommittee(interaction, database),
  ])

  const lines = ['## Reimbursements']

  if (!config?.reviewChannelId) {
    lines.push(
      committee
        ? '⚠️ Not set up yet. Press **Setup** below before anybody claims.'
        : '⚠️ Not set up yet. Somebody on the committee needs to configure this first.',
    )
  }

  if (mine.length === 0) {
    lines.push('', '_No claims yet._')
  } else {
    const owed = mine.filter((claim) => claim.status !== 'paid' && claim.status !== 'rejected')
    lines.push(
      '',
      ...mine
        .slice(0, 10)
        .map(
          (claim) =>
            `${statusText(claim.status)} · \`#${claim.reference}\` ${formatAmount(claim.amountCents, currency)} — ${claim.description.split('\n')[0]?.slice(0, 60)}`,
        ),
    )
    if (owed.length > 0) {
      lines.push(`-# ${formatAmount(totalCents(owed), currency)} of yours is still outstanding`)
    }
  }

  lines.push(
    '',
    payee
      ? `-# Paid to ${payee.accountName} · ${formatBankCode(payee.bankCode)}`
      : '-# No bank details yet. You will be asked for them on your first claim.',
  )

  const rows = [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(BUTTON.claim)
        .setEmoji('🧾')
        .setLabel('New claim')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(BUTTON.bank)
        .setEmoji('🏦')
        .setLabel(payee ? 'Bank details' : 'Add bank details')
        .setStyle(ButtonStyle.Secondary),
    ),
  ]

  // Only rendered for the committee, so nobody is shown a button that will
  // refuse them.
  if (committee) {
    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(BUTTON.all)
          .setEmoji('📋')
          .setLabel('All claims')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(BUTTON.exportClaims)
          .setEmoji('⬇️')
          .setLabel('Export claims')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(BUTTON.exportPayments)
          .setEmoji('💸')
          .setLabel('Payment run')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(BUTTON.setup)
          .setEmoji('⚙️')
          .setLabel('Setup')
          .setStyle(ButtonStyle.Secondary),
      ),
    )
  }

  await interaction.editReply({ content: lines.join('\n'), components: rows })
}

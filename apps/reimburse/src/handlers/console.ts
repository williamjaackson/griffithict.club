import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  type GuildMember,
  type InteractionUpdateOptions,
  type RepliableInteraction,
} from 'discord.js'
import type { Database, ReimburseClaim } from '@gict/db'
import { claimsPage, configFor, countClaims, outstanding, type ClaimStatus } from '../claims'
import { formatAmount } from '../money'
import { ALL_STATUSES } from '../claims'
import { STATUS, statusText } from '../status'

/** Ten fits a Discord message without crowding out the controls beneath it. */
export const PAGE_SIZE = 10

export const VIEW = { all: 'all' } as const
export type View = ClaimStatus | 'all'

/*
 * Every control carries the view it belongs to, so the message needs no server
 * state and an old one still works after a restart.
 *
 *   rc:page:<view>:<offset>
 *   rc:view                  (the filter select)
 *   rc:bulk:<from>:<to>
 *   rc:bank | rc:export:claims | rc:export:payments | rc:setup
 */
export const PREFIX = 'rc:'

export function pageId(view: View, offset: number): string {
  return `${PREFIX}page:${view}:${offset}`
}

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

/**
 * The management view.
 *
 * A treasurer sees the whole server; anybody else sees their own claims and the
 * same controls minus the ones they cannot use. Rendering it the same way for
 * both means one screen to maintain rather than two that drift.
 */
export async function renderConsole(
  interaction: RepliableInteraction,
  database: Database,
  view: View,
  offset: number,
): Promise<InteractionUpdateOptions> {
  const guildId = interaction.guildId!
  const committee = await isCommittee(interaction, database)
  const config = await configFor(database, guildId)
  const currency = config?.currency ?? 'AUD'

  const filter = {
    status: view === 'all' ? undefined : view,
    claimantId: committee ? undefined : interaction.user.id,
  }

  const total = await countClaims(database, guildId, filter)
  // Deleting claims while somebody is on the last page would otherwise show a
  // blank one with no way back.
  const start = Math.max(0, Math.min(offset, Math.max(0, total - 1)))
  const claims = await claimsPage(database, guildId, filter, start, PAGE_SIZE)
  const owed = await outstanding(database, guildId, committee ? undefined : interaction.user.id)

  const heading = committee ? 'Claims' : 'Your claims'
  const scope = view === 'all' ? 'All' : STATUS[view].label
  const range = total === 0 ? '0' : `${start + 1}–${Math.min(start + PAGE_SIZE, total)} of ${total}`

  const lines = [`## ${heading} · ${scope} · ${range}`]

  if (!config?.reviewChannelId) {
    lines.push(
      committee
        ? '⚠️ Not set up. Press **Setup** before anybody claims.'
        : '⚠️ Not set up yet. Somebody on the committee needs to configure this.',
    )
  }

  lines.push(
    '',
    claims.length === 0
      ? '_Nothing here._'
      : claims.map((claim) => row(claim, currency, committee)).join('\n'),
    '',
    `-# ${formatAmount(owed.cents, currency)} outstanding across ${owed.claims} claim${owed.claims === 1 ? '' : 's'}`,
  )

  return {
    content: lines.join('\n'),
    components: controls(view, start, total, committee),
    allowedMentions: { parse: [] },
  }
}

function row(claim: ReimburseClaim, currency: string, committee: boolean): string {
  const what = claim.description.split('\n')[0]?.slice(0, 48) ?? ''
  const who = committee ? ` · <@${claim.claimantId}>` : ''
  return `${statusText(claim.status)} \`#${claim.reference}\` ${formatAmount(claim.amountCents, currency)}${who} — ${what}`
}

function controls(
  view: View,
  offset: number,
  total: number,
  committee: boolean,
): ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`${PREFIX}view`)
        .setPlaceholder('Show…')
        .addOptions(
          { label: 'All claims', value: VIEW.all, default: view === 'all' },
          ...ALL_STATUSES.map((status) => ({
            label: STATUS[status].label,
            value: status,
            emoji: STATUS[status].icon,
            default: view === status,
          })),
        ),
    ),
  ]

  if (total > PAGE_SIZE) {
    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(pageId(view, Math.max(0, offset - PAGE_SIZE)))
          .setEmoji('◀')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(offset === 0),
        new ButtonBuilder()
          .setCustomId(pageId(view, offset + PAGE_SIZE))
          .setEmoji('▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(offset + PAGE_SIZE >= total),
      ),
    )
  }

  /*
   * Only offered when the view is a single state and there is something in it.
   * A treasurer does a payment run of a dozen claims in their banking app and
   * then has to come back and tick a dozen buttons; doing that by hand is where
   * somebody gives up and the records stop matching the bank.
   */
  if (committee && view !== 'all' && total > 0) {
    const next = view === 'pending' ? 'submitted' : view === 'submitted' ? 'paid' : null
    if (next) {
      rows.push(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`${PREFIX}bulk:${view}:${next}`)
            .setEmoji(STATUS[next].icon)
            .setLabel(`Mark all ${total} as ${STATUS[next].label}`)
            .setStyle(ButtonStyle.Primary),
        ),
      )
    }
  }

  const tools = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${PREFIX}bank`)
      .setEmoji('🏦')
      .setLabel('Bank details')
      .setStyle(ButtonStyle.Secondary),
  )

  if (committee) {
    tools.addComponents(
      new ButtonBuilder()
        .setCustomId(`${PREFIX}export:claims`)
        .setEmoji('⬇️')
        .setLabel('Export')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${PREFIX}export:payments`)
        .setEmoji('💸')
        .setLabel('Payment run')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${PREFIX}setup`)
        .setEmoji('⚙️')
        .setLabel('Setup')
        .setStyle(ButtonStyle.Secondary),
    )
  }

  rows.push(tools)
  return rows
}

export async function openConsole(
  interaction: RepliableInteraction,
  database: Database,
): Promise<void> {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: 'Reimbursements are per server, so this has to be used inside one.',
      flags: MessageFlags.Ephemeral,
    })
    return
  }

  if (!interaction.isChatInputCommand()) return

  await interaction.deferReply({ flags: MessageFlags.Ephemeral })
  const view = await renderConsole(interaction, database, 'all', 0)
  await interaction.editReply(view as Parameters<typeof interaction.editReply>[0])
}

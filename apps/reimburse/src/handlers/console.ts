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
import {
  claimsPage,
  configFor,
  countClaims,
  outstandingByStatus,
  type ClaimStatus,
} from '../claims'
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

export function pageId(view: View, offset: number, selected: readonly number[]): string {
  return `${PREFIX}page:${view}:${offset}:${encodeRefs(selected)}`
}

export function encodeRefs(selected: readonly number[]): string {
  return selected.join(',')
}

export function decodeRefs(value: string | undefined): number[] {
  if (!value) return []
  return value
    .split(',')
    .map(Number)
    .filter((reference) => Number.isInteger(reference) && reference > 0)
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
  selected: readonly number[] = [],
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
  const owed = await outstandingByStatus(
    database,
    guildId,
    committee ? undefined : interaction.user.id,
  )

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

  // Only what is on screen can stay selected. Carrying a selection off the page
  // would mean acting on claims nobody can see.
  const onPage = new Set(claims.map((claim) => claim.reference))
  const live = selected.filter((reference) => onPage.has(reference))

  lines.push(
    '',
    claims.length === 0
      ? '_Nothing here._'
      : claims
          .map((claim) => row(claim, currency, committee, live.includes(claim.reference)))
          .join('\n'),
    '',
    outstandingLine(owed, currency),
  )

  return {
    content: lines.join('\n'),
    components: controls(view, start, total, committee, claims, live, currency),
    allowedMentions: { parse: [] },
  }
}

/**
 * Money still owed, split by where it is stuck.
 *
 * Pending is waiting on the treasurer; submitted is waiting on whoever pays.
 * One combined figure told nobody which of those was the problem.
 */
function outstandingLine(
  owed: readonly { status: ClaimStatus; cents: number; claims: number }[],
  currency: string,
): string {
  if (owed.length === 0) return '-# Nothing outstanding.'

  const parts = [...owed]
    .sort((a, b) => ALL_STATUSES.indexOf(a.status) - ALL_STATUSES.indexOf(b.status))
    .map(
      (entry) =>
        `${STATUS[entry.status].icon} ${formatAmount(entry.cents, currency)} ${STATUS[entry.status].label.toLowerCase()} (${entry.claims})`,
    )

  const total = owed.reduce((sum, entry) => sum + entry.cents, 0)
  return `-# ${parts.join(' · ')} — ${formatAmount(total, currency)} in total`
}

function row(claim: ReimburseClaim, currency: string, committee: boolean, picked: boolean): string {
  const what = claim.description.split('\n')[0]?.slice(0, 48) ?? ''
  const who = committee ? ` · <@${claim.claimantId}>` : ''
  const mark = picked ? '**›** ' : ''
  return `${mark}${statusText(claim.status)} \`#${claim.reference}\` ${formatAmount(claim.amountCents, currency)}${who} — ${what}`
}

function controls(
  view: View,
  offset: number,
  total: number,
  committee: boolean,
  claims: readonly ReimburseClaim[],
  selected: readonly number[],
  currency: string,
): ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`${PREFIX}view:${offset}`)
        .setPlaceholder('Show…')
        .addOptions(
          { label: 'All claims', value: VIEW.all, default: view === 'all' },
          ...ALL_STATUSES.map((status) => ({
            label: STATUS[status].label,
            value: String(status),
            emoji: STATUS[status].icon,
            default: view === status,
          })),
        ),
    ),
  ]

  /*
   * Picking specific claims, which is what the export and the bulk move act on.
   * Without it the only thing either could mean was "everything matching the
   * filter", and a treasurer paying six of eleven pending claims had no way to
   * say so.
   */
  if (claims.length > 0) {
    rows.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`${PREFIX}pick:${view}:${offset}`)
          .setPlaceholder('Select claims on this page…')
          .setMinValues(0)
          .setMaxValues(claims.length)
          .addOptions(
            claims.map((claim) => ({
              label: `#${claim.reference} · ${formatAmount(claim.amountCents, currency)}`,
              description: claim.description.split('\n')[0]?.slice(0, 90) || undefined,
              value: String(claim.reference),
              emoji: STATUS[claim.status].icon,
              default: selected.includes(claim.reference),
            })),
          ),
      ),
    )
  }

  if (total > PAGE_SIZE) {
    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(pageId(view, Math.max(0, offset - PAGE_SIZE), selected))
          .setEmoji('◀')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(offset === 0),
        new ButtonBuilder()
          .setCustomId(pageId(view, offset + PAGE_SIZE, selected))
          .setEmoji('▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(offset + PAGE_SIZE >= total),
      ),
    )
  }

  /*
   * Acts on the selection when there is one. A payment run is a dozen claims at
   * once in a banking app, and coming back to tick a dozen buttons is where
   * somebody gives up and the records stop matching the bank.
   */
  if (committee && selected.length > 0) {
    const moves = ALL_STATUSES.filter((status) => status !== view)
    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...moves.slice(0, 4).map((status) =>
          new ButtonBuilder()
            .setCustomId(`${PREFIX}bulk:${view}:${status}:${encodeRefs(selected)}`)
            .setEmoji(STATUS[status].icon)
            .setLabel(`${selected.length} → ${STATUS[status].label}`)
            .setStyle(status === 'rejected' ? ButtonStyle.Danger : ButtonStyle.Primary),
        ),
      ),
    )
  }

  if (committee) {
    const tools = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${PREFIX}export:${view}:${encodeRefs(selected)}`)
        .setEmoji('⬇️')
        .setLabel(
          selected.length > 0
            ? `Export ${selected.length} selected`
            : view === 'all'
              ? 'Export all'
              : `Export ${STATUS[view].label.toLowerCase()}`,
        )
        .setStyle(ButtonStyle.Secondary),
    )
    rows.push(tools)
  }

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

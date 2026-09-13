import { MessageFlags, type ButtonInteraction } from 'discord.js'
import type { Database } from '@gict/db'
import { canMoveTo, claimById, configFor, moveClaim } from '../claims'
import { STATUS, type ClaimStatus } from '../status'
import { formatAmount } from '../money'
import { claimSummary, reviewButtons } from './submit'

export async function onReviewButton(
  interaction: ButtonInteraction,
  database: Database,
): Promise<void> {
  const [, action, claimId] = interaction.customId.split(':')
  if (!action || !claimId) return

  const to = action as ClaimStatus
  const config = await configFor(database, interaction.guildId!)

  /*
   * A role rather than Manage Server. A treasurer is often not a server admin,
   * and making them one so they can tick off expenses is the wrong trade.
   */
  if (!config?.treasurerRoleId) {
    await interaction.reply({
      content: 'No treasurer role is set. An admin needs to run `/reimbursements setup`.',
      flags: MessageFlags.Ephemeral,
    })
    return
  }

  const member = await interaction.guild?.members.fetch(interaction.user.id)
  if (!member?.roles.cache.has(config.treasurerRoleId)) {
    await interaction.reply({
      content: `Only <@&${config.treasurerRoleId}> can move claims along.`,
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] },
    })
    return
  }

  const claim = await claimById(database, claimId)
  if (!claim) {
    await interaction.reply({
      content: 'That claim no longer exists.',
      flags: MessageFlags.Ephemeral,
    })
    return
  }

  /*
   * A treasurer may move their own claim along. In a club the person buying
   * things is very often the person holding the role, and a second pair of
   * hands mostly means nothing gets logged at all. reimburse_events records
   * who moved what either way, which is the control that actually answers an
   * audit.
   */

  if (!canMoveTo(claim.status, to)) {
    await interaction.reply({
      content: `Claim #${claim.reference} is already **${STATUS[claim.status].label}**, so that is not a move it can make.`,
      flags: MessageFlags.Ephemeral,
    })
    return
  }

  // Conditional on the status still reading as it did, so two treasurers
  // pressing at once cannot both succeed.
  const moved = await moveClaim(database, claim.id, claim.status, to, interaction.user.id)
  if (!moved) {
    await interaction.reply({
      content: 'Somebody moved that claim a moment before you did. Have another look.',
      flags: MessageFlags.Ephemeral,
    })
    return
  }

  await interaction.update({
    content: claimSummary(moved, config.currency),
    components: reviewButtons(moved),
  })

  await interaction.followUp({
    content: `Claim #${moved.reference} ${STATUS[to].told}.`,
    flags: MessageFlags.Ephemeral,
  })

  // Told directly, because a claimant should not have to watch a channel they
  // may not even be able to see.
  await interaction.client.users
    .send(
      moved.claimantId,
      `${STATUS[to].icon} Your claim **#${moved.reference}** for ${formatAmount(moved.amountCents, config.currency)} ${STATUS[to].told}.`,
    )
    .catch(() => {
      // Closed DMs. Not worth failing the transition that already happened.
    })
}

import { MessageFlags, type ButtonInteraction } from 'discord.js'
import type { Database, ReimburseClaim } from '@gict/db'
import { canMoveTo, claimById, configFor, moveClaim, payeeFor } from '../claims'
import { STATUS, type ClaimStatus } from '../status'
import { formatAmount } from '../money'
import { formatBankCode } from '../payee'
import { claimMessage } from './submit'

export async function onReviewButton(
  interaction: ButtonInteraction,
  database: Database,
): Promise<void> {
  const [, action, claimId] = interaction.customId.split(':')
  if (!action || !claimId) return

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
      content: `Only <@&${config.treasurerRoleId}> can do that.`,
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

  if (action === 'details') {
    await showPaymentDetails(interaction, database, claim, config.currency)
    return
  }

  const to = action as ClaimStatus

  /*
   * A treasurer may move their own claim along. In a club the person buying
   * things is very often the person holding the role, and a second pair of
   * hands mostly means nothing gets logged at all. reimburse_events records
   * who moved what either way, which is the control that actually answers an
   * audit.
   */

  /*
   * Already there. The buttons on this message are out of date, which happens
   * when somebody else moved it while this one sat on screen. Redraw rather
   * than complain: the claim is in the state they asked for.
   */
  if (claim.status === to) {
    await interaction.update(claimMessage(claim, config.currency))
    return
  }

  if (!canMoveTo(claim.status, to)) {
    await interaction.reply({
      content: `Claim #${claim.reference} cannot go to **${STATUS[to].label}** from **${STATUS[claim.status].label}**.`,
      flags: MessageFlags.Ephemeral,
    })
    return
  }

  // Conditional on the status still reading as it did, so two treasurers
  // pressing at once cannot both succeed.
  const moved = await moveClaim(database, claim.id, claim.status, to, interaction.user.id)

  if (!moved) {
    /*
     * The update found nothing, so the status changed between reading it and
     * writing it. Whether that matters depends on where it landed: if it is
     * already where this press was taking it, the outcome is the one that was
     * wanted and saying "somebody beat you" is just noise.
     */
    const current = await claimById(database, claim.id)

    if (current?.status === to) {
      await interaction.update(claimMessage(current, config.currency))
      return
    }

    await interaction.reply({
      content: current
        ? `Somebody moved claim #${current.reference} to **${STATUS[current.status].label}** just before you. Have another look.`
        : 'That claim no longer exists.',
      flags: MessageFlags.Ephemeral,
    })
    return
  }

  await interaction.update(claimMessage(moved, config.currency))

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

/**
 * The full account number, to whoever asked and nobody else.
 *
 * The claim post carries a masked one because a whole committee can read that
 * channel. The person actually making the payment needs the real thing, so it
 * sits one click away rather than on display, and the reply is ephemeral so it
 * never lands in the channel at all.
 */
async function showPaymentDetails(
  interaction: ButtonInteraction,
  database: Database,
  claim: ReimburseClaim,
  currency: string,
): Promise<void> {
  if (!claim.payeeBankCode || !claim.payeeAccountNumber) {
    await interaction.reply({
      content: `Claim #${claim.reference} has no bank details on it. It was made before the bot asked for them, so <@${claim.claimantId}> needs to add them with \`/reimbursements bank\` and claim again.`,
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] },
    })
    return
  }

  const lines = [
    `**Claim #${claim.reference}** · ${formatAmount(claim.amountCents, currency)}`,
    `Pay **${claim.payeeName ?? 'unknown'}**`,
    `BSB \`${formatBankCode(claim.payeeBankCode)}\``,
    `Account \`${claim.payeeAccountNumber}\``,
  ]

  /*
   * Only mentioned when it matters.
   *
   * These are the details frozen onto the claim, which is what should be paid.
   * Saying so every time is noise, because they are almost always the same as
   * the person's current ones. When they are not, it is the one thing the
   * treasurer needs to know before sending money to an account its owner has
   * since replaced.
   */
  const current = await payeeFor(database, claim.guildId, claim.claimantId)
  const changed =
    current &&
    (current.bankCode !== claim.payeeBankCode || current.accountNumber !== claim.payeeAccountNumber)

  if (changed) {
    lines.push(
      '',
      `⚠️ <@${claim.claimantId}> has changed their details since this claim.`,
      `Now: ${formatBankCode(current.bankCode)} · ${current.accountNumber}`,
      '-# Pay whichever is right. The claim keeps what it was made with.',
    )
  }

  await interaction.reply({
    content: lines.join('\n'),
    flags: MessageFlags.Ephemeral,
    allowedMentions: { parse: [] },
  })
}

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

  const claim = await claimById(database, interaction.guildId!, claimId)
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
  const moved = await moveClaim(
    database,
    interaction.guildId!,
    claim.id,
    claim.status,
    to,
    interaction.user.id,
  )

  if (!moved) {
    /*
     * The update found nothing, so the status changed between reading it and
     * writing it. Whether that matters depends on where it landed: if it is
     * already where this press was taking it, the outcome is the one that was
     * wanted and saying "somebody beat you" is just noise.
     */
    const current = await claimById(database, interaction.guildId!, claim.id)

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
 * Where to send the money, to whoever asked and nobody else.
 *
 * Read off the person, not the claim. A claim is an instruction that has not
 * been carried out, so if somebody has changed banks since claiming, the money
 * should follow them rather than go to an account they have closed.
 *
 * Ephemeral, because the claim post sits in a channel a whole committee reads
 * and only the person making the payment needs the number.
 */
async function showPaymentDetails(
  interaction: ButtonInteraction,
  database: Database,
  claim: ReimburseClaim,
  currency: string,
): Promise<void> {
  const payee = await payeeFor(database, claim.guildId, claim.claimantId)

  if (!payee) {
    await interaction.reply({
      content: `<@${claim.claimantId}> has no bank details on file. They can add them with \`/reimbursements bank\`.`,
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] },
    })
    return
  }

  await interaction.reply({
    content: [
      `**Claim #${claim.reference}** · ${formatAmount(claim.amountCents, currency)}`,
      `Pay **${payee.accountName}**`,
      `BSB \`${formatBankCode(payee.bankCode)}\``,
      `Account \`${payee.accountNumber}\``,
    ].join('\n'),
    flags: MessageFlags.Ephemeral,
  })
}

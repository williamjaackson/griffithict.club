import { database as openDatabase, loadBotConfig, shutdownOn } from '@gict/bot-kit'
import {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
} from 'discord.js'
import { configFor, moveAllClaims, payeeFor, type ClaimStatus } from './claims'
import { onSetupSubmit } from './handlers/admin'
import { onBankSubmit } from './handlers/bank'
import { isCommittee, openConsole, PREFIX, renderConsole, type View } from './handlers/console'
import { onExport } from './handlers/export'
import { onReviewButton } from './handlers/review'
import { onClaimSubmit } from './handlers/submit'
import {
  BANK_MODAL_ID,
  bankModal,
  CLAIM_MODAL_ID,
  claimModal,
  SETUP_MODAL_ID,
  setupModal,
} from './modal'

const config = loadBotConfig('REIMBURSE')
const database = openDatabase(config.databaseUrl)

/*
 * Guilds only. This bot never watches members or messages, it only answers
 * interactions, so it needs no privileged intent and nothing enabled in the
 * developer portal.
 */
const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.once(Events.ClientReady, (ready) => {
  console.log(`Reimburse is up as ${ready.user.tag} across ${ready.guilds.cache.size} server(s)`)
})

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'reimbursement') {
        const payee = await payeeFor(database, interaction.guildId!, interaction.user.id)
        await interaction.showModal(payee ? claimModal() : bankModal(null))
        return
      }
      if (interaction.commandName === 'reimbursements') {
        await openConsole(interaction, database)
        return
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === CLAIM_MODAL_ID)
        return void (await onClaimSubmit(interaction, database))
      if (interaction.customId === BANK_MODAL_ID)
        return void (await onBankSubmit(interaction, database))
      if (interaction.customId === SETUP_MODAL_ID)
        return void (await onSetupSubmit(interaction, database))
    }

    // Moving one claim along, from its post in the review channel.
    if (interaction.isButton() && interaction.customId.startsWith('claim:')) {
      await onReviewButton(interaction, database)
      return
    }

    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith(PREFIX)) {
        await onConsoleControl(interaction, interaction.customId.slice(PREFIX.length))
        return
      }
    }

    // The hand-off out of the bank form, since a modal cannot open a modal.
    if (interaction.isButton() && interaction.customId === 'reimbursement:continue') {
      await interaction.showModal(claimModal())
      return
    }
  } catch (error) {
    console.error('Interaction failed:', error)
    if (!interaction.isRepliable()) return
    const message = {
      content: 'Something went wrong there.',
      flags: MessageFlags.Ephemeral,
    } as const
    await (
      interaction.deferred || interaction.replied
        ? interaction.followUp(message)
        : interaction.reply(message)
    ).catch(() => {})
  }
})

/** Everything on the management screen. */
async function onConsoleControl(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  action: string,
): Promise<void> {
  const redraw = async (view: View, offset: number) => {
    const rendered = await renderConsole(interaction, database, view, offset)
    await interaction.update(rendered)
  }

  if (interaction.isStringSelectMenu() && action === 'view') {
    await redraw(interaction.values[0] as View, 0)
    return
  }

  if (action.startsWith('page:')) {
    const [, view, offset] = action.split(':')
    await redraw(view as View, Number(offset) || 0)
    return
  }

  if (action === 'bank') {
    const payee = await payeeFor(database, interaction.guildId!, interaction.user.id)
    await interaction.showModal(bankModal(payee))
    return
  }

  // One gate for every committee control, rather than a copy of it per action.
  if (!(await isCommittee(interaction, database))) {
    await interaction.reply({
      content: 'That one is for the committee.',
      flags: MessageFlags.Ephemeral,
    })
    return
  }

  if (action === 'setup') {
    await interaction.showModal(setupModal(await configFor(database, interaction.guildId!)))
    return
  }

  if (action.startsWith('export:')) {
    if (!interaction.isButton()) return
    await onExport(interaction, database, action.endsWith('payments') ? 'payments' : 'claims')
    return
  }

  if (action.startsWith('bulk:')) {
    const [, from, to] = action.split(':')
    const moved = await moveAllClaims(
      database,
      interaction.guildId!,
      from as ClaimStatus,
      to as ClaimStatus,
      interaction.user.id,
    )
    await redraw(to as View, 0)
    await interaction.followUp({
      content:
        moved === 0
          ? 'Nothing left to move — somebody got there first.'
          : `Moved ${moved} claim${moved === 1 ? '' : 's'}.`,
      flags: MessageFlags.Ephemeral,
    })
  }
}

client.on(Events.Error, (error) => console.error('Gateway error:', error))

shutdownOn(client)

await client.login(config.token)

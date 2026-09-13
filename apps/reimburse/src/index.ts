import { database as openDatabase, loadBotConfig, shutdownOn } from '@gict/bot-kit'
import { Client, Events, GatewayIntentBits, MessageFlags } from 'discord.js'
import { configFor, payeeFor } from './claims'
import { onSetupSubmit, showAllClaims } from './handlers/admin'
import { onBankSubmit } from './handlers/bank'
import { BUTTON, isCommittee, showDashboard } from './handlers/dashboard'
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
 * interactions, so it needs no privileged intent and no toggle in the developer
 * portal. Worth knowing when an admin asks what it can see: almost nothing.
 */
const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.once(Events.ClientReady, (ready) => {
  console.log(`Reimburse is up as ${ready.user.tag} across ${ready.guilds.cache.size} server(s)`)
})

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === 'reimbursement') {
      await showDashboard(interaction, database)
      return
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === CLAIM_MODAL_ID)
        return void (await onClaimSubmit(interaction, database))
      if (interaction.customId === BANK_MODAL_ID)
        return void (await onBankSubmit(interaction, database))
      if (interaction.customId === SETUP_MODAL_ID)
        return void (await onSetupSubmit(interaction, database))
    }

    if (!interaction.isButton()) return

    // Moving a claim along, from the post in the review channel.
    if (interaction.customId.startsWith('claim:')) {
      await onReviewButton(interaction, database)
      return
    }

    switch (interaction.customId) {
      case BUTTON.claim:
      case 'reimbursement:continue': {
        const payee = await payeeFor(database, interaction.guildId!, interaction.user.id)
        await interaction.showModal(payee ? claimModal() : bankModal(null))
        return
      }

      case BUTTON.bank: {
        const payee = await payeeFor(database, interaction.guildId!, interaction.user.id)
        await interaction.showModal(bankModal(payee))
        return
      }

      case BUTTON.all:
      case BUTTON.exportClaims:
      case BUTTON.exportPayments:
      case BUTTON.setup: {
        // One gate for every committee button, rather than four copies of it.
        if (!(await isCommittee(interaction, database))) {
          await interaction.reply({
            content: 'That one is for the committee.',
            flags: MessageFlags.Ephemeral,
          })
          return
        }

        if (interaction.customId === BUTTON.all)
          return void (await showAllClaims(interaction, database))
        if (interaction.customId === BUTTON.setup) {
          await interaction.showModal(setupModal(await configFor(database, interaction.guildId!)))
          return
        }
        await onExport(
          interaction,
          database,
          interaction.customId === BUTTON.exportPayments ? 'payments' : 'claims',
        )
        return
      }
    }
  } catch (error) {
    console.error('Interaction failed:', error)
    if (!interaction.isRepliable()) return
    // Without a reply Discord shows "the application did not respond", which
    // tells the user nothing about what went wrong.
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

client.on(Events.Error, (error) => console.error('Gateway error:', error))

shutdownOn(client)

await client.login(config.token)

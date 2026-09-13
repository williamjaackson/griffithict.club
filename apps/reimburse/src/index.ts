import { Client, Events, GatewayIntentBits, MessageFlags } from 'discord.js'
import { loadConfig } from './config'
import { payeeFor } from './claims'
import { CONTINUE_BUTTON, onBankSubmit } from './handlers/bank'
import { db } from './db'
import { onAdminCommand } from './handlers/admin'
import { onReviewButton } from './handlers/review'
import { onClaimSubmit } from './handlers/submit'
import { bankModal, BANK_MODAL_ID, claimModal, CLAIM_MODAL_ID } from './modal'

const config = loadConfig()
const database = db(config.databaseUrl)

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
    if (interaction.isChatInputCommand()) {
      // The bare command opens the form. Everything else is under the plural.
      if (interaction.commandName === 'reimbursement') {
        /*
         * A first-time claimant is sent through the bank form first, because
         * the claim needs somewhere to pay and the two together do not fit in
         * one modal. After that this is a single step forever.
         */
        const payee = interaction.inGuild()
          ? await payeeFor(database, interaction.guildId, interaction.user.id)
          : null
        await interaction.showModal(payee ? claimModal() : bankModal(null))
        return
      }
      if (interaction.commandName === 'reimbursements') {
        await onAdminCommand(interaction, database)
        return
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === CLAIM_MODAL_ID) {
        await onClaimSubmit(interaction, database)
        return
      }
      if (interaction.customId === BANK_MODAL_ID) {
        await onBankSubmit(interaction, database)
        return
      }
    }

    // The hand-off out of the bank form, since a modal cannot open a modal.
    if (interaction.isButton() && interaction.customId === CONTINUE_BUTTON) {
      await interaction.showModal(claimModal())
      return
    }

    if (interaction.isButton() && interaction.customId.startsWith('claim:')) {
      await onReviewButton(interaction, database)
      return
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

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    console.log(`\n${signal} — shutting down`)
    void client.destroy().finally(() => process.exit(0))
  })
}

await client.login(config.token)

import { Client, Events, GatewayIntentBits, MessageFlags } from 'discord.js'
import { loadConfig } from './config'
import { db } from './db'
import { onAdminCommand } from './handlers/admin'
import { onReviewButton } from './handlers/review'
import { onClaimSubmit } from './handlers/submit'
import { claimModal, MODAL_ID } from './modal'

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
        await interaction.showModal(claimModal())
        return
      }
      if (interaction.commandName === 'reimbursements') {
        await onAdminCommand(interaction, database)
        return
      }
    }

    if (interaction.isModalSubmit() && interaction.customId === MODAL_ID) {
      await onClaimSubmit(interaction, database)
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

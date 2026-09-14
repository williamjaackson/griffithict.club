import { database as openDatabase, loadBotConfig, shutdownOn } from '@gict/bot-kit'
import { Client, Events, GatewayIntentBits, MessageFlags } from 'discord.js'
import {
  onColourSubmit,
  onPassSubmit,
  onSetupSubmit,
  onTakeButton,
  onTakeSelect,
  TAKE_SELECT,
} from './handlers/actions'
import { BUTTON, openConsole } from './handlers/console'
import {
  onMemberAdd,
  onMemberRemove,
  onMemberUpdate,
  onUserUpdate,
  reconcile,
} from './handlers/lifecycle'
import { colourModal, COLOUR_MODAL, passModal, PASS_MODAL, setupModal, SETUP_MODAL } from './modals'
import { configFor, describeBypass, personalRole } from './perks'

const config = loadBotConfig('BOOST')
const database = openDatabase(config.databaseUrl)

/*
 * GuildMembers is privileged and has to be switched on in the developer portal.
 * Without it guildMemberUpdate never fires, so a boost starting or lapsing is
 * invisible and the bot does nothing at all.
 */
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
})

client.once(Events.ClientReady, async (ready) => {
  console.log(`Boost is up as ${ready.user.tag}`)

  const bypass = describeBypass()
  if (bypass) {
    console.warn(
      `BOOST_TEST_BOOSTERS is set: ${bypass} will be treated as boosting in every server this bot is in. Unset it when you are done testing.`,
    )
  }
  // Sequential: fetching every member of every guild at once is the quickest
  // way to get rate limited on startup, and there is no hurry.
  for (const guild of ready.guilds.cache.values()) {
    await reconcile(database, guild)
  }
  console.log(`Ready across ${ready.guilds.cache.size} server(s)`)
})

client.on(Events.GuildCreate, (guild) => reconcile(database, guild))

/*
 * Leaving is a boost ending as far as this server is concerned, and it does not
 * fire guildMemberUpdate. Without this a departed booster's role sits there for
 * ever and everybody they passed keeps the role.
 */
client.on(Events.GuildMemberRemove, async (member) => {
  try {
    await onMemberRemove(member, database)
  } catch (error) {
    console.error('Failed to handle a member leaving:', error)
  }
})

/** A returning pass holder gets the role back; the pass was never given up. */
client.on(Events.GuildMemberAdd, async (member) => {
  try {
    await onMemberAdd(member, database)
  } catch (error) {
    console.error('Failed to handle a member joining:', error)
  }
})

client.on(Events.GuildMemberUpdate, async (before, after) => {
  try {
    await onMemberUpdate(before, after, database)
  } catch (error) {
    console.error('Failed to handle a member update:', error)
  }
})

client.on(Events.UserUpdate, async (before, after) => {
  try {
    await onUserUpdate(before, after, database)
  } catch (error) {
    console.error('Failed to handle a username change:', error)
  }
})

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'boost')
        return void (await openConsole(interaction, database))
      if (interaction.commandName === 'setup') {
        return void (await interaction.showModal(
          setupModal(await configFor(database, interaction.guildId!)),
        ))
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === COLOUR_MODAL)
        return void (await onColourSubmit(interaction, database))
      if (interaction.customId === PASS_MODAL)
        return void (await onPassSubmit(interaction, database))
      if (interaction.customId === SETUP_MODAL)
        return void (await onSetupSubmit(interaction, database))
    }

    if (interaction.isStringSelectMenu() && interaction.customId === TAKE_SELECT) {
      return void (await onTakeSelect(interaction, database))
    }

    if (!interaction.isButton()) return

    switch (interaction.customId) {
      case BUTTON.colour: {
        const existing = interaction.inCachedGuild()
          ? await personalRole(database, interaction.guildId, interaction.user.id)
          : null
        await interaction.showModal(colourModal(existing?.colour ?? null))
        return
      }
      case BUTTON.give:
        await interaction.showModal(passModal())
        return
      case BUTTON.take:
        await onTakeButton(interaction, database)
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

client.on(Events.Error, (error) => console.error('Gateway error:', error))

shutdownOn(client)

await client.login(config.token)

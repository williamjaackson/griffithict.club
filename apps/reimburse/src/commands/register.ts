import { REST, Routes } from 'discord.js'
import { loadConfig } from '../config'
import { commands } from './definitions'

/**
 * Push the command definitions to Discord.
 *
 * Commands are uploaded over REST and remembered on their side, so a running
 * bot never announces them and this has to be re-run after any change here.
 *
 * Global registration can take an hour to reach a client, which looks exactly
 * like a broken bot. REIMBURSE_DEV_GUILD_ID registers to one server instead and
 * is immediate.
 */
const config = loadConfig()
const rest = new REST().setToken(config.token)
const body = commands.map((command) => command.toJSON())

if (config.devGuildId) {
  await rest.put(Routes.applicationGuildCommands(config.applicationId, config.devGuildId), { body })
  console.log(`Registered ${body.length} command(s) to guild ${config.devGuildId} — live now`)
} else {
  await rest.put(Routes.applicationCommands(config.applicationId), { body })
  console.log(`Registered ${body.length} command(s) globally — allow up to an hour to appear`)
}

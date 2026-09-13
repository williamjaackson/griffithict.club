import { REST, Routes } from 'discord.js'
import { loadConfig } from '../config'
import { commands } from './definitions'

/**
 * Push the command definitions to Discord.
 *
 * Slash commands are not announced by a running bot. They are uploaded once
 * through the REST API and Discord remembers them, so this has to be run after
 * any change to definitions.ts or the client shows the old set.
 *
 * Scope matters more than it looks. Global commands can take up to an hour to
 * appear in a client, which looks exactly like a broken bot. Guild commands
 * appear immediately, so set FUNNEL_DEV_GUILD_ID while working and drop it when
 * publishing for real.
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

import { REST, Routes, type Client } from 'discord.js'
import { createDatabase, type Database } from '@gict/db'
import type { BotConfig } from './config'

const pools = new Map<string, Database>()

/** One pool per connection string, whoever asks for it. */
export function database(url: string): Database {
  let existing = pools.get(url)
  if (!existing) {
    existing = createDatabase(url)
    pools.set(url, existing)
  }
  return existing
}

type Definition = { toJSON: () => unknown }

/**
 * Upload command definitions.
 *
 * Discord learns commands over REST and remembers them, so a running bot never
 * announces them and this has to be re-run after any change to a definition.
 */
export async function registerCommands(
  config: BotConfig,
  commands: readonly Definition[],
): Promise<void> {
  const rest = new REST().setToken(config.token)
  const body = commands.map((command) => command.toJSON())

  if (config.devGuildId) {
    await rest.put(Routes.applicationGuildCommands(config.applicationId, config.devGuildId), {
      body,
    })
    console.log(`Registered ${body.length} command(s) to guild ${config.devGuildId} — live now`)
    return
  }

  await rest.put(Routes.applicationCommands(config.applicationId), { body })
  console.log(`Registered ${body.length} command(s) globally — allow up to an hour to appear`)
}

/** Close the gateway connection on the signals Docker and a terminal send. */
export function shutdownOn(client: Client): void {
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      console.log(`\n${signal} — shutting down`)
      void client.destroy().finally(() => process.exit(0))
    })
  }
}

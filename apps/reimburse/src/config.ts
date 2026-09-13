import { loadRootEnv } from '@gict/db/env'

/**
 * Everything the bot needs from the environment, checked once at startup.
 *
 * Names are prefixed because this workspace already holds another bot and a
 * website reading their own DISCORD_* variables out of the same file.
 */
export type Config = {
  token: string
  applicationId: string
  databaseUrl: string
  /** Register commands to one server. Global takes up to an hour to appear. */
  devGuildId: string | null
}

const WHERE =
  'Local: add it to .env at the repo root. Production: /etc/club/reimburse.env on the host (root-owned, mode 600).'

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not set.\n${WHERE}`)
  return value
}

export function loadConfig(): Config {
  loadRootEnv()

  return {
    token: required('REIMBURSE_BOT_TOKEN'),
    applicationId: required('REIMBURSE_APPLICATION_ID'),
    databaseUrl: required('DATABASE_URL'),
    devGuildId: process.env.REIMBURSE_DEV_GUILD_ID?.trim() || null,
  }
}

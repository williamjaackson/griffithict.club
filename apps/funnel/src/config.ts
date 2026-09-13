import { loadRootEnv } from '@gict/db/env'

/**
 * Everything Funnel needs from the environment, checked once at startup.
 *
 * Deliberately loud and early. A bot that starts with a missing token fails
 * later, from inside a gateway callback, with an error that says nothing useful
 * about what is actually wrong.
 *
 * Names are prefixed rather than borrowing Discord's usual DISCORD_TOKEN,
 * because the website in this workspace already reads DISCORD_WEBHOOK_URL and
 * DISCORD_CONTACT_WEBHOOK_URL from the same file, and a second bot here one day
 * would collide with an unprefixed name.
 */

export type Config = {
  /** Bot token. Secret. Regenerate in the dev portal the moment it leaks. */
  token: string
  /** Application id. Not secret; slash command registration needs it. */
  applicationId: string
  databaseUrl: string
}

const WHERE =
  'Local: add it to .env at the repo root. Production: /etc/club/funnel.env on the host (root-owned, mode 600).'

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not set.\n${WHERE}`)
  return value
}

export function loadConfig(): Config {
  loadRootEnv()

  return {
    token: required('FUNNEL_BOT_TOKEN'),
    applicationId: required('FUNNEL_APPLICATION_ID'),
    databaseUrl: required('DATABASE_URL'),
  }
}

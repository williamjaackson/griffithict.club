import { loadRootEnv } from '@gict/db/env'

/**
 * What every bot in this workspace needs from the environment.
 *
 * Checked once at startup and loudly. A bot that starts with a missing token
 * fails later from inside a gateway callback, with an error that says nothing
 * about what is actually wrong.
 */
export type BotConfig = {
  /** Secret. Regenerate it in the developer portal the moment it leaks. */
  token: string
  /** Not secret; registering slash commands needs it. */
  applicationId: string
  databaseUrl: string
  /**
   * Register commands to one server rather than globally.
   *
   * Global registration can take an hour to reach a client, which is
   * indistinguishable from a bot that is simply broken. Guild registration is
   * immediate, so this is set while developing and dropped to publish.
   */
  devGuildId: string | null
}

/**
 * Read a bot's configuration from `<PREFIX>_BOT_TOKEN` and friends.
 *
 * Prefixed rather than borrowing Discord's usual DISCORD_TOKEN: this workspace
 * holds several bots and a website, all reading one env file, and an unprefixed
 * name would have them fighting over it.
 */
export function loadBotConfig(prefix: string): BotConfig {
  loadRootEnv()

  const where = `Local: add it to .env at the repo root. Production: /etc/club/${prefix.toLowerCase()}.env on the host (root-owned, mode 600).`

  const required = (name: string): string => {
    const value = process.env[name]?.trim()
    if (!value) throw new Error(`${name} is not set.\n${where}`)
    return value
  }

  return {
    token: required(`${prefix}_BOT_TOKEN`),
    applicationId: required(`${prefix}_APPLICATION_ID`),
    databaseUrl: required('DATABASE_URL'),
    devGuildId: process.env[`${prefix}_DEV_GUILD_ID`]?.trim() || null,
  }
}

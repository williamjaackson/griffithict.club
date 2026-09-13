import { Client, Events, GatewayIntentBits, MessageFlags, type Guild } from 'discord.js'
import { loadConfig } from './config'
import { db } from './db'
import { onCommand } from './handlers/interaction'
import { onMemberJoin } from './handlers/member-join'
import { InviteCache } from './invites/cache'
import { readInvites, readVanity } from './invites/read'
import {
  lastKnownUses,
  markGuildRemoved,
  persistInvites,
  pruneInvites,
  upsertGuild,
} from './invites/store'

const config = loadConfig()
const database = db(config.databaseUrl)
const cache = new InviteCache()

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    // Privileged. Without it enabled in the developer portal guildMemberAdd
    // never fires and the bot sees nothing at all.
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
  ],
})

/**
 * Take a first reading of a guild, and report what was missed while away.
 *
 * The counts held in funnel_invites are from whenever the bot last ran. Anything
 * they have moved by since is joins nobody attributed. Those members cannot be
 * matched to invites after the fact, so this says so plainly rather than quietly
 * resetting and under-reporting every invite from here on.
 */
async function prime(guild: Guild): Promise<void> {
  await upsertGuild(database, guild.id, guild.name)

  const invites = await readInvites(guild)
  if (invites === null) {
    console.warn(`[${guild.name}] cannot read invites — the bot is missing Manage Server`)
    return
  }

  const known = await lastKnownUses(database, guild.id)
  const missed = invites.reduce((total, invite) => {
    const previous = known.get(invite.code)
    return total + (previous === undefined ? 0 : Math.max(0, invite.uses - previous))
  }, 0)

  if (missed > 0) {
    console.warn(
      `[${guild.name}] ${missed} join(s) happened while offline and cannot be attributed`,
    )
  }

  const vanity = await readVanity(guild)
  cache.replace(guild.id, invites, vanity)
  await persistInvites(database, guild.id, invites)
  await pruneInvites(
    database,
    guild.id,
    invites.map((invite) => invite.code),
  )

  console.log(`[${guild.name}] watching ${invites.length} invite(s)`)
}

client.once(Events.ClientReady, async (ready) => {
  console.log(`Funnel is up as ${ready.user.tag}`)
  // Sequential on purpose: a burst of invite fetches is the fastest way to get
  // rate limited on startup, and there is no hurry here.
  for (const guild of ready.guilds.cache.values()) {
    await prime(guild)
  }
  console.log(`Ready across ${ready.guilds.cache.size} server(s)`)
})

client.on(Events.GuildCreate, async (guild) => {
  console.log(`Added to ${guild.name}`)
  await prime(guild)
})

client.on(Events.GuildDelete, async (guild) => {
  console.log(`Removed from ${guild.name}`)
  cache.forget(guild.id)
  // The rows stay. Servers remove bots by accident and a re-add should pick the
  // history back up rather than start from nothing.
  await markGuildRemoved(database, guild.id)
})

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    await onMemberJoin(member, database, cache)
  } catch (error) {
    console.error(`Failed to record a join in ${member.guild.name}:`, error)
  }
})

/*
 * These two keep the cache honest between joins, and they are what make a
 * missing code readable as "spent its last use" rather than "someone revoked
 * it". Without them the attribution guesses wrong every time an invite expires.
 */
client.on(Events.InviteCreate, (invite) => {
  if (!invite.guild) return
  cache.add(invite.guild.id, {
    code: invite.code,
    uses: invite.uses ?? 0,
    inviterId: invite.inviter?.id ?? null,
  })
})

client.on(Events.InviteDelete, (invite) => {
  if (!invite.guild) return
  cache.remove(invite.guild.id, invite.code)
})

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return
  try {
    await onCommand(interaction, database, cache)
  } catch (error) {
    console.error('Command failed:', error)
    // An interaction with no reply shows "the application did not respond",
    // which tells the user nothing about what went wrong.
    const message = {
      content: 'Something went wrong running that.',
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

import { ChannelType, type Guild } from 'discord.js'
import { eq } from 'drizzle-orm'
import { funnelGuilds, type Database } from '@gict/db'

/**
 * A mention in a plain message pings, unlike one inside an embed description.
 * Nothing Funnel posts should notify anybody.
 */
export const NO_PINGS = { parse: [] } as const

/**
 * Say something in the guild's log channel, if it has one.
 *
 * Silent when no channel is configured, when it has been deleted, or when the
 * bot cannot post there. None of those are worth an exception: the row has
 * already been written by the time anything gets announced, and losing a notice
 * is not worth losing the record.
 */
export async function notify(guild: Guild, database: Database, content: string): Promise<void> {
  const [row] = await database
    .select({ channelId: funnelGuilds.logChannelId })
    .from(funnelGuilds)
    .where(eq(funnelGuilds.id, guild.id))
    .limit(1)

  if (!row?.channelId) return

  const channel = guild.channels.cache.get(row.channelId)
  if (!channel || channel.type !== ChannelType.GuildText) return

  await channel.send({ content, allowedMentions: NO_PINGS }).catch(() => {})
}

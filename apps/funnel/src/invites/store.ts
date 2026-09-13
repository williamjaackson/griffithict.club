import { and, eq, inArray, sql } from 'drizzle-orm'
import { funnelGuilds, funnelInvites, funnelSources, type Database } from '@gict/db'
import type { InviteSnapshot } from './attribute'

/** Put a single invite on file the moment it is made, so it can be tagged at once. */
export async function upsertInvite(
  database: Database,
  guildId: string,
  invite: InviteSnapshot,
): Promise<void> {
  await persistInvites(database, guildId, [invite])
}

/** Forget an invite that no longer exists. Joins already recorded keep its code. */
export async function deleteInvite(database: Database, code: string): Promise<void> {
  await database.delete(funnelInvites).where(eq(funnelInvites.code, code))
}

/** Write the current invite counts, so a restart knows what it last saw. */
export async function persistInvites(
  database: Database,
  guildId: string,
  snapshots: readonly InviteSnapshot[],
): Promise<void> {
  if (snapshots.length === 0) return

  await database
    .insert(funnelInvites)
    .values(
      snapshots.map((invite) => ({
        code: invite.code,
        guildId,
        inviterId: invite.inviterId,
        uses: invite.uses,
      })),
    )
    .onConflictDoUpdate({
      target: funnelInvites.code,
      // The source is deliberately absent: it is set by a human through a slash
      // command and must survive every resync.
      set: {
        uses: sql`excluded.uses`,
        inviterId: sql`excluded.inviter_id`,
        updatedAt: new Date(),
      },
    })
}

/** Drop invites that no longer exist, so the table matches the guild. */
export async function pruneInvites(
  database: Database,
  guildId: string,
  keep: readonly string[],
): Promise<void> {
  const rows = await database
    .select({ code: funnelInvites.code })
    .from(funnelInvites)
    .where(eq(funnelInvites.guildId, guildId))

  const stale = rows.map((row) => row.code).filter((code) => !keep.includes(code))
  if (stale.length > 0) {
    await database.delete(funnelInvites).where(inArray(funnelInvites.code, stale))
  }
}

/** The counts we held last time the bot was running. */
export async function lastKnownUses(
  database: Database,
  guildId: string,
): Promise<Map<string, number>> {
  const rows = await database
    .select({ code: funnelInvites.code, uses: funnelInvites.uses })
    .from(funnelInvites)
    .where(eq(funnelInvites.guildId, guildId))

  return new Map(rows.map((row) => [row.code, row.uses]))
}

export async function upsertGuild(
  database: Database,
  guildId: string,
  name: string,
): Promise<void> {
  await database
    .insert(funnelGuilds)
    .values({ id: guildId, name })
    // Clearing removedAt is what resumes history when a server re-adds the bot.
    .onConflictDoUpdate({
      target: funnelGuilds.id,
      set: { name, removedAt: null },
    })
}

export async function markGuildRemoved(database: Database, guildId: string): Promise<void> {
  await database
    .update(funnelGuilds)
    .set({ removedAt: new Date() })
    .where(eq(funnelGuilds.id, guildId))
}

export type ResolvedSource = { id: string; name: string } | null

/** The source an invite has been tagged with, if a human has tagged it. */
export async function sourceForInvite(
  database: Database,
  guildId: string,
  code: string,
): Promise<ResolvedSource> {
  const [row] = await database
    .select({ id: funnelSources.id, name: funnelSources.name })
    .from(funnelInvites)
    .innerJoin(funnelSources, eq(funnelInvites.sourceId, funnelSources.id))
    .where(and(eq(funnelInvites.code, code), eq(funnelInvites.guildId, guildId)))
    .limit(1)

  return row ?? null
}

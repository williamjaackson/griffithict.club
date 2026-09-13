import { and, count, desc, eq, gte, isNotNull, sql } from 'drizzle-orm'
import { funnelInvites, funnelJoins, funnelSources, type Database } from '@gict/db'

export function since(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

export type InviterRow = { inviterId: string | null; joins: number }

/** Who has brought the most people in. Joins nobody can be credited for are excluded. */
export async function topInviters(
  database: Database,
  guildId: string,
  from: Date,
  limit = 10,
): Promise<InviterRow[]> {
  return database
    .select({ inviterId: funnelJoins.inviterId, joins: count() })
    .from(funnelJoins)
    .where(
      and(
        eq(funnelJoins.guildId, guildId),
        isNotNull(funnelJoins.inviterId),
        gte(funnelJoins.joinedAt, from),
      ),
    )
    .groupBy(funnelJoins.inviterId)
    .orderBy(desc(count()))
    .limit(limit)
}

export type SourceRow = { source: string; joins: number }

/**
 * Arrivals by source.
 *
 * Reads the frozen source_name off the join rather than joining to
 * funnel_sources, so renaming a source later does not rewrite old numbers.
 */
export async function joinsBySource(
  database: Database,
  guildId: string,
  from: Date,
): Promise<SourceRow[]> {
  const label = sql<string>`coalesce(${funnelJoins.sourceName}, 'Untagged')`

  return database
    .select({ source: label, joins: count() })
    .from(funnelJoins)
    .where(and(eq(funnelJoins.guildId, guildId), gte(funnelJoins.joinedAt, from)))
    .groupBy(label)
    .orderBy(desc(count()))
}

export type ConfidenceRow = { confidence: string; joins: number }

/**
 * How much the numbers above are worth.
 *
 * Shown alongside every report on purpose. A source breakdown with a third of
 * its joins unattributed is a different thing from one without, and the reader
 * cannot tell unless it says so.
 */
export async function confidenceBreakdown(
  database: Database,
  guildId: string,
  from: Date,
): Promise<ConfidenceRow[]> {
  return database
    .select({ confidence: funnelJoins.confidence, joins: count() })
    .from(funnelJoins)
    .where(and(eq(funnelJoins.guildId, guildId), gte(funnelJoins.joinedAt, from)))
    .groupBy(funnelJoins.confidence)
    .orderBy(desc(count()))
}

export type TaggedInvite = { code: string; uses: number; source: string | null }

export async function invitesWithSources(
  database: Database,
  guildId: string,
): Promise<TaggedInvite[]> {
  return database
    .select({ code: funnelInvites.code, uses: funnelInvites.uses, source: funnelSources.name })
    .from(funnelInvites)
    .leftJoin(funnelSources, eq(funnelInvites.sourceId, funnelSources.id))
    .where(eq(funnelInvites.guildId, guildId))
    .orderBy(desc(funnelInvites.uses))
}

/** Find or create a source by name, so tagging twice does not make two of them. */
export async function ensureSource(
  database: Database,
  guildId: string,
  name: string,
): Promise<{ id: string; name: string }> {
  const [created] = await database
    .insert(funnelSources)
    .values({ guildId, name })
    .onConflictDoUpdate({
      target: [funnelSources.guildId, funnelSources.name],
      set: { name },
    })
    .returning({ id: funnelSources.id, name: funnelSources.name })

  return created!
}

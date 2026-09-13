import 'server-only'

import { and, asc, eq, gte } from 'drizzle-orm'
import { events, type Event } from '@gict/db'
import { db } from './db'

export type { Event }

/**
 * Runs a query, or gives up and returns a fallback.
 *
 * The homepage is mostly static content that has nothing to do with the database.
 * If Postgres is down, the What's On section should say so while the rest of the
 * page carries on — losing the whole homepage because one section cannot load is
 * a much worse outage than the one actually happening.
 */
async function orEmpty<T>(query: () => Promise<T[]>): Promise<T[]> {
  try {
    return await query()
  } catch (error) {
    console.error('Event query failed; rendering the empty state instead:', error)
    return []
  }
}

/**
 * Events starting from now, soonest first.
 *
 * Only `published` rows. Drafts are invisible so a half-written event can sit in
 * the database without going live, which is what makes Drizzle Studio a safe way
 * for the committee to add one.
 */
export async function getUpcomingEvents(limit = 3): Promise<Event[]> {
  return orEmpty(() =>
    db()
      .select()
      .from(events)
      .where(and(eq(events.status, 'published'), gte(events.startsAt, new Date())))
      .orderBy(asc(events.startsAt))
      .limit(limit),
  )
}

/**
 * One event by slug, including cancelled ones.
 *
 * Cancelled events still resolve rather than 404ing: the link is already in
 * Discord, and a page saying it is off is more use than a dead end. Drafts stay
 * hidden.
 */
export async function getEventBySlug(slug: string): Promise<Event | undefined> {
  const [event] = await db().select().from(events).where(eq(events.slug, slug)).limit(1)

  return event?.status === 'draft' ? undefined : event
}

/** Published events, for the calendar page and the sitemap. */
export async function getPublishedEvents(): Promise<Event[]> {
  return orEmpty(() =>
    db().select().from(events).where(eq(events.status, 'published')).orderBy(asc(events.startsAt)),
  )
}

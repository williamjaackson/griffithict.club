import 'server-only'

import { and, asc, eq, gte, isNull, lte, ne, or, type SQL } from 'drizzle-orm'
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
 * An event is on the site once it is published and its reveal time has passed.
 *
 * Two separate ideas. `status` is whether it is finished: a draft is still being
 * written. `publishAt` is when a finished event should appear, which lets a run of
 * events be queued and revealed one at a time. Null means show it now.
 */
function revealed(now: Date): SQL | undefined {
  return or(isNull(events.publishAt), lte(events.publishAt, now))
}

/**
 * Events starting from now, soonest first.
 *
 * Drafts and events still waiting on their reveal time are invisible, which is
 * what makes it safe for the committee to queue a month of socials in advance.
 */
export async function getUpcomingEvents(limit = 3): Promise<Event[]> {
  const now = new Date()
  return orEmpty(() =>
    db()
      .select()
      .from(events)
      .where(and(eq(events.status, 'published'), revealed(now), gte(events.startsAt, now)))
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
  const [event] = await db()
    .select()
    .from(events)
    .where(and(eq(events.slug, slug), ne(events.status, 'draft'), revealed(new Date())))
    .limit(1)

  return event
}

/** Published events, for the calendar page and the sitemap. */
export async function getPublishedEvents(): Promise<Event[]> {
  return orEmpty(() =>
    db()
      .select()
      .from(events)
      .where(and(eq(events.status, 'published'), revealed(new Date())))
      .orderBy(asc(events.startsAt)),
  )
}

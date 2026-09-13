import { connection } from 'next/server'
import { cache } from 'react'
import { links } from '@/content'
import { shortWhen } from '@/lib/datetime'
import { getUpcomingEvents } from '@/lib/events'
import { ButtonLink } from '@/components/ui/button'
import { Eyebrow } from '@/components/ui/section'
import { EventList } from './event-list'

/**
 * Deduped within a single render, so the hero's "Next up" card and the What's On
 * list below it share one query rather than issuing two.
 */
const upcoming = cache(() => getUpcomingEvents(3))

/*
 * `await connection()` marks everything below it as request-time work. Without it
 * Next tries to prerender these during `next build`, which runs in CI where there
 * is no database. Both sit behind Suspense so the rest of the page still
 * prerenders as static HTML.
 */

export async function NextEventCard() {
  await connection()
  const [event] = await upcoming()
  if (!event) return null

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-[14px] self-end rounded-[clamp(18px,2.2vw,28px)] bg-white p-[clamp(16px,1.8vw,22px)]">
      <div className="flex min-w-0 flex-col gap-1">
        <Eyebrow>Next up · {shortWhen(event.startsAt)}</Eyebrow>
        <span className="text-[clamp(17px,1.6vw,22px)] leading-[1.15] font-bold tracking-[-0.02em] [font-stretch:106%]">
          {event.title}
        </span>
      </div>
      <ButtonLink href="/#whats-on" variant="ink" size="sm" className="flex-none">
        See all
      </ButtonLink>
    </div>
  )
}

export async function UpcomingEvents() {
  await connection()
  const events = await upcoming()

  if (events.length === 0) return <NothingScheduled />

  return <EventList events={events} discordUrl={links.discord} />
}

export function NothingScheduled() {
  return (
    <p className="text-muted m-0 text-[clamp(15px,1.3vw,17px)]">
      Nothing scheduled right now. The Discord is where things get announced first.
    </p>
  )
}

/** Holds the row height while the query runs, so the section does not jump. */
export function UpcomingEventsFallback() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[72px] animate-pulse rounded-[18px] bg-white/50" />
      ))}
    </div>
  )
}

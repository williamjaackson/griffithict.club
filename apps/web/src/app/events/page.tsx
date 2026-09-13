import { Suspense } from 'react'
import { connection } from 'next/server'
import type { Metadata } from 'next'
import { EventRow } from '@/components/home/event-row'
import { getPublishedEvents } from '@/lib/events'

export const metadata: Metadata = {
  title: 'What&rsquo;s on',
  description: 'Every upcoming Griffith ICT Club event.',
}

export default function EventsPage() {
  return (
    <main className="px-[clamp(24px,5.5vw,88px)] pt-[clamp(40px,5vw,72px)] pb-[clamp(52px,7vw,90px)]">
      <h1 className="m-0 pb-[clamp(20px,2.5vw,30px)] text-[clamp(12px,1.3vw,14px)] font-bold tracking-[0.2em] uppercase">
        What&rsquo;s on
      </h1>
      <Suspense fallback={<EventListFallback />}>
        <EventList />
      </Suspense>
    </main>
  )
}

async function EventList() {
  await connection()
  const now = new Date()
  const all = await getPublishedEvents()
  const upcoming = all.filter((event) => event.startsAt >= now)
  const past = all.filter((event) => event.startsAt < now).reverse()

  return (
    <>
      {upcoming.length > 0 ? (
        upcoming.map((event) => <EventRow key={event.id} event={event} />)
      ) : (
        <p className="text-muted m-0 text-[clamp(15px,1.3vw,17px)]">
          Nothing scheduled right now. The Discord is where things get announced first.
        </p>
      )}

      {past.length > 0 && (
        <>
          <h2 className="text-muted m-0 pt-[clamp(36px,4vw,56px)] pb-[clamp(12px,1.5vw,20px)] text-[clamp(12px,1.3vw,14px)] font-bold tracking-[0.2em] uppercase">
            Past events
          </h2>
          <div className="opacity-60">
            {past.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        </>
      )}
    </>
  )
}

function EventListFallback() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="bg-surface h-[72px] animate-pulse rounded-[18px]" />
      ))}
    </div>
  )
}

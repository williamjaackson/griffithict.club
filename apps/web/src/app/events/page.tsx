import { Suspense } from 'react'
import { connection } from 'next/server'
import type { Metadata } from 'next'
import { links, site } from '@/content'
import { getPublishedEvents } from '@/lib/events'
import { EventJsonLd } from '@/components/events/event-body'
import { EventList } from '@/components/events/event-list'
import { NothingScheduled, UpcomingEventsFallback } from '@/components/events/upcoming'
import { Section, SectionHeading } from '@/components/ui/section'

export const metadata: Metadata = {
  title: 'What’s on',
  description: 'Every upcoming Griffith ICT Club event.',
}

export default function EventsPage() {
  return (
    <Section className="pt-[clamp(40px,5vw,72px)] pb-[clamp(52px,7vw,90px)]">
      <SectionHeading as="h1" className="pb-[clamp(20px,2.5vw,30px)]">
        What&rsquo;s on
      </SectionHeading>
      <Suspense fallback={<UpcomingEventsFallback />}>
        <EventLists />
      </Suspense>
    </Section>
  )
}

async function EventLists() {
  await connection()
  const now = new Date()
  const all = await getPublishedEvents()
  const upcoming = all.filter((event) => event.startsAt >= now)
  const past = all.filter((event) => event.startsAt < now).reverse()

  return (
    <>
      {upcoming.map((event) => (
        <EventJsonLd key={event.id} event={event} siteUrl={site.url} />
      ))}

      {upcoming.length > 0 ? (
        <EventList events={upcoming} discordUrl={links.discord} />
      ) : (
        <NothingScheduled />
      )}

      {past.length > 0 && (
        <>
          <SectionHeading muted className="pt-[clamp(36px,4vw,56px)] pb-[clamp(12px,1.5vw,20px)]">
            Past events
          </SectionHeading>
          <EventList events={past} discordUrl={links.discord} dimmed />
        </>
      )}
    </>
  )
}

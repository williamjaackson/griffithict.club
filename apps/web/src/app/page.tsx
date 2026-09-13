import { Suspense } from 'react'
import { eventTypes, joinSteps, links, site, sponsors } from '@/content'
import { NextEventCard, UpcomingEvents, UpcomingEventsFallback } from '@/components/events/upcoming'
import { CommitteeSection } from '@/components/committee/committee-section'
import { currentCommittee } from '@/lib/clock'
import { CtaBanner } from '@/components/home/cta-banner'
import { Hero } from '@/components/home/hero'
import { JoinSteps } from '@/components/home/join-steps'
import { SponsorStrip } from '@/components/home/sponsor-strip'
import { WhatsOn } from '@/components/home/whats-on'

/*
 * The page shell is static. Only the two event slots read the database, and both
 * sit behind Suspense so they are deferred to request time — which is what keeps
 * `next build` working in CI, where there is no Postgres.
 */
export default async function HomePage() {
  const committee = await currentCommittee()

  return (
    <main>
      <Hero
        site={site}
        links={links}
        nextEventSlot={
          <Suspense fallback={null}>
            <NextEventCard />
          </Suspense>
        }
      />
      <SponsorStrip sponsors={sponsors} />
      <WhatsOn
        eventTypes={eventTypes}
        eventsSlot={
          <Suspense fallback={<UpcomingEventsFallback />}>
            <UpcomingEvents />
          </Suspense>
        }
      />
      <JoinSteps steps={joinSteps} links={links} />
      <CommitteeSection roles={committee} />
      <CtaBanner links={links} />
    </main>
  )
}

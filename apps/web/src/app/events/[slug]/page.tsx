import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { EventDetail, EventJsonLd } from '@/components/events/event-detail'
import { links, site } from '@/content'
import { getEventBySlug } from '@/lib/events'
import { longWhen } from '@/lib/datetime'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  if (!event) return {}

  const description = event.summary ?? `${longWhen(event.startsAt)}. ${site.name}.`

  return {
    title: event.title,
    description,
    openGraph: {
      title: event.title,
      description,
      type: 'article',
      url: `${site.url}/events/${event.slug}`,
    },
  }
}

/**
 * The full page for an event.
 *
 * Also rendered as a modal over the homepage via the intercepting route in
 * `app/@modal`. Opening the link cold lands here; clicking it from a list opens
 * the modal with this same URL, which is what makes an event link worth pasting
 * into Discord.
 */
export default function EventPage({ params }: Props) {
  return (
    <main className="mx-auto flex max-w-[720px] flex-col gap-[22px] px-[clamp(24px,5.5vw,88px)] pt-[clamp(40px,5vw,72px)] pb-[clamp(52px,7vw,90px)]">
      <Suspense fallback={<EventFallback />}>
        <EventBody params={params} />
      </Suspense>
    </main>
  )
}

// `params` is awaited inside the boundary, not above it: awaiting it is itself a
// dynamic access, and doing it in the page body stops the shell prerendering.
async function EventBody({ params }: Props) {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  if (!event) notFound()

  return (
    <>
      <EventJsonLd event={event} siteUrl={site.url} />
      <EventDetail event={event} discordUrl={links.discord} />
    </>
  )
}

function EventFallback() {
  return (
    <div className="flex flex-col gap-[22px]" aria-hidden="true">
      <div className="bg-surface h-[68px] animate-pulse rounded-[15px]" />
      <div className="bg-surface h-[120px] animate-pulse rounded-[18px]" />
    </div>
  )
}

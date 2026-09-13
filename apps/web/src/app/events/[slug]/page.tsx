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
  if (!event) return { title: 'Event not found', robots: { index: false, follow: false } }

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
/*
 * Blocking rather than streamed, so notFound() produces a real 404.
 *
 * With a Suspense boundary the shell is sent first and the status is already 200
 * by the time the lookup fails, which turns a typo'd event URL into a soft 404 that
 * a crawler will happily index. The only thing given up is prerendering the header
 * and footer on a page that has to wait for a database round trip regardless.
 */
export const instant = false

export default async function EventPage({ params }: Props) {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  if (!event) notFound()

  return (
    <main className="mx-auto flex max-w-[720px] flex-col gap-[22px] px-[clamp(24px,5.5vw,88px)] pt-[clamp(40px,5vw,72px)] pb-[clamp(52px,7vw,90px)]">
      <EventJsonLd event={event} siteUrl={site.url} />
      <EventDetail event={event} discordUrl={links.discord} />
    </main>
  )
}

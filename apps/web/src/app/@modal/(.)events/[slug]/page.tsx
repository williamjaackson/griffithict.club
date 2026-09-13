import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { EventModal } from '@/components/events/event-modal'
import { links } from '@/content'
import { getEventBySlug } from '@/lib/events'

type Props = { params: Promise<{ slug: string }> }

/**
 * Intercepts `/events/[slug]` when it is reached from within the app, so clicking
 * an event opens a modal over the page you were on. A cold load or a refresh falls
 * through to the real page at `app/events/[slug]`.
 *
 * `params` is passed down rather than awaited here: awaiting it is itself a
 * dynamic access, and doing it above the Suspense boundary would stop the page
 * underneath from prerendering.
 */
export default function EventModalPage({ params }: Props) {
  // No fallback. A modal that flashes an empty shell is worse than one that
  // appears a moment later.
  return (
    <Suspense fallback={null}>
      <ModalContent params={params} />
    </Suspense>
  )
}

async function ModalContent({ params }: Props) {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  if (!event) notFound()

  return <EventModal event={event} discordUrl={links.discord} />
}

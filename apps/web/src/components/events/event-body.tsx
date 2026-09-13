import type { Event } from '@/lib/events'
import { isoDate, longWhen } from '@/lib/datetime'
import { ButtonLink } from '@/components/ui/button'
import { Eyebrow } from '@/components/ui/section'

/** Everything below an event's title in its dialog. */
export function EventBody({ event, discordUrl }: { event: Event; discordUrl: string }) {
  return (
    <>
      {event.status === 'cancelled' && (
        <p
          role="status"
          className="bg-brand m-0 rounded-2xl px-5 py-4 text-[15px] font-bold text-white"
        >
          This event has been cancelled.
        </p>
      )}

      <dl className="m-0 flex flex-col gap-2 text-[clamp(15px,1.3vw,17px)]">
        <div className="flex gap-2">
          <dt className="text-muted">When</dt>
          <dd className="text-ink m-0 font-semibold">{longWhen(event.startsAt)}</dd>
        </div>
        {event.location && (
          <div className="flex gap-2">
            <dt className="text-muted">Where</dt>
            <dd className="text-ink m-0 font-semibold">{event.location}</dd>
          </div>
        )}
      </dl>

      {event.description && (
        <p className="text-body m-0 text-[clamp(16px,1.4vw,18px)] leading-[1.6] text-pretty whitespace-pre-line">
          {event.description}
        </p>
      )}

      <div className="bg-surface flex flex-col gap-1.5 rounded-[18px] px-5 py-[18px]">
        <Eyebrow>Registration</Eyebrow>
        <span className="text-ink text-[clamp(15px,1.3vw,17px)] leading-[1.5] font-medium">
          Sign-ups and tickets for every event are handled in the Discord.
        </span>
      </div>

      <ButtonLink href={event.registrationUrl ?? discordUrl} fullWidth>
        {event.registrationUrl ? 'Register' : 'Join the Discord'}
      </ButtonLink>
    </>
  )
}

/** Schema.org markup, so events can surface in Google's event results. */
export function EventJsonLd({ event, siteUrl }: { event: Event; siteUrl: string }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: isoDate(event.startsAt),
    ...(event.endsAt && { endDate: isoDate(event.endsAt) }),
    eventStatus:
      event.status === 'cancelled'
        ? 'https://schema.org/EventCancelled'
        : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    ...(event.location && { location: { '@type': 'Place', name: event.location } }),
    ...(event.description && { description: event.description }),
    url: `${siteUrl}/events`,
    organizer: { '@type': 'Organization', name: 'Griffith ICT Club', url: siteUrl },
  }

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  )
}

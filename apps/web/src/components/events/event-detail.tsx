import type { Event } from '@/lib/events'
import { chipDay, chipMonth, eventMeta, isoDate, longWhen } from '@/lib/datetime'

/** Shared by the event page and the modal that intercepts it, so they cannot drift. */
export function EventDetail({ event, discordUrl }: { event: Event; discordUrl: string }) {
  return (
    <>
      <div className="flex min-w-0 items-center gap-4">
        <time
          dateTime={isoDate(event.startsAt)}
          className="bg-surface w-[68px] flex-none overflow-hidden rounded-[15px]"
        >
          <span className="bg-brand block py-1 text-center text-[10px] font-extrabold tracking-[0.14em] text-white uppercase">
            {chipMonth(event.startsAt)}
          </span>
          <span className="text-ink block pt-[5px] pb-2 text-center text-[26px] leading-none font-extrabold tracking-[-0.03em] [font-stretch:108%]">
            {chipDay(event.startsAt)}
          </span>
        </time>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="m-0 text-[clamp(22px,2.4vw,30px)] leading-[1.08] font-extrabold tracking-[-0.028em] [font-stretch:110%]">
            {event.title}
          </h1>
          <span className="text-muted text-[13px] font-semibold tracking-[0.04em]">
            {event.summary ?? eventMeta(event.startsAt)}
          </span>
        </div>
      </div>

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
        <span className="text-brand text-[11px] font-bold tracking-[0.16em] uppercase">
          Registration
        </span>
        <span className="text-ink text-[clamp(15px,1.3vw,17px)] leading-[1.5] font-medium">
          Sign-ups and tickets for every event are handled in the Discord.
        </span>
      </div>

      <a
        href={event.registrationUrl ?? discordUrl}
        className="bg-brand hover:bg-ink inline-flex min-h-[60px] items-center justify-center rounded-2xl px-7 text-[clamp(17px,1.5vw,19px)] font-bold text-white"
      >
        {event.registrationUrl ? 'Register' : 'Join the Discord'}
      </a>
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
    url: `${siteUrl}/events/${event.slug}`,
    organizer: { '@type': 'Organization', name: 'Griffith ICT Club', url: siteUrl },
  }

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  )
}

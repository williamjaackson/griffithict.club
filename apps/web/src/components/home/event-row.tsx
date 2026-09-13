import Link from 'next/link'
import type { Event } from '@/lib/events'
import { eventMeta } from '@/lib/datetime'
import { EventDateChip } from '@/components/events/event-date-chip'

/**
 * One event in a list.
 *
 * The whole row is a single link to `/events/[slug]`. The mockup nested a button
 * with its own click handler inside a clickable div, which gives you two
 * overlapping targets and nothing a keyboard can reach. The chevron here is
 * decoration on the same link.
 */
export function EventRow({ event }: { event: Event }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className="group wide:mx-[clamp(-12px,-1.4vw,-18px)] wide:flex-wrap wide:gap-[clamp(12px,2vw,32px)] wide:px-[clamp(12px,1.4vw,18px)] wide:py-[clamp(16px,1.8vw,22px)] flex flex-nowrap items-center gap-3 rounded-[18px] py-[14px] hover:bg-white/60"
    >
      <EventDateChip date={event.startsAt} />

      <div className="wide:flex-[1_1_240px] flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="wide:text-[clamp(21px,2.3vw,31px)] wide:leading-[1.1] m-0 text-[17px] leading-[1.15] font-bold tracking-[-0.02em] [font-stretch:108%]">
          {event.title}
        </h3>
        <span className="text-muted text-[13px] font-semibold tracking-[0.04em]">
          {eventMeta(event.startsAt)}
        </span>
      </div>

      <span
        aria-hidden="true"
        className="bg-brand group-hover:bg-ink wide:size-12 wide:rounded-[14px] inline-flex size-11 flex-none items-center justify-center rounded-[13px] text-white"
      >
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="block">
          <circle cx="8" cy="8" r="6.6" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 7.1v4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="8" cy="4.7" r="1" fill="currentColor" />
        </svg>
      </span>
    </Link>
  )
}

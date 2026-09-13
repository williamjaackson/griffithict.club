'use client'

import type { Event } from '@/lib/events'
import { eventMeta } from '@/lib/datetime'
import { EventDateChip } from './event-date-chip'

/**
 * One event in a list.
 *
 * A single button covering the whole row. The mockup nested a second clickable
 * element inside a clickable div, which gives two overlapping targets and nothing
 * a keyboard can reach. The chevron is decoration on the same control.
 */
export function EventRow({ event, onOpen }: { event: Event; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group wide:gap-[clamp(12px,2vw,32px)] flex w-full cursor-pointer items-center gap-3 rounded-[18px] border-none bg-transparent p-[var(--row-inset)] text-left hover:bg-white/60"
    >
      <EventDateChip date={event.startsAt} />

      <span className="wide:flex-[1_1_240px] flex min-w-0 flex-1 flex-col gap-1">
        <span className="wide:text-[clamp(21px,2.3vw,31px)] wide:leading-[1.1] text-[17px] leading-[1.15] font-bold tracking-[-0.02em] [font-stretch:108%]">
          {event.title}
        </span>
        <span className="text-muted text-[13px] font-semibold tracking-[0.04em]">
          {eventMeta(event.startsAt)}
        </span>
      </span>

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
    </button>
  )
}

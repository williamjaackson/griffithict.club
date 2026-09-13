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

      {/*
        Decoration, not a control: the whole row is the button, and its accessible
        name is already the event. Aria-hidden keeps a screen reader from reading
        "Learn more" after the title it has just announced.

        Width is the only thing that changes across the breakpoint, so height and
        radius are never declared twice for the same viewport.
      */}
      <span
        aria-hidden="true"
        className="bg-brand group-hover:bg-ink wide:w-auto wide:rounded-[11px] wide:px-[18px] wide:text-[13px] wide:font-bold inline-flex h-11 w-11 flex-none items-center justify-center rounded-[13px] whitespace-nowrap text-white"
      >
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="wide:hidden block">
          <circle cx="8" cy="8" r="6.6" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 7.1v4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="8" cy="4.7" r="1" fill="currentColor" />
        </svg>
        <span className="wide:block hidden">Learn more</span>
      </span>
    </button>
  )
}

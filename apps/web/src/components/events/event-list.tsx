'use client'

import { useState } from 'react'
import type { Event } from '@/lib/events'
import { Dialog, DialogTitle } from '@/components/ui/dialog'
import { eventMeta } from '@/lib/datetime'
import { EventBody } from './event-body'
import { EventDateChip } from './event-date-chip'
import { EventRow } from './event-row'

/**
 * A list of events, each opening into a dialog.
 *
 * Events have no page of their own, so the dialog is the only place their detail
 * is rendered and the open one lives here rather than in a route.
 */
export function EventList({
  events,
  discordUrl,
  dimmed,
}: {
  events: Event[]
  discordUrl: string
  /** Past events, shown quieter than what is coming up. */
  dimmed?: boolean
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const active = openIndex === null ? null : events[openIndex]

  return (
    /*
      The hover surface reaches past the text on every side, so the list is pulled
      out by one inset and each row pads itself back in by the same amount. The
      rows then need no width or margin of their own, and the two values cannot
      drift apart.
    */
    <div
      className={`-mx-[var(--row-inset)] [--row-inset:clamp(12px,1.4vw,18px)] ${dimmed ? 'opacity-60' : ''}`}
    >
      {events.map((event, index) => (
        <EventRow key={event.id} event={event} onOpen={() => setOpenIndex(index)} />
      ))}

      <Dialog
        open={openIndex !== null}
        onOpenChange={(open) => !open && setOpenIndex(null)}
        label={active?.title ?? 'Event'}
        header={
          active && (
            <>
              <EventDateChip date={active.startsAt} size="detail" />
              <div className="flex min-w-0 flex-col gap-1">
                <DialogTitle className="m-0 text-[clamp(22px,2.4vw,30px)] leading-[1.08] font-extrabold tracking-[-0.028em] [font-stretch:110%]">
                  {active.title}
                </DialogTitle>
                <span className="text-muted text-[13px] font-semibold tracking-[0.04em]">
                  {eventMeta(active.startsAt)}
                </span>
              </div>
            </>
          )
        }
      >
        {active && <EventBody event={active} discordUrl={discordUrl} />}
      </Dialog>
    </div>
  )
}

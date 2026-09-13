import type { ReactNode } from 'react'
import type { EventType } from '@/content/schema'
import { Section, SectionHeading } from '@/components/ui/section'

export function WhatsOn({
  eventTypes,
  eventsSlot,
}: {
  eventTypes: EventType[]
  /** The upcoming event list. A slot, because it reads the database. */
  eventsSlot: ReactNode
}) {
  return (
    <Section
      id="whats-on"
      surface
      className="mt-[clamp(40px,5vw,72px)] pt-[clamp(52px,7vw,90px)] pb-[clamp(44px,6vw,80px)]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-6 pb-[18px]">
        <SectionHeading>What&rsquo;s on</SectionHeading>
      </div>

      <div className="wide:grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] wide:gap-[clamp(22px,3vw,44px)] wide:pt-[clamp(8px,1vw,14px)] wide:pb-[clamp(34px,4vw,54px)] grid grid-cols-2 gap-x-4 gap-y-5 pt-[6px] pb-[30px]">
        {eventTypes.map((type) => (
          <div key={type.title} className="flex min-w-0 flex-col gap-2">
            <h3 className="wide:text-[clamp(22px,2.2vw,30px)] wide:leading-[1.05] m-0 text-[19px] leading-[1.08] font-extrabold tracking-[-0.028em] [font-stretch:112%]">
              {type.title}
            </h3>
            <p className="text-body wide:text-[clamp(15px,1.3vw,17px)] wide:leading-[1.55] m-0 text-sm leading-[1.5] text-pretty">
              {type.body}
            </p>
          </div>
        ))}
      </div>

      {eventsSlot}
    </Section>
  )
}

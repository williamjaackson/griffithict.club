'use client'

import type { Sponsor } from '@/content/schema'
import { useSponsorship } from '@/components/sponsorship/sponsorship-context'
import { Button } from '@/components/ui/button'
import { Section } from '@/components/ui/section'

export function SponsorStrip({ sponsors }: { sponsors: Sponsor[] }) {
  const { setOpen } = useSponsorship()

  return (
    <Section
      id="sponsors"
      className="flex flex-wrap items-center gap-[clamp(20px,3vw,48px)] py-[clamp(26px,3vw,40px)]"
    >
      {/*
        A left-aligned row, not a grid. auto-fit columns spread three logos across
        the full width with gaps that grow as sponsors are added or removed, so
        the strip never sits still. Flex keeps them together against the same
        gutter as every other section.
      */}
      <div className="wide:flex-nowrap wide:gap-[clamp(20px,2.5vw,40px)] flex flex-1 flex-wrap items-center gap-[clamp(16px,3vw,28px)]">
        {sponsors.map((sponsor) => (
          <a
            key={sponsor.name}
            href={sponsor.url}
            className="flex h-[58px] min-w-0 items-center justify-center overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sponsor.logo}
              alt={sponsor.name}
              className="block h-[58px] w-auto max-w-none"
            />
          </a>
        ))}
        <Button
          onClick={() => setOpen(true)}
          variant="ink"
          className="wide:ml-auto wide:w-auto w-full flex-none"
        >
          Sponsor us
        </Button>
      </div>
    </Section>
  )
}

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
      <div className="wide:flex-[1_1_420px] wide:grid-cols-[repeat(auto-fit,minmax(300px,1fr))] wide:gap-[clamp(14px,2.5vw,32px)] grid flex-[1_1_100%] grid-cols-1 items-center justify-items-center gap-[18px]">
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
          className="wide:col-span-1 wide:w-auto col-span-full w-full"
        >
          Sponsor us
        </Button>
      </div>
    </Section>
  )
}

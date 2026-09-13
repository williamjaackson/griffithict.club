'use client'

import type { Sponsor } from '@/content/schema'
import { useSponsorship } from '@/components/sponsorship/sponsorship-context'

export function SponsorStrip({ sponsors }: { sponsors: Sponsor[] }) {
  const { setOpen } = useSponsorship()

  return (
    <section
      id="sponsors"
      className="flex flex-wrap items-center gap-[clamp(20px,3vw,48px)] px-[clamp(24px,5.5vw,88px)] py-[clamp(26px,3vw,40px)]"
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
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="bg-ink hover:bg-brand wide:col-span-1 wide:h-[58px] wide:w-auto wide:text-sm col-span-full inline-flex h-[54px] w-full cursor-pointer items-center justify-center rounded-[15px] border-none px-[22px] font-[inherit] text-[15px] font-bold tracking-[0.02em] whitespace-nowrap text-white"
        >
          Sponsor us
        </button>
      </div>
    </section>
  )
}

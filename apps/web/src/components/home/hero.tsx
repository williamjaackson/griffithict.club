import type { ReactNode } from 'react'
import type { Links, Site } from '@/content/schema'
import { splitHighlight } from '@/lib/headline'
import { ButtonLink } from '@/components/ui/button'
import { Section } from '@/components/ui/section'
import { HeroMedia } from './hero-media'

export function Hero({
  site,
  links,
  nextEventSlot,
}: {
  site: Site
  links: Links
  /** The "Next up" card. A slot, because it reads the database and the rest of this does not. */
  nextEventSlot: ReactNode
}) {
  return (
    <Section
      id="top"
      className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] items-start gap-[clamp(34px,4vw,72px)] pt-[clamp(44px,4.5vw,72px)] pb-[clamp(56px,5vw,80px)]"
    >
      <div className="flex min-w-0 flex-col gap-[clamp(26px,2vw,30px)]">
        <div className="text-brand flex items-center gap-[14px] text-[clamp(10px,1vw,12px)] font-bold tracking-[0.2em] uppercase">
          <span>{site.eyebrow}</span>
          <span className="animate-rule bg-brand h-px min-w-4 flex-1 origin-left" />
        </div>

        <h1 className="animate-rise m-0 text-[clamp(35px,4.6vw,66px)] leading-[1.04] font-extrabold tracking-[-0.035em] text-balance [font-stretch:112%]">
          {site.headline.lines.map((line) => {
            const parts = splitHighlight(line, site.headline.highlight)
            return (
              <span key={line} className="block">
                {parts ? (
                  <>
                    {parts.before}
                    <span className="text-brand">{parts.match}</span>
                    {parts.after}
                  </>
                ) : (
                  line
                )}
              </span>
            )
          })}
        </h1>

        <p className="text-body m-0 max-w-[52ch] text-[clamp(16.5px,1.35vw,19px)] leading-[1.65] text-pretty">
          {site.description}
        </p>

        {/*
          The column stretches its children, so full width on a phone is the
          default and the only thing worth saying is where it stops growing.
        */}
        <ButtonLink href={links.discord} size="lg" className="wide:max-w-[340px]">
          Join the Discord
        </ButtonLink>
      </div>

      <HeroMedia>{nextEventSlot}</HeroMedia>
    </Section>
  )
}

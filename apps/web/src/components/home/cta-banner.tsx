import type { Links } from '@/content/schema'
import { brandLogo } from '@/lib/brand'
import { LOGOS } from '@/lib/logos'
import { ButtonLink } from '@/components/ui/button'
import { Section } from '@/components/ui/section'

/*
 * No top margin. The contact band above it is surfaced and runs straight into
 * this one, so a gap here would show as a white stripe between the two.
 */
export function CtaBanner({ links }: { links: Links }) {
  return (
    <Section className="bg-brand py-[clamp(44px,6vw,84px)] text-white">
      <div className="wide:grid wide:grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] wide:items-center wide:gap-[clamp(28px,4vw,56px)] flex flex-col-reverse items-start gap-[26px]">
        <div className="flex flex-col items-start gap-[clamp(20px,2.5vw,30px)]">
          <h2 className="m-0 text-[clamp(34px,5.4vw,76px)] leading-[0.93] font-extrabold tracking-[-0.04em] text-balance [font-stretch:118%]">
            The next thing we run, you could be at.
          </h2>
          <ButtonLink href={links.discord} variant="onBrand" size="xl">
            Join the Discord
          </ButtonLink>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={brandLogo(LOGOS.ctaWatermark)}
          alt=""
          className="wide:w-[clamp(120px,20vw,210px)] wide:justify-self-end block w-[52px]"
        />
      </div>
    </Section>
  )
}

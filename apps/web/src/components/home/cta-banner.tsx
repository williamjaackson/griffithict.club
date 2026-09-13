'use client'

import type { Links } from '@/content/schema'
import { brandLogo } from '@/lib/brand'
import { LOGOS } from '@/lib/logos'
import { ButtonLink } from '@/components/ui/button'
import { useDialog } from '@/components/ui/dialog-state'
import { Section } from '@/components/ui/section'

/*
 * The page's closing call to action, and the only one it needs.
 *
 * Contact hangs off this rather than getting a band of its own. A second
 * heading-and-button block directly above this one read as a washed-out draft
 * of it, and the two were asking for the same thing anyway.
 */
export function CtaBanner({ links }: { links: Links }) {
  const { setOpen: setContactOpen } = useDialog('contact')

  return (
    <Section
      id="contact"
      className="bg-brand mt-[clamp(52px,7vw,96px)] py-[clamp(44px,6vw,84px)] text-white"
    >
      <div className="wide:grid wide:grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] wide:items-center wide:gap-[clamp(28px,4vw,56px)] flex flex-col-reverse items-start gap-[26px]">
        <div className="flex flex-col items-start gap-[clamp(20px,2.5vw,30px)]">
          <h2 className="m-0 text-[clamp(34px,5.4vw,76px)] leading-[0.93] font-extrabold tracking-[-0.04em] text-balance [font-stretch:118%]">
            The next thing we run, you could be at.
          </h2>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <ButtonLink href={links.discord} variant="onBrand" size="xl">
              Join the Discord
            </ButtonLink>
            <button
              type="button"
              onClick={() => setContactOpen(true)}
              className="cursor-pointer border-none bg-transparent p-0 text-left font-[inherit] text-[clamp(15px,1.4vw,17px)] font-bold text-white underline underline-offset-[6px] hover:opacity-70"
            >
              Or send us a message
            </button>
          </div>
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

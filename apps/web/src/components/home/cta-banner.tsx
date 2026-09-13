import type { Links } from '@/content/schema'
import { brandLogo } from '@/lib/brand'
import { LOGOS } from '@/lib/logos'
import { BUTTON } from '@/components/ui/button-styles'

export function CtaBanner({ links }: { links: Links }) {
  return (
    <section className="bg-brand mt-[clamp(52px,7vw,96px)] px-[clamp(24px,5.5vw,88px)] py-[clamp(44px,6vw,84px)] text-white">
      <div className="wide:grid wide:grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] wide:items-center wide:gap-[clamp(28px,4vw,56px)] flex flex-col-reverse items-start gap-[26px]">
        <div className="flex flex-col items-start gap-[clamp(20px,2.5vw,30px)]">
          <h2 className="m-0 text-[clamp(34px,5.4vw,76px)] leading-[0.93] font-extrabold tracking-[-0.04em] text-balance [font-stretch:118%]">
            The next thing we run, you could be at.
          </h2>
          <a
            href={links.discord}
            className={`${BUTTON.onBrand} inline-flex min-h-[66px] items-center justify-center gap-3 rounded-[18px] px-8 py-3 text-[clamp(18px,1.6vw,21px)] font-bold`}
          >
            Join the Discord
          </a>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={brandLogo(LOGOS.ctaWatermark)}
          alt=""
          className="wide:w-[clamp(120px,20vw,210px)] wide:justify-self-end block w-[52px]"
        />
      </div>
    </section>
  )
}

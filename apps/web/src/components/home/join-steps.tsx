import type { JoinStep, Links } from '@/content/schema'
import { BUTTON } from '@/components/ui/button-styles'

export function JoinSteps({ steps, links }: { steps: JoinStep[]; links: Links }) {
  return (
    <section id="join" className="px-[clamp(24px,5.5vw,88px)] pt-[clamp(52px,7vw,90px)]">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))]">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className="flex flex-col items-start gap-3 py-[clamp(28px,3vw,40px)] pr-[clamp(0px,2.4vw,44px)]"
          >
            <span className="text-brand text-[13px] font-bold tracking-[0.14em] uppercase">
              Step {index + 1}
            </span>
            <h3 className="m-0 text-[clamp(28px,3vw,40px)] leading-none font-extrabold tracking-[-0.03em] [font-stretch:112%]">
              {step.title}
            </h3>
            <p className="text-body m-0 max-w-[460px] text-[clamp(16px,1.4vw,18px)] leading-[1.55] text-pretty">
              {step.body}
            </p>
            <a
              href={links[step.link]}
              className={`${BUTTON.ink} mt-2 inline-flex min-h-[58px] items-center justify-center rounded-2xl px-[30px] text-[17px] font-bold whitespace-nowrap`}
            >
              {step.cta}
            </a>
          </div>
        ))}
      </div>
    </section>
  )
}

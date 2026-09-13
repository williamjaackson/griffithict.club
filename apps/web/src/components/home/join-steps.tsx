import type { JoinStep, Links } from '@/content/schema'
import { ButtonLink } from '@/components/ui/button'
import { Eyebrow, Section } from '@/components/ui/section'

export function JoinSteps({ steps, links }: { steps: JoinStep[]; links: Links }) {
  return (
    <Section id="join" className="pt-[clamp(52px,7vw,90px)]">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))]">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className="flex flex-col items-start gap-3 py-[clamp(28px,3vw,40px)] pr-[clamp(0px,2.4vw,44px)]"
          >
            <Eyebrow className="text-[13px] tracking-[0.14em]">Step {index + 1}</Eyebrow>
            <h3 className="m-0 text-[clamp(28px,3vw,40px)] leading-none font-extrabold tracking-[-0.03em] [font-stretch:112%]">
              {step.title}
            </h3>
            <p className="text-body m-0 max-w-[460px] text-[clamp(16px,1.4vw,18px)] leading-[1.55] text-pretty">
              {step.body}
            </p>
            <ButtonLink href={links[step.link]} variant="ink" className="mt-2 whitespace-nowrap">
              {step.cta}
            </ButtonLink>
          </div>
        ))}
      </div>
    </Section>
  )
}

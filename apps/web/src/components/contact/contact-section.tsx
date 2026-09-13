'use client'

import type { Contact } from '@/content/schema'
import { Button } from '@/components/ui/button'
import { useDialog } from '@/components/ui/dialog-state'
import { Section, SectionHeading } from '@/components/ui/section'

/**
 * The homepage's entry point into the contact dialog.
 *
 * Deliberately not surfaced. A grey band here would end against the red
 * call-to-action's top margin and read as a stray white stripe between the two.
 */
export function ContactSection({ contact }: { contact: Contact }) {
  const { setOpen: setContactOpen } = useDialog('contact')
  const { setOpen: setSponsorshipOpen } = useDialog('sponsorship')

  return (
    <Section id="contact" className="pt-[clamp(52px,7vw,90px)]">
      <div className="wide:grid wide:grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] wide:items-center wide:gap-[clamp(28px,4vw,56px)] flex flex-col gap-[clamp(20px,2.5vw,28px)]">
        <div className="flex flex-col items-start gap-[clamp(12px,1.6vw,18px)]">
          <SectionHeading>Contact</SectionHeading>
          <h3 className="m-0 text-[clamp(30px,4vw,54px)] leading-[0.98] font-extrabold tracking-[-0.035em] text-balance [font-stretch:114%]">
            {contact.heading}
          </h3>
          <p className="text-body m-0 max-w-[44ch] text-[clamp(16px,1.4vw,18px)] leading-[1.6] text-pretty">
            {contact.body}
          </p>
        </div>

        <div className="wide:items-end wide:justify-self-end flex flex-col items-start gap-[18px]">
          <Button
            size="lg"
            onClick={() => setContactOpen(true)}
            className="wide:w-auto w-full whitespace-nowrap"
          >
            Send us a message
          </Button>
          {/*
            The one enquiry this form is wrong for. Sending it here means someone
            has to forward it, so the other form is named rather than implied.
          */}
          <button
            type="button"
            onClick={() => setSponsorshipOpen(true)}
            className="text-muted hover:text-brand cursor-pointer border-none bg-transparent p-0 text-left font-[inherit] text-[15px] font-bold underline underline-offset-4"
          >
            Sponsoring us instead?
          </button>
        </div>
      </div>
    </Section>
  )
}

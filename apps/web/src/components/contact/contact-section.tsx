'use client'

import type { Contact } from '@/content/schema'
import { Button } from '@/components/ui/button'
import { useDialog } from '@/components/ui/dialog-state'
import { Section, SectionHeading } from '@/components/ui/section'

/**
 * The homepage's entry point into the contact dialog.
 *
 * Surfaced, and it meets the red call-to-action below it edge to edge. The two
 * bands reading as one block is the point: a white gap between them left this
 * looking like a stray stripe rather than a section.
 *
 * Everything is left-aligned and the heading stays well under the banner's. An
 * earlier pass hung the buttons off the right edge, which left a few hundred
 * pixels of empty grey in the middle and set this competing with the banner it
 * is meant to sit beneath.
 */
export function ContactSection({ contact }: { contact: Contact }) {
  const { setOpen: setContactOpen } = useDialog('contact')
  const { setOpen: setSponsorshipOpen } = useDialog('sponsorship')

  return (
    <Section id="contact" surface className="mt-[clamp(52px,7vw,90px)] py-[clamp(36px,4.5vw,60px)]">
      <div className="flex flex-col items-start gap-[clamp(12px,1.4vw,16px)]">
        <SectionHeading>Contact</SectionHeading>
        <h3 className="m-0 text-[clamp(28px,3.2vw,44px)] leading-[1.02] font-extrabold tracking-[-0.035em] text-balance [font-stretch:112%]">
          {contact.heading}
        </h3>
        <p className="text-body m-0 max-w-[52ch] text-[clamp(16px,1.4vw,18px)] leading-[1.6] text-pretty">
          {contact.body}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-7 gap-y-4">
          <Button onClick={() => setContactOpen(true)} className="whitespace-nowrap">
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

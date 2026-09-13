'use client'

import { useState, useTransition } from 'react'
import type { Contact } from '@/content/schema'
import { submitContactEnquiry } from '@/app/_actions/contact'
import { Button } from '@/components/ui/button'
import { Honeypot, SelectField, TextArea, TextField } from '@/components/ui/field'
import { Section, SectionHeading } from '@/components/ui/section'

export function ContactSection({ contact }: { contact: Contact }) {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await submitContactEnquiry(formData)
      if (result.ok) setSent(true)
      else setError(result.error)
    })
  }

  return (
    <Section id="contact" surface className="mt-[clamp(52px,7vw,90px)] py-[clamp(44px,6vw,80px)]">
      <div className="wide:grid wide:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] wide:gap-[clamp(36px,5vw,88px)] flex flex-col gap-[clamp(26px,3.5vw,40px)]">
        <div className="flex flex-col items-start gap-[clamp(14px,1.8vw,20px)]">
          <SectionHeading>Contact</SectionHeading>
          <h3 className="m-0 text-[clamp(30px,4vw,54px)] leading-[0.98] font-extrabold tracking-[-0.035em] text-balance [font-stretch:114%]">
            {contact.heading}
          </h3>
          <p className="text-body m-0 max-w-[42ch] text-[clamp(16px,1.4vw,18px)] leading-[1.6] text-pretty">
            {contact.body}
          </p>
        </div>

        {sent ? (
          <Confirmation onReset={() => setSent(false)} />
        ) : (
          <form action={handleSubmit} className="flex flex-col gap-[clamp(14px,1.8vw,20px)]">
            <SelectField
              name="topic"
              label="What's it about?"
              options={contact.topics}
              required
              defaultValue={contact.topics[0]}
            />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-[clamp(14px,1.8vw,20px)]">
              <TextField
                name="name"
                label="Your name"
                placeholder="Full name"
                maxLength={200}
                required
              />
              <TextField
                name="email"
                label="Email"
                type="email"
                placeholder="you@example.com"
                maxLength={320}
                required
              />
            </div>
            <TextArea
              name="message"
              label="Message"
              rows={5}
              maxLength={2000}
              placeholder="Tell us what you need."
              required
            />

            <Honeypot />

            {error && (
              <p role="alert" className="text-brand m-0 text-[15px]">
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4">
              <Button type="submit" disabled={pending} className="wide:w-auto w-full">
                {pending ? 'Sending…' : 'Send message'}
              </Button>
              {/*
                Says where it lands, so nobody has to wonder whether a form on a
                student club site goes anywhere.
              */}
              <p className="text-muted m-0 text-[14px] leading-[1.5]">
                Goes straight to the committee.
              </p>
            </div>
          </form>
        )}
      </div>
    </Section>
  )
}

function Confirmation({ onReset }: { onReset: () => void }) {
  return (
    <div className="border-edge flex flex-col items-start gap-[18px] rounded-[clamp(18px,2.2vw,26px)] border-2 bg-white p-[clamp(24px,3vw,36px)]">
      <span className="bg-brand inline-flex size-14 items-center justify-center rounded-[18px] text-white">
        <svg
          width="26"
          height="26"
          viewBox="0 0 16 16"
          aria-hidden="true"
          fill="none"
          className="block"
        >
          <path
            d="M2.5 8.5L6 12L13.5 4"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <h4 className="m-0 text-[clamp(24px,2.6vw,32px)] leading-[1.06] font-extrabold tracking-[-0.03em] [font-stretch:110%]">
        Message sent.
      </h4>
      <p className="text-body m-0 max-w-[46ch] text-[clamp(16px,1.4vw,18px)] leading-[1.6] text-pretty">
        The committee has it. Expect a reply to the email address you gave us.
      </p>
      <Button onClick={onReset} variant="ink">
        Send another
      </Button>
    </div>
  )
}

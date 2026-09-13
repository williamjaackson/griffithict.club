'use client'

import { useState, useTransition } from 'react'
import type { Contact } from '@/content/schema'
import { submitContactEnquiry } from '@/app/_actions/contact'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTitle } from '@/components/ui/dialog'
import { useDialog } from '@/components/ui/dialog-state'
import { Honeypot, SelectField, TextArea, TextField } from '@/components/ui/field'
import { Eyebrow } from '@/components/ui/section'

export function ContactDialog({ contact }: { contact: Contact }) {
  const { open, setOpen } = useDialog('contact')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      // Reset after the close animation, so the dialog does not visibly snap back
      // to a blank form on its way out.
      setTimeout(() => {
        setSent(false)
        setError(null)
      }, 200)
    }
  }

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await submitContactEnquiry(formData)
      if (result.ok) setSent(true)
      else setError(result.error)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      label="Contact the committee"
      header={
        <div className="flex min-w-0 flex-col gap-2">
          <Eyebrow className="text-xs">Contact</Eyebrow>
          <DialogTitle className="m-0 text-[clamp(24px,2.6vw,34px)] leading-[1.06] font-extrabold tracking-[-0.03em] [font-stretch:110%]">
            {contact.heading}
          </DialogTitle>
        </div>
      }
    >
      {sent ? (
        <Confirmation onDone={() => handleOpenChange(false)} />
      ) : (
        <form action={handleSubmit} className="flex flex-col gap-[clamp(14px,1.8vw,20px)]">
          <p className="text-body m-0 text-[clamp(15px,1.3vw,17px)] leading-[1.6] text-pretty">
            {contact.body}
          </p>

          <SelectField
            name="topic"
            label="What's it about?"
            options={contact.topics}
            required
            defaultValue={contact.topics[0]}
          />
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

          <div className="flex justify-end">
            <Button type="submit" disabled={pending} className="wide:w-auto w-full">
              {pending ? 'Sending…' : 'Send message'}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  )
}

function Confirmation({ onDone }: { onDone: () => void }) {
  return (
    <div className="flex flex-col items-start gap-[18px] pt-[clamp(16px,2vw,26px)] pb-[clamp(8px,1vw,14px)]">
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
      <Button onClick={onDone} variant="ink">
        Done
      </Button>
    </div>
  )
}

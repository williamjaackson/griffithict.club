'use client'

import { useState, useTransition } from 'react'
import type { Sponsorship } from '@/content/schema'
import { submitSponsorshipEnquiry } from '@/app/_actions/sponsorship'
import { Dialog, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Eyebrow } from '@/components/ui/section'
import { useSponsorship } from './sponsorship-context'

type Step = 'tier' | 'details' | 'done'

const FIELD =
  'border-edge focus:border-ink box-border min-h-[54px] w-full rounded-[14px] border-2 bg-white px-4 font-[inherit] text-base focus:outline-none'
const LABEL =
  'text-muted inline-flex items-center gap-[5px] text-xs font-bold tracking-[0.1em] uppercase'

export function SponsorshipDialog({
  tiers,
  benefits,
  periods,
}: {
  tiers: Sponsorship['tiers']
  benefits: Sponsorship['benefits']
  periods: string[]
}) {
  const { open, setOpen } = useSponsorship()
  const [step, setStep] = useState<Step>('tier')
  const [tierIndex, setTierIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const chosen = tierIndex === null ? null : tiers[tierIndex]

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      // Reset after the close animation so the dialog does not visibly jump back
      // to step one on its way out.
      setTimeout(() => {
        setStep('tier')
        setTierIndex(null)
        setError(null)
      }, 200)
    }
  }

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await submitSponsorshipEnquiry(formData)
      if (result.ok) setStep('done')
      else setError(result.error)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      label="Sponsorship"
      size="wide"
      header={
        <div className="flex min-w-0 flex-col gap-2">
          <Eyebrow className="text-xs">Sponsorship</Eyebrow>
          <DialogTitle className="m-0 text-[clamp(26px,3vw,40px)] leading-[1.02] font-extrabold tracking-[-0.035em] [font-stretch:112%]">
            Reach every tech student at Griffith.
          </DialogTitle>
        </div>
      }
    >
      {step === 'tier' && (
        <div className="flex flex-col gap-[clamp(20px,2.4vw,28px)]">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] items-start gap-[clamp(12px,1.6vw,18px)]">
            {tiers.map((tier, index) => (
              <TierCard
                key={tier.name}
                tier={tier}
                benefits={benefits.filter((b) => b.level <= index)}
                tiers={tiers}
                selected={tierIndex === index}
                onSelect={() => setTierIndex(index)}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-4">
            {/*
              A disabled button on its own says something is wrong without saying
              what. This names the one thing standing in the way, and disappears
              once it is done.
            */}
            {tierIndex === null && (
              <p className="text-muted m-0 mr-auto text-[15px]">Choose a tier to continue</p>
            )}
            <Button
              onClick={() => tierIndex !== null && setStep('details')}
              disabled={tierIndex === null}
              className="flex-none"
            >
              Contact Us
            </Button>
          </div>
        </div>
      )}

      {step === 'details' && chosen && (
        <form action={handleSubmit} className="flex flex-col gap-[clamp(20px,2.4vw,26px)]">
          <input type="hidden" name="tier" value={chosen.name} />

          <div className="bg-surface-faint flex flex-wrap items-center gap-3 rounded-2xl px-5 py-4">
            <span
              className="text-xs font-extrabold tracking-[0.18em] uppercase"
              style={{ color: chosen.accent }}
            >
              {chosen.name}
            </span>
            <span className="text-ink text-lg font-bold tracking-[-0.02em]">{chosen.price}</span>
            <button
              type="button"
              onClick={() => setStep('tier')}
              className="text-muted hover:bg-ink ml-auto min-h-11 cursor-pointer rounded-xl border-none bg-transparent px-4 font-[inherit] text-sm font-bold hover:text-white"
            >
              Change tier
            </button>
          </div>

          <fieldset className="flex flex-col gap-[9px] border-none p-0">
            <legend className={LABEL}>
              Sponsorship period{' '}
              <span className="text-brand" aria-hidden="true">
                *
              </span>
            </legend>
            {periods.map((period) => (
              <label
                key={period}
                className="border-edge flex min-h-[56px] cursor-pointer items-center gap-[13px] rounded-[14px] border-2 bg-white px-4"
              >
                <input
                  type="radio"
                  name="period"
                  value={period}
                  required
                  defaultChecked={periods.length === 1}
                  className="accent-brand m-0 size-[18px] flex-none"
                />
                <span className="text-ink text-base font-bold tracking-[-0.01em]">{period}</span>
                <span className="text-brand ml-auto text-xs font-bold tracking-[0.1em] uppercase">
                  Open
                </span>
              </label>
            ))}
          </fieldset>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-[clamp(14px,1.8vw,20px)]">
            <Field name="organisation" label="Organisation" placeholder="Company name" required />
            <Field name="contactName" label="Contact name" placeholder="Full name" required />
            <Field
              name="email"
              label="Email"
              type="email"
              placeholder="name@company.com"
              required
            />
            <Field name="phone" label="Phone" type="tel" placeholder="Optional" />
            <label className="col-span-full flex min-w-0 flex-col gap-[7px]">
              <span className={LABEL}>What are you hoping to get out of it?</span>
              <textarea
                name="message"
                rows={4}
                maxLength={2000}
                placeholder="Hiring graduates, brand awareness, running a workshop with us, anything we should know."
                className="border-edge focus:border-ink box-border w-full resize-y rounded-[14px] border-2 bg-white px-4 py-[14px] font-[inherit] text-base leading-[1.5] focus:outline-none"
              />
            </label>
          </div>

          {/* Honeypot. Hidden from people, irresistible to bots. */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute h-0 w-0 overflow-hidden opacity-0"
          />

          {error && (
            <p role="alert" className="text-brand m-0 text-[15px]">
              {error}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={pending} className="flex-none">
              {pending ? 'Sending…' : 'Express Interest'}
            </Button>
          </div>
        </form>
      )}

      {step === 'done' && (
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
            Interest registered.
          </h4>
          <p className="text-body m-0 max-w-[46ch] text-[clamp(16px,1.4vw,18px)] leading-[1.6] text-pretty">
            Thanks, the committee will review your interest in the {chosen?.name} package and come
            back to you.
          </p>
          <Button onClick={() => handleOpenChange(false)} variant="ink">
            Done
          </Button>
        </div>
      )}
    </Dialog>
  )
}

function Field({
  name,
  label,
  type = 'text',
  placeholder,
  required,
}: {
  name: string
  label: string
  type?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="flex min-w-0 flex-col gap-[7px]">
      <span className={LABEL}>
        {label}
        {required && (
          <span className="text-brand" aria-hidden="true">
            *
          </span>
        )}
      </span>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        maxLength={320}
        className={FIELD}
      />
    </label>
  )
}

function TierCard({
  tier,
  benefits,
  tiers,
  selected,
  onSelect,
}: {
  tier: Sponsorship['tiers'][number]
  benefits: Sponsorship['benefits']
  tiers: Sponsorship['tiers']
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`relative flex min-w-0 cursor-pointer flex-col gap-4 rounded-[clamp(18px,2.2vw,26px)] border-2 p-[clamp(20px,2.4vw,26px)] text-left transition-colors ${
        selected ? 'border-ink bg-white' : 'border-edge bg-surface-faint'
      }`}
    >
      <span
        className="absolute -top-[10px] -right-[10px] inline-flex size-[74px] -rotate-[10deg] items-center justify-center rounded-[26px] text-white"
        style={{ background: tier.accent, boxShadow: `0 10px 24px ${tier.tint}` }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
          className="block"
        >
          <path d={tier.mark} />
        </svg>
      </span>

      <div className="flex min-w-0 flex-col gap-[6px] pr-[68px]">
        <span
          className="flex items-center gap-[9px] text-xs font-extrabold tracking-[0.18em] uppercase"
          style={{ color: tier.accent }}
        >
          <span
            className="box-border size-4 flex-none rounded-full bg-white"
            style={{ border: selected ? '5px solid #111010' : '2px solid #C4BDB8' }}
          />
          {tier.name}
        </span>
        <span className="text-ink text-[clamp(28px,3.2vw,38px)] leading-none font-extrabold tracking-[-0.035em] [font-stretch:112%]">
          {tier.price}
        </span>
      </div>

      <div className="flex flex-col gap-[10px]">
        {benefits.map((benefit) => (
          <div key={benefit.label} className="flex items-start gap-[11px]">
            <span
              className="mt-px inline-flex size-[22px] flex-none items-center justify-center rounded-lg"
              style={{
                background: tiers[benefit.level]?.tint,
                color: tiers[benefit.level]?.accent,
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 16 16"
                aria-hidden="true"
                fill="none"
                className="block"
              >
                <path
                  d="M2.5 8.5L6 12L13.5 4"
                  stroke="currentColor"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="text-ink min-w-0 flex-1 text-[14.5px] leading-[1.5]">
              {benefit.label}
            </span>
          </div>
        ))}
      </div>
    </button>
  )
}

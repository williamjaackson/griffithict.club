'use client'

import { useState } from 'react'
import type { ResolvedRole, ResolvedTerm } from '@/lib/committee'
import { Dialog, DialogTitle } from '@/components/ui/dialog'
import { Eyebrow, Section, SectionHeading } from '@/components/ui/section'

export function CommitteeSection({ roles }: { roles: ResolvedRole[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const active = openIndex === null ? null : roles[openIndex]

  return (
    <Section id="team" className="pt-[clamp(52px,7vw,90px)]">
      <div className="flex flex-wrap items-baseline justify-between gap-6 pb-[clamp(20px,2.5vw,30px)]">
        <SectionHeading>Executive Committee</SectionHeading>
      </div>

      <div className="wide:grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] wide:gap-[clamp(18px,2.4vw,32px)] grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-x-3 gap-y-4">
        {roles.map((role, index) => (
          <button
            key={role.role}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="hover:bg-surface wide:-m-2.5 wide:gap-4 wide:rounded-[20px] wide:p-2.5 -m-2 flex min-w-0 cursor-pointer items-center gap-3 rounded-[18px] border-none bg-transparent p-2 text-left"
          >
            <Avatar
              person={role.holder}
              className="wide:size-[76px] wide:rounded-[22px] size-[52px] flex-none rounded-2xl"
            />
            <span className="flex min-w-0 flex-col gap-[3px]">
              <span className="wide:text-[clamp(17px,1.5vw,20px)] text-[15px] leading-[1.2] font-bold tracking-[-0.02em] [font-stretch:106%]">
                {role.holder.name}
              </span>
              <span className="text-brand wide:text-[13px] wide:tracking-[0.1em] text-[11px] font-bold tracking-[0.09em] uppercase">
                {role.role}
              </span>
            </span>
          </button>
        ))}
      </div>

      <Dialog
        open={openIndex !== null}
        onOpenChange={(open) => !open && setOpenIndex(null)}
        label={active ? `${active.role}: ${active.holder.name}` : 'Committee role'}
        header={
          active && (
            <div className="flex min-w-0 flex-col gap-[5px]">
              <Eyebrow className="text-xs">{active.role}</Eyebrow>
              <DialogTitle className="m-0 text-[clamp(24px,2.6vw,34px)] leading-[1.06] font-extrabold tracking-[-0.03em] [font-stretch:110%]">
                {active.holder.name}
              </DialogTitle>
            </div>
          )
        }
      >
        {active && <RoleDetail role={active} />}
      </Dialog>
    </Section>
  )
}

/**
 * A committee member's face, or the hatch that stands in for one.
 *
 * Callers pass the shape, since the card wants a rounded square and the timeline
 * wants a circle, but both states live here so a photo and a placeholder can
 * never differ in anything but content. Adding a photo to committee.yaml is the
 * only step needed to swap one for the other.
 *
 * Alt is always empty: every use sits beside the person's name, so announcing the
 * photo would repeat what is about to be read.
 */
function Avatar({ person, className }: { person: ResolvedTerm; className: string }) {
  if (!person.photo) {
    return (
      <span
        aria-hidden="true"
        className={`bg-surface bg-[repeating-linear-gradient(135deg,#E7E3E0_0_10px,#F4F2F0_10px_20px)] ${className}`}
      />
    )
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={person.photo} alt="" className={`bg-surface object-cover ${className}`} />
}

function RoleDetail({ role }: { role: ResolvedRole }) {
  const last = role.history.length - 1

  return (
    <>
      <p className="text-body m-0 text-[clamp(16px,1.4vw,18px)] leading-[1.6] text-pretty">
        {role.about}
      </p>

      <div className="flex flex-col gap-[14px]">
        <Eyebrow tone="muted">Role history</Eyebrow>
        {/*
          The marker on the rail is the person's face rather than a dot. The ring
          carries what the dot used to: filled red for whoever holds the role now,
          grey for everyone before them.
        */}
        <ol className="m-0 flex list-none flex-col p-0">
          {role.history.map((entry, index) => (
            <li
              key={`${entry.name}-${entry.term}`}
              className="grid grid-cols-[40px_minmax(0,1fr)] gap-x-4"
            >
              <div className="flex flex-col items-center">
                <Avatar
                  person={entry}
                  className={`size-10 flex-none rounded-full ring-2 ${
                    entry.current ? 'ring-brand' : 'ring-dot-idle'
                  }`}
                />
                {index !== last && <span className="border-edge my-2 w-0 flex-1 border-l-2" />}
              </div>
              <div
                className={`flex min-w-0 flex-col justify-center gap-[3px] ${
                  index === last ? '' : 'pb-6'
                }`}
              >
                <span
                  className={`text-[clamp(16px,1.4vw,18px)] font-bold tracking-[-0.015em] ${
                    entry.current ? 'text-ink' : 'text-body'
                  }`}
                >
                  {entry.name}
                </span>
                <span className="text-muted text-sm leading-[1.45]">
                  {entry.term} · {entry.duration}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </>
  )
}

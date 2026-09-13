'use client'

import { useState } from 'react'
import type { CommitteeRole } from '@/content/schema'
import { Dialog, DialogClose, DialogTitle } from '@/components/ui/dialog'

export function CommitteeSection({ roles }: { roles: CommitteeRole[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const active = openIndex === null ? null : roles[openIndex]

  return (
    <section id="team" className="px-[clamp(24px,5.5vw,88px)] pt-[clamp(52px,7vw,90px)]">
      <div className="flex flex-wrap items-baseline justify-between gap-6 pb-[clamp(20px,2.5vw,30px)]">
        <h2 className="m-0 text-[clamp(12px,1.3vw,14px)] font-bold tracking-[0.2em] uppercase">
          Executive Committee
        </h2>
      </div>

      <div className="wide:grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] wide:gap-[clamp(18px,2.4vw,32px)] grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-x-3 gap-y-4">
        {roles.map((role, index) => {
          // History is newest first, so the current holder is always index 0.
          const holder = role.history[0]
          if (!holder) return null

          return (
            <button
              key={role.role}
              type="button"
              onClick={() => setOpenIndex(index)}
              className="hover:bg-surface wide:-m-2.5 wide:gap-4 wide:rounded-[20px] wide:p-2.5 -m-2 flex min-w-0 cursor-pointer items-center gap-3 rounded-[18px] border-none bg-transparent p-2 text-left"
            >
              {/* Placeholder until the committee has headshots. See docs/OPEN-QUESTIONS.md. */}
              <span className="bg-surface wide:size-[76px] wide:rounded-[22px] size-[52px] flex-none rounded-2xl bg-[repeating-linear-gradient(135deg,#E7E3E0_0_10px,#F4F2F0_10px_20px)]" />
              <span className="flex min-w-0 flex-col gap-[3px]">
                <span className="wide:text-[clamp(17px,1.5vw,20px)] text-[15px] leading-[1.2] font-bold tracking-[-0.02em] [font-stretch:106%]">
                  {holder.name}
                </span>
                <span className="text-brand wide:text-[13px] wide:tracking-[0.1em] text-[11px] font-bold tracking-[0.09em] uppercase">
                  {role.role}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <Dialog
        open={openIndex !== null}
        onOpenChange={(open) => !open && setOpenIndex(null)}
        label={active ? `${active.role}: ${active.history[0]?.name}` : 'Committee role'}
      >
        {active && <RoleDetail role={active} />}
      </Dialog>
    </section>
  )
}

function RoleDetail({ role }: { role: CommitteeRole }) {
  const last = role.history.length - 1

  return (
    <>
      <div className="flex items-start justify-between gap-[18px]">
        <div className="flex min-w-0 flex-col gap-[5px]">
          <span className="text-brand text-xs font-bold tracking-[0.16em] uppercase">
            {role.role}
          </span>
          <DialogTitle className="m-0 text-[clamp(24px,2.6vw,34px)] leading-[1.06] font-extrabold tracking-[-0.03em] [font-stretch:110%]">
            {role.history[0]?.name}
          </DialogTitle>
        </div>
        <DialogClose />
      </div>

      <p className="text-body m-0 text-[clamp(16px,1.4vw,18px)] leading-[1.6] text-pretty">
        {role.about}
      </p>

      <div className="flex flex-col gap-[14px]">
        <span className="text-muted text-[11px] font-bold tracking-[0.16em] uppercase">
          Role history
        </span>
        <ol className="m-0 flex list-none flex-col p-0">
          {role.history.map((entry, index) => {
            const current = index === 0
            return (
              <li
                key={`${entry.name}-${entry.term}`}
                className="grid grid-cols-[14px_minmax(0,1fr)] gap-x-4"
              >
                <div className="flex flex-col items-center">
                  <span
                    className="box-border size-[14px] flex-none rounded-full"
                    style={{
                      background: current ? '#E51B13' : '#FFFFFF',
                      border: current ? '3px solid #E51B13' : '3px solid #D6D1CD',
                    }}
                  />
                  {index !== last && <span className="border-edge my-1 w-0 flex-1 border-l-2" />}
                </div>
                <div
                  className={`-mt-[3px] flex min-w-0 flex-col gap-[3px] ${index === last ? '' : 'pb-[22px]'}`}
                >
                  <span
                    className={`text-[clamp(16px,1.4vw,18px)] font-bold tracking-[-0.015em] ${current ? 'text-ink' : 'text-body'}`}
                  >
                    {entry.name}
                  </span>
                  <span className="text-muted text-sm leading-[1.45]">
                    {entry.term} · {entry.length}
                  </span>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </>
  )
}

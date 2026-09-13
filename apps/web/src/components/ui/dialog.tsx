'use client'

import * as RadixDialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
import { useScrollLock } from './use-scroll-lock'

/**
 * The modal shell used by events, committee roles and sponsorship.
 *
 * Radix rather than the mockup's hand-rolled overlay, which had no focus trap,
 * no Escape handling, and reached into `document.body.style.overflow` directly.
 * All three matter: a modal you cannot tab out of or close with the keyboard is
 * unusable without a mouse.
 *
 * Overlay and Content are siblings, not nested. Nesting Content inside Overlay
 * renders fine but leaves `aria-modal` unset, so assistive tech is not told the
 * rest of the page is inert.
 */
export function Dialog({
  open,
  onOpenChange,
  label,
  children,
  size = 'default',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Accessible name, used unless the content provides its own DialogTitle. */
  label: string
  children: ReactNode
  size?: 'default' | 'wide'
}) {
  useScrollLock(open)

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-60 bg-[rgba(17,16,16,0.45)] backdrop-blur-[6px]" />
        <RadixDialog.Content
          aria-label={label}
          className={`animate-rise no-scrollbar fixed top-1/2 left-1/2 z-60 flex max-h-[90vh] w-[calc(100%-clamp(32px,8vw,96px))] -translate-x-1/2 -translate-y-1/2 flex-col gap-[22px] overflow-y-auto rounded-[clamp(22px,3vw,32px)] bg-white p-[clamp(24px,3.4vw,40px)] ${
            size === 'wide' ? 'max-w-[1040px]' : 'max-w-[560px]'
          }`}
        >
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

/** The close control in the top-right of every dialog. */
export function DialogClose() {
  return (
    <RadixDialog.Close
      aria-label="Close"
      className="text-muted hover:bg-brand inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-[13px] border-none bg-transparent hover:text-white"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        aria-hidden="true"
        fill="none"
        className="block"
      >
        <path
          d="M3 3L13 13M13 3L3 13"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </RadixDialog.Close>
  )
}

export const DialogTitle = RadixDialog.Title
export const DialogDescription = RadixDialog.Description

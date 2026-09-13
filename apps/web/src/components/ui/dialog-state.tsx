'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * Which of the site's standalone dialogs is open.
 *
 * Both of them open from several places — sponsorship from the header, the
 * sponsor strip and the footer; contact from its own section — so neither can
 * keep its state inside any one trigger. Holding a single name rather than a
 * boolean each also means two can never be open at once, so one dialog can hand
 * off to the other without them stacking.
 */
export type DialogName = 'sponsorship' | 'contact'

/**
 * Deep links. Paste one of these at the committee and the dialog opens on load,
 * which beats telling someone to scroll and click.
 */
const HASHES: Record<DialogName, string> = {
  sponsorship: '#sponsor',
  contact: '#contact',
}

const NAMES = Object.keys(HASHES) as DialogName[]

type DialogStateValue = {
  current: DialogName | null
  setCurrent: (name: DialogName | null) => void
}

const DialogStateContext = createContext<DialogStateValue | null>(null)

export function DialogStateProvider({ children }: { children: ReactNode }) {
  const [current, setCurrentState] = useState<DialogName | null>(null)

  useEffect(() => {
    const sync = () => {
      const match = NAMES.find((name) => HASHES[name] === window.location.hash)
      if (match) setCurrentState(match)
    }

    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const setCurrent = useCallback((name: DialogName | null) => {
    setCurrentState(name)
    // Clear the hash on close, so following the same link again still fires
    // hashchange and reopens it.
    if (name === null && NAMES.some((n) => HASHES[n] === window.location.hash)) {
      history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [])

  const value = useMemo(() => ({ current, setCurrent }), [current, setCurrent])

  return <DialogStateContext value={value}>{children}</DialogStateContext>
}

/** The open state for one dialog, shaped to drop straight into `<Dialog>`. */
export function useDialog(name: DialogName): { open: boolean; setOpen: (open: boolean) => void } {
  const context = useContext(DialogStateContext)
  if (!context) {
    throw new Error('useDialog must be used inside DialogStateProvider')
  }

  const { current, setCurrent } = context

  const setOpen = useCallback(
    (next: boolean) => {
      if (next) return setCurrent(name)
      // Closing only closes us. A dialog that has already handed off to another
      // one still emits its own close, and it must not clobber the new one.
      if (current === name) setCurrent(null)
    },
    [current, name, setCurrent],
  )

  return { open: current === name, setOpen }
}

'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

type SponsorshipContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
}

const SponsorshipContext = createContext<SponsorshipContextValue | null>(null)

/**
 * Holds the sponsorship dialog's open state.
 *
 * It opens from three places — the header, the sponsor strip and the footer — so
 * the state cannot live inside any one of them. It also responds to a `#sponsor`
 * hash, which gives the committee a link they can paste to a company rather than
 * telling them to scroll and click.
 */
export function SponsorshipProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const sync = () => {
      if (window.location.hash === '#sponsor') setOpen(true)
    }

    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next)
    // Clear the hash on close so reopening from a link still fires hashchange.
    if (!next && window.location.hash === '#sponsor') {
      history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [])

  const value = useMemo(() => ({ open, setOpen: handleOpenChange }), [open, handleOpenChange])

  return <SponsorshipContext value={value}>{children}</SponsorshipContext>
}

export function useSponsorship(): SponsorshipContextValue {
  const context = useContext(SponsorshipContext)
  if (!context) {
    throw new Error('useSponsorship must be used inside SponsorshipProvider')
  }
  return context
}

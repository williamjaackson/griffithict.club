'use client'

import { useEffect } from 'react'

/**
 * Freezes background scrolling while a dialog is open.
 *
 * Radix is meant to do this through react-remove-scroll, but in this stack it
 * never injects its style: the modal machinery works (focus trap, aria-hidden,
 * pointer-events) while the page behind stays scrollable. Most visible on the
 * full-screen mobile menu, where the content underneath slides around behind it.
 *
 * Reference counted, so closing one dialog does not unlock the page while
 * another is still open.
 *
 * No layout shift to compensate for: `scrollbar-gutter: stable` in globals.css
 * means the gutter is already reserved whether or not the scrollbar is showing.
 */
let locks = 0
let previousOverflow = ''

export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return

    const root = document.documentElement
    if (locks === 0) {
      previousOverflow = root.style.overflow
      root.style.overflow = 'hidden'
    }
    locks += 1

    return () => {
      locks -= 1
      if (locks === 0) root.style.overflow = previousOverflow
    }
  }, [locked])
}

import type { ReactNode } from 'react'

/**
 * Page furniture that every section repeats.
 *
 * The horizontal padding appeared in ten places and the small uppercase heading in
 * four. Both are a single decision about how the page is laid out, so they live
 * here rather than being retyped and slowly diverging.
 */

/** Gutter either side of every full-width section. */
export const PAGE_X = 'px-[clamp(24px,5.5vw,88px)]'

export function Section({
  id,
  surface,
  className,
  children,
}: {
  id?: string
  /** Off-white band, used to separate a section from the ones either side. */
  surface?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      className={[PAGE_X, surface ? 'bg-surface' : '', className].filter(Boolean).join(' ')}
    >
      {children}
    </section>
  )
}

/** The small tracked label that titles a section: "What's on", "Executive Committee". */
export function SectionHeading({
  as: As = 'h2',
  muted,
  className,
  children,
}: {
  as?: 'h1' | 'h2'
  muted?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <As
      className={[
        'm-0 text-[clamp(12px,1.3vw,14px)] font-bold tracking-[0.2em] uppercase',
        muted ? 'text-muted' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </As>
  )
}

/**
 * The smaller label above a heading: "Sponsorship", "Step 1", "Registration".
 *
 * Red by default, since that is how the design marks them.
 */
export function Eyebrow({
  tone = 'brand',
  className,
  children,
}: {
  tone?: 'brand' | 'muted'
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={[
        'text-[11px] font-bold tracking-[0.16em] uppercase',
        tone === 'brand' ? 'text-brand' : 'text-muted',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  )
}

import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

/**
 * Every button and call-to-action on the site.
 *
 * The design varies these by a few pixels per slot. Rather than carry that
 * variation at each call site, the sizes below are the four the design actually
 * uses, and anything outside them is a design decision worth making on purpose.
 *
 * Colour pairings matter more than size: a hover state drifting out of step is
 * invisible until someone notices one button behaving differently from the rest.
 */

const VARIANT = {
  /** Primary action. Red, going to ink on hover. */
  brand: 'bg-brand text-white hover:bg-ink',
  /** Secondary action on a light background. Ink, going to red on hover. */
  ink: 'bg-ink text-white hover:bg-brand',
  /** On the red call-to-action band, where red on red would vanish. */
  onBrand: 'bg-white text-brand hover:bg-ink hover:text-white',
} as const

const SIZE = {
  /** Header nav, and the "See all" chip on the hero card. */
  sm: 'min-h-[44px] rounded-[11px] px-[18px] text-[13px]',
  /** The default. Join steps, sponsorship, event actions. */
  md: 'min-h-[58px] rounded-2xl px-[30px] text-[17px]',
  /** Hero, and the mobile menu's closing action. */
  lg: 'min-h-[64px] rounded-[17px] px-[26px] text-[clamp(16px,1.35vw,19px)]',
  /** The red call-to-action band, which is deliberately the largest thing on the page. */
  xl: 'min-h-[66px] rounded-[18px] px-8 text-[clamp(18px,1.6vw,21px)]',
} as const

const BASE =
  'inline-flex cursor-pointer items-center justify-center gap-3 border-none text-center font-bold no-underline disabled:cursor-not-allowed disabled:bg-inactive'

export type ButtonVariant = keyof typeof VARIANT
export type ButtonSize = keyof typeof SIZE

type SharedProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  className?: string
  children: ReactNode
}

export function buttonClass({
  variant = 'brand',
  size = 'md',
  fullWidth,
  className,
}: Omit<SharedProps, 'children'> = {}): string {
  return [BASE, VARIANT[variant], SIZE[size], fullWidth ? 'w-full' : '', className]
    .filter(Boolean)
    .join(' ')
}

type ButtonProps = SharedProps & Omit<ComponentProps<'button'>, 'className' | 'children'>

export function Button({ variant, size, fullWidth, className, children, ...rest }: ButtonProps) {
  return (
    <button className={buttonClass({ variant, size, fullWidth, className })} {...rest}>
      {children}
    </button>
  )
}

type ButtonLinkProps = SharedProps &
  Omit<ComponentProps<'a'>, 'className' | 'children'> & { href: string }

/**
 * The same thing as a link.
 *
 * Internal hrefs route through next/link and external ones stay plain anchors, so
 * call sites stop having to remember which is which.
 */
export function ButtonLink({
  href,
  variant,
  size,
  fullWidth,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  const classes = buttonClass({ variant, size, fullWidth, className })
  const internal = href.startsWith('/') || href.startsWith('#')

  if (internal) {
    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    )
  }

  return (
    <a href={href} className={classes} {...rest}>
      {children}
    </a>
  )
}

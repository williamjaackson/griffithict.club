/**
 * The three button treatments in the design, by intent.
 *
 * Only the colours live here. Size, radius and spacing stay at the call site
 * because the design genuinely varies them per slot — the header button is 42px
 * with tight tracking, the hero one is a clamp — and a `size` prop covering seven
 * bespoke shapes would be harder to read than the classes it replaced.
 *
 * What is worth sharing is the colour pairing, since a hover state drifting out of
 * step is invisible until someone notices one button behaves differently.
 */
export const BUTTON = {
  /** Primary action. Red, going to ink on hover. */
  brand: 'bg-brand text-white hover:bg-ink',
  /** Secondary action on a light background. Ink, going to red on hover. */
  ink: 'bg-ink text-white hover:bg-brand',
  /** Sitting on the red call-to-action band, where red on red would vanish. */
  onBrand: 'text-brand bg-white hover:bg-ink hover:text-white',
} as const

/**
 * Reading a colour out of what somebody typed into a modal.
 *
 * Lenient about how it is written, strict about what comes out. People type
 * `#E51B13`, `e51b13`, `E5 1B 13` and `red`, and all of those should either
 * work or be refused clearly. Silently accepting something that means one thing
 * to them and another to us is the failure to avoid.
 */

export type ColourResult = { ok: true; value: number } | { ok: false; error: string }

/**
 * Words that mean "take the colour off".
 *
 * A role can be uncoloured, so there has to be a way back to that. Leaving the
 * field empty does it too; these exist because somebody who has just seen a
 * colour in the box is more likely to type over it than to delete it.
 */
const CLEARING = new Set(['none', 'clear', 'unset', 'remove', 'default', 'no colour', 'no color'])

/**
 * A handful of names, because somebody will type one.
 *
 * Not a full CSS colour table: this is a short list of words worth
 * understanding, and anything else gets a message asking for a hex code rather
 * than a wrong colour.
 */
const NAMED: Record<string, number> = {
  red: 0xe51b13,
  orange: 0xf97316,
  amber: 0xf59e0b,
  yellow: 0xeab308,
  lime: 0x84cc16,
  green: 0x22c55e,
  teal: 0x14b8a6,
  cyan: 0x06b6d4,
  blue: 0x3b82f6,
  indigo: 0x6366f1,
  violet: 0x8b5cf6,
  purple: 0xa855f7,
  magenta: 0xd946ef,
  pink: 0xec4899,
  white: 0xffffff,
  grey: 0x9ca3af,
  gray: 0x9ca3af,
  black: 0x010101,
}

/**
 * Discord reads 0x000000 as "this role has no colour", so a role set to it
 * shows the member's next colour down instead of black. Nudging pure black by
 * one channel gives somebody who asked for black something that looks black.
 *
 * This is only for somebody asking for black. A new role is left at 0, which is
 * uncoloured on purpose: until they choose, their other roles should keep
 * showing through rather than being overridden by a colour nobody picked.
 */
export const NEAR_BLACK = 0x010101

/** No colour at all, which is what a personal role starts as. */
export const UNSET = 0

export function parseColour(input: string): ColourResult {
  const trimmed = input.trim().toLowerCase()

  // Empty means take it off, which is why the field is not required.
  if (trimmed === '' || CLEARING.has(trimmed)) return { ok: true, value: UNSET }

  const named = NAMED[trimmed]
  if (named !== undefined) return { ok: true, value: named }

  const hex = trimmed.replace(/^#/, '').replace(/\s+/g, '')

  // Three digits is the shorthand everybody knows from CSS: f0a is ff00aa.
  const expanded =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex

  if (!/^[0-9a-f]{6}$/.test(expanded)) {
    return {
      ok: false,
      error: `"${input.trim()}" is not a colour. Try a hex code like #E51B13, a name like blue, or "none" to remove it.`,
    }
  }

  const value = Number.parseInt(expanded, 16)
  return { ok: true, value: value === 0 ? NEAR_BLACK : value }
}

/** Back to something a person recognises, for showing what is currently set. */
export function formatColour(value: number): string {
  return `#${value.toString(16).padStart(6, '0').toUpperCase()}`
}

/**
 * A square of the colour, drawn with a character rather than an image.
 *
 * Discord has no way to show a swatch in a message, and the nearest coloured
 * emoji is a poor match for an arbitrary hex. This picks whichever of the
 * dozen square emoji is closest, which is honest about being approximate.
 */
const SWATCHES: [number, string][] = [
  [0xff0000, '🟥'],
  [0xff8000, '🟧'],
  [0xffff00, '🟨'],
  [0x00ff00, '🟩'],
  [0x0000ff, '🟦'],
  [0x8000ff, '🟪'],
  [0x8b4513, '🟫'],
  [0xffffff, '⬜'],
  [0x000000, '⬛'],
]

export function swatch(value: number): string {
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255]

  let best = SWATCHES[0]!
  let bestDistance = Infinity

  for (const entry of SWATCHES) {
    const [cr, cg, cb] = [(entry[0] >> 16) & 255, (entry[0] >> 8) & 255, entry[0] & 255]
    const distance = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2
    if (distance < bestDistance) {
      bestDistance = distance
      best = entry
    }
  }

  return best[1]
}

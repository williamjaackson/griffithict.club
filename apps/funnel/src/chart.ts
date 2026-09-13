/**
 * Horizontal bars, drawn in text.
 *
 * Deliberately not a rendered image. A code block arrives instantly, needs no
 * image library in the container, sends nothing to a third-party chart service,
 * and can be copied into a committee doc as text. For a handful of recruiting
 * channels it reads as well as anything a canvas would produce.
 *
 * Bars use eighth-width blocks so a short bar is still visibly different from an
 * empty one, which matters when one source dwarfs the rest and everything else
 * would otherwise round to nothing.
 */

const FULL = '█'
/** U+258F to U+2589: one eighth through seven eighths. */
const PARTIAL = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉']

export type Slice = { label: string; value: number }

export function bar(value: number, max: number, width: number): string {
  if (max <= 0 || value <= 0) return ''

  const eighths = Math.round((value / max) * width * 8)
  const full = Math.floor(eighths / 8)
  const remainder = eighths % 8

  // Anything above zero gets at least a sliver, so a real value never renders
  // as blank beside a much larger one.
  if (full === 0 && remainder === 0) return PARTIAL[1]!
  return FULL.repeat(full) + PARTIAL[remainder]!
}

/**
 * Render slices as aligned rows, widest first.
 *
 * Returns the body only. The caller owns the code fence and whatever it wants
 * to say around it.
 */
export function barChart(slices: readonly Slice[], width = 18, labelWidth = 18): string {
  if (slices.length === 0) return ''

  const ordered = [...slices].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
  const total = ordered.reduce((sum, slice) => sum + slice.value, 0)
  const max = ordered[0]?.value ?? 0
  const longest = Math.min(labelWidth, Math.max(...ordered.map((slice) => slice.label.length)))
  const widestValue = Math.max(...ordered.map((slice) => String(slice.value).length))

  return ordered
    .map((slice) => {
      const label = truncate(slice.label, longest).padEnd(longest)
      const count = String(slice.value).padStart(widestValue)
      const share = total === 0 ? 0 : Math.round((slice.value / total) * 100)
      return `${label}  ${bar(slice.value, max, width).padEnd(width)}  ${count}  ${String(share).padStart(3)}%`
    })
    .join('\n')
}

function truncate(value: string, limit: number): string {
  return value.length <= limit ? value : `${value.slice(0, limit - 1)}…`
}

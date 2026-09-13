/**
 * Committee terms, derived from the months they start and end.
 *
 * Content stores two dates per entry and nothing else. Everything shown — the
 * date range, how long it ran, whether it is the current holder — is computed
 * from those. Storing a rendered "1 yr 4 mos" alongside them means three fields
 * for one fact, two of which start drifting the moment they are written.
 *
 * Month precision, because committee terms are month-granular and nobody knows
 * the day a handover happened.
 */

/** `YYYY-MM`. Validated in content/schema.ts before it reaches any of this. */
export type Month = string

/** Months since year zero. Only meaningful compared against another one. */
function index(month: Month): number {
  const [year = '0', m = '1'] = month.split('-')
  return Number(year) * 12 + (Number(m) - 1)
}

/**
 * `2026-07` to `Jul 2026`.
 *
 * The month is formatted on its own and joined by hand. Asking en-AU for a short
 * month *and* a year gives "July 2026" — it widens the month once there is a year
 * beside it. Same trap as the event date formatting in datetime.ts.
 *
 * UTC, so the month cannot slip across a boundary on the way through Date.
 */
export function formatMonth(month: Month): string {
  const [year = '0', m = '1'] = month.split('-')
  const name = new Intl.DateTimeFormat('en-AU', {
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(Number(year), Number(m) - 1, 1)))

  return `${name} ${Number(year)}`
}

/** `Mar 2025 to Jun 2026`, or `Jul 2026 to Present` while someone still holds it. */
export function formatTerm(from: Month, to?: Month): string {
  return `${formatMonth(from)} to ${to ? formatMonth(to) : 'Present'}`
}

/**
 * Whole months covered, counting both ends.
 *
 * March to June is four months, not three — a term that starts and ends in the
 * same month still counts as one.
 */
export function termMonths(from: Month, to: Month): number {
  return index(to) - index(from) + 1
}

/** `16` to `1 yr 4 mos`. */
export function formatDuration(months: number): string {
  const years = Math.floor(months / 12)
  const remainder = months % 12

  const parts: string[] = []
  if (years > 0) parts.push(`${years} ${years === 1 ? 'yr' : 'yrs'}`)
  if (remainder > 0 || years === 0) {
    parts.push(`${remainder} ${remainder === 1 ? 'mo' : 'mos'}`)
  }

  return parts.join(' ')
}

/** The month `date` falls in, as `YYYY-MM`, in Brisbane. */
export function monthOf(date: Date): Month {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    timeZone: 'Australia/Brisbane',
  }).format(date)

  // en-CA gives YYYY-MM-DD, which is already the shape we want minus the day.
  return parts.slice(0, 7)
}

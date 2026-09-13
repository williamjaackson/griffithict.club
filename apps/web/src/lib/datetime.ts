/**
 * Event dates, formatted for Brisbane.
 *
 * Every timestamp is stored in UTC. The club is in Queensland, which has no
 * daylight saving, so a naive column plus a UTC server looks correct on a laptop
 * in Brisbane and is ten hours wrong in production. The timezone is named
 * explicitly on every formatter here rather than inherited from the environment.
 *
 * These run on the server only. Formatting a date in a client component makes the
 * output depend on the visitor's clock, which is the classic hydration mismatch.
 */
export const TIMEZONE = 'Australia/Brisbane'

const LOCALE = 'en-AU'

function format(date: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(LOCALE, { ...options, timeZone: TIMEZONE }).format(date)
}

/** Short month for the date chip, e.g. `Aug`. Rendered uppercase in CSS. */
export function chipMonth(date: Date): string {
  return format(date, { month: 'short' })
}

/** Day of month for the date chip, e.g. `14`. */
export function chipDay(date: Date): string {
  return format(date, { day: 'numeric' })
}

/**
 * The line under an event title, e.g. `Thursday · 5:30pm`.
 *
 * Intl gives `5:30 pm` in en-AU; the design wants `5:30pm`.
 */
export function eventMeta(date: Date): string {
  return `${format(date, { weekday: 'long' })} · ${clockTime(date)}`
}

/** `5:30pm`. Intl gives `5:30 pm` in en-AU; the design closes the gap. */
function clockTime(date: Date): string {
  return format(date, { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(/\s/g, '')
    .toLowerCase()
}

/**
 * Compact form for the hero's "Next up" strip, e.g. `Thu 14 Aug`.
 *
 * Built from parts rather than handed to Intl whole. en-AU punctuates these
 * inconsistently — `Fri, 14 Aug` but `Friday 14 August 2026` — so the separators
 * here are ours and stay stable if the ICU data shifts under us.
 */
export function shortWhen(date: Date): string {
  const weekday = format(date, { weekday: 'short' })
  const day = format(date, { day: 'numeric' })
  const month = format(date, { month: 'short' })

  return `${weekday} ${day} ${month}`
}

/** Machine-readable value for `<time dateTime>` and JSON-LD. */
export function isoDate(date: Date): string {
  return date.toISOString()
}

/** Long form for the event detail page, e.g. `Friday, 14 August 2026 at 5:30pm`. */
export function longWhen(date: Date): string {
  const weekday = format(date, { weekday: 'long' })
  const day = format(date, { day: 'numeric' })
  const month = format(date, { month: 'long' })
  const year = format(date, { year: 'numeric' })

  return `${weekday}, ${day} ${month} ${year} at ${clockTime(date)}`
}

/**
 * Which sponsorship year a company can sign up for.
 *
 * The club's sponsorship year runs March to February, matching the academic
 * calendar. From June onwards the current year is too far gone to sell, so the
 * form offers the next one instead.
 */
export function sponsorshipPeriods(now: Date = new Date()): string[] {
  const year = now.getFullYear()
  // getMonth is zero-based: 5 is June.
  const opening = now.getMonth() >= 5 ? year + 1 : year

  return [`March ${opening} to February ${opening + 1}`]
}

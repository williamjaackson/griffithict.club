/**
 * Parsing and showing amounts of money.
 *
 * Everything downstream holds minor units as an integer. Floats are never used
 * anywhere near a currency value: 0.1 + 0.2 is the oldest bug in the field, and
 * a club treasurer reconciling against a bank statement will find a one-cent
 * drift and have no way to explain it.
 *
 * Parsing is strict on purpose. This reads what a person typed into a Discord
 * modal with no client-side validation, so the failure to avoid is silently
 * accepting something that means one thing to them and another to us. "12.345"
 * is rejected rather than rounded, because rounding somebody's money without
 * telling them is worse than making them type it again.
 */

export type ParseResult = { ok: true; cents: number } | { ok: false; error: string }

/** Ten thousand dollars. A club claim above this is a typo, not a claim. */
const MAX_CENTS = 1_000_000

export function parseAmount(input: string): ParseResult {
  const trimmed = input.trim()
  if (trimmed === '') return { ok: false, error: 'Enter an amount.' }

  // A leading currency symbol is what people type, so accept it rather than
  // making them delete it.
  const withoutSymbol = trimmed.replace(/^[$A-Z]{0,3}\s*/i, '')

  /*
   * A comma is a thousands separator here and never a decimal point. Treating
   * "12,50" as twelve fifty would be right in half the world and wrong in this
   * one, and getting it backwards turns $12.50 into $1,250.
   */
  const withoutGrouping = withoutSymbol.replace(/,/g, '')

  if (!/^\d+(\.\d+)?$/.test(withoutGrouping)) {
    return { ok: false, error: `"${trimmed}" is not an amount. Try something like 12.50.` }
  }

  const [whole = '', fraction = ''] = withoutGrouping.split('.')

  if (fraction.length > 2) {
    return { ok: false, error: 'Amounts go to cents, so at most two decimal places.' }
  }

  /*
   * Built from the two halves of the string, never by multiplying a float.
   *
   * Math.round(Number(input) * 100) would in fact survive every two-decimal
   * value; Math.trunc of the same expression is wrong 65,624 times under
   * $10,000. This does not depend on having picked the lucky one.
   */
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0') || '0')

  if (cents === 0) return { ok: false, error: 'The amount has to be more than zero.' }
  if (cents > MAX_CENTS) {
    return { ok: false, error: `That is over ${formatAmount(MAX_CENTS, 'AUD')}. Check the amount.` }
  }

  return { ok: true, cents }
}

/** Minor units back to something a person reads, in the guild's currency. */
export function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).format(cents / 100)
}

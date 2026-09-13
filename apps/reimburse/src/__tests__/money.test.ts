import { describe, expect, it } from 'vitest'
import { formatAmount, parseAmount } from '../money'

const cents = (input: string) => {
  const result = parseAmount(input)
  if (!result.ok) throw new Error(`expected ${input} to parse: ${result.error}`)
  return result.cents
}

const rejects = (input: string) => {
  const result = parseAmount(input)
  expect(result.ok, `expected ${JSON.stringify(input)} to be rejected`).toBe(false)
}

describe('parseAmount', () => {
  it('reads whole dollars', () => {
    expect(cents('12')).toBe(1200)
  })

  it('reads cents', () => {
    expect(cents('12.50')).toBe(1250)
    expect(cents('12.5')).toBe(1250)
    expect(cents('0.05')).toBe(5)
  })

  it('accepts the currency symbol people actually type', () => {
    expect(cents('$12.50')).toBe(1250)
    expect(cents('A$12.50')).toBe(1250)
    expect(cents('AUD 12.50')).toBe(1250)
  })

  it('treats a comma as a thousands separator, never a decimal point', () => {
    // The dangerous case: read as a decimal comma this is $12.50, not $1,250.
    expect(cents('1,250')).toBe(125000)
    expect(cents('1,234.56')).toBe(123456)
  })

  it('refuses to round away a third decimal place', () => {
    // Quietly turning 12.345 into 12.34 is changing somebody's money silently.
    rejects('12.345')
  })

  it('rejects zero and negatives', () => {
    rejects('0')
    rejects('0.00')
    rejects('-5')
  })

  it('rejects nonsense', () => {
    rejects('')
    rejects('   ')
    rejects('abc')
    rejects('12.5.6')
    rejects('1..2')
    rejects('12-')
  })

  it('rejects an amount too large to be a real club claim', () => {
    rejects('99999999')
  })

  it('never loses a cent to floating point', () => {
    // 0.1 + 0.2 in floats is 0.30000000000000004. Built from strings it is 30.
    expect(cents('0.10') + cents('0.20')).toBe(30)
  })

  it('is exact for every cent value up to a hundred dollars', () => {
    // Math.round(Number(input) * 100) happens to survive this too. Math.trunc
    // does not: it is wrong for 0.29, 0.57, 1.13 and 65,000 others under
    // $10,000. Building from strings does not depend on having picked the lucky
    // one of those two.
    for (let value = 1; value <= 10_000; value += 1) {
      const text = (value / 100).toFixed(2)
      expect(cents(text), `${text} should be ${value} cents`).toBe(value)
    }
  })
})

describe('formatAmount', () => {
  it('shows minor units as currency', () => {
    expect(formatAmount(1250, 'AUD')).toBe('$12.50')
    expect(formatAmount(5, 'AUD')).toBe('$0.05')
  })

  it('groups thousands', () => {
    expect(formatAmount(123456, 'AUD')).toBe('$1,234.56')
  })

  it('round-trips anything parseAmount accepts', () => {
    for (const input of ['12', '12.50', '0.05', '1,234.56', '999.99']) {
      const parsed = cents(input)
      expect(cents(formatAmount(parsed, 'AUD'))).toBe(parsed)
    }
  })
})

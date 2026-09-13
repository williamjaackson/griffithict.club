import { describe, expect, it } from 'vitest'
import { formatDuration, formatMonth, formatTerm, monthOf, termMonths } from '../term'

describe('formatMonth', () => {
  it('renders a short month and year', () => {
    expect(formatMonth('2026-07')).toBe('Jul 2026')
    expect(formatMonth('2025-03')).toBe('Mar 2025')
  })

  it('does not slip across a year boundary', () => {
    expect(formatMonth('2026-01')).toBe('Jan 2026')
    expect(formatMonth('2025-12')).toBe('Dec 2025')
  })
})

describe('formatTerm', () => {
  it('renders a finished term', () => {
    expect(formatTerm('2025-03', '2026-06')).toBe('Mar 2025 to Jun 2026')
  })

  it('renders an ongoing term as Present', () => {
    expect(formatTerm('2026-07')).toBe('Jul 2026 to Present')
  })
})

describe('termMonths', () => {
  it('counts both ends', () => {
    // March to June is four months, not three.
    expect(termMonths('2025-03', '2025-06')).toBe(4)
  })

  it('counts a single month as one', () => {
    expect(termMonths('2026-02', '2026-02')).toBe(1)
  })

  it('spans years', () => {
    expect(termMonths('2025-03', '2026-06')).toBe(16)
  })
})

describe('formatDuration', () => {
  it.each([
    [1, '1 mo'],
    [3, '3 mos'],
    [11, '11 mos'],
    [12, '1 yr'],
    [13, '1 yr 1 mo'],
    [16, '1 yr 4 mos'],
    [24, '2 yrs'],
    [25, '2 yrs 1 mo'],
  ])('renders %i months as %s', (months, expected) => {
    expect(formatDuration(months)).toBe(expected)
  })

  it('never renders an empty string', () => {
    expect(formatDuration(0)).toBe('0 mos')
  })
})

describe('monthOf', () => {
  it('uses the Brisbane month, not UTC', () => {
    // 31 Aug 2026 23:00 UTC is already 1 Sep in Brisbane.
    expect(monthOf(new Date('2026-08-31T23:00:00Z'))).toBe('2026-09')
  })
})

describe('against the values the mockup hard-coded', () => {
  // Every length the old committee.yaml stated by hand, recomputed. If the
  // arithmetic here disagreed with those, one of the two was wrong.
  const today = '2026-09'

  it.each([
    ['William Jackson', '2026-07', undefined, '3 mos'],
    ['Owen Richardson', '2025-03', '2026-06', '1 yr 4 mos'],
    ['Tylar Pinniger', '2026-02', undefined, '8 mos'],
    ['Michael Geurts', '2025-09', '2026-01', '5 mos'],
  ])('%s', (_name, from, to, expected) => {
    expect(formatDuration(termMonths(from, to ?? today))).toBe(expected)
  })
})

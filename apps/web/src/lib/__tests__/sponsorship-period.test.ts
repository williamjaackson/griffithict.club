import { describe, expect, it } from 'vitest'
import { sponsorshipPeriods } from '../sponsorship-period'

describe('sponsorshipPeriods', () => {
  it('offers the current year before June', () => {
    expect(sponsorshipPeriods(new Date('2026-03-01T00:00:00Z'))).toEqual([
      'March 2026 to February 2027',
    ])
  })

  it('rolls over to next year from June', () => {
    expect(sponsorshipPeriods(new Date('2026-06-01T00:00:00Z'))).toEqual([
      'March 2027 to February 2028',
    ])
  })

  it('stays on next year through to December', () => {
    expect(sponsorshipPeriods(new Date('2026-12-31T00:00:00Z'))).toEqual([
      'March 2027 to February 2028',
    ])
  })
})

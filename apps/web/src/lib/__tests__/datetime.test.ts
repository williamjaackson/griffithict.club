import { describe, expect, it } from 'vitest'
import { chipDay, chipMonth, eventMeta, longWhen, shortWhen } from '../datetime'

// 14 Aug 2026, 07:30 UTC — which is 17:30 in Brisbane, the next day boundary being
// the thing worth pinning. A machine running in UTC formats this as 7:30am Friday
// if the timezone is not named.
const evening = new Date('2026-08-14T07:30:00Z')

describe('Brisbane formatting', () => {
  it('renders the chip in local time', () => {
    expect(chipMonth(evening)).toBe('Aug')
    expect(chipDay(evening)).toBe('14')
  })

  it('renders the meta line without a space before the meridiem', () => {
    expect(eventMeta(evening)).toBe('Friday · 5:30pm')
  })

  it('renders the short form used in the hero', () => {
    expect(shortWhen(evening)).toBe('Fri 14 Aug')
  })

  it('renders the long form used on the detail page', () => {
    expect(longWhen(evening)).toBe('Friday, 14 August 2026 at 5:30pm')
  })

  it('keeps a late-evening event on the correct Brisbane day', () => {
    // 22:00 Brisbane on the 14th is 12:00 UTC the same day, but 15:00 UTC would
    // roll over to the 15th in UTC while still being the 14th locally.
    const lateNight = new Date('2026-08-14T15:00:00Z')
    expect(chipDay(lateNight)).toBe('15')
    expect(chipMonth(lateNight)).toBe('Aug')
  })
})

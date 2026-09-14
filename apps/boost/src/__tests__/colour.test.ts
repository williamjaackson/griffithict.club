import { describe, expect, it } from 'vitest'
import { formatColour, NEAR_BLACK, parseColour, swatch, UNSET } from '../colour'

const value = (input: string) => {
  const result = parseColour(input)
  if (!result.ok) throw new Error(`expected ${input} to parse: ${result.error}`)
  return result.value
}

const rejects = (input: string) => {
  expect(parseColour(input).ok, `expected ${JSON.stringify(input)} to be rejected`).toBe(false)
}

describe('parseColour', () => {
  it('reads a hex code however it is written', () => {
    expect(value('#E51B13')).toBe(0xe51b13)
    expect(value('e51b13')).toBe(0xe51b13)
    expect(value('  #E5 1B 13 ')).toBe(0xe51b13)
  })

  it('expands the three digit shorthand', () => {
    expect(value('#f0a')).toBe(0xff00aa)
    expect(value('fff')).toBe(0xffffff)
  })

  it('understands a short list of names', () => {
    expect(value('blue')).toBe(0x3b82f6)
    expect(value('  Purple ')).toBe(0xa855f7)
  })

  it('never returns unset for something that is a colour', () => {
    // 0 means "no colour" to Discord. Nobody choosing a colour should land on
    // it by accident, which is the whole reason black is nudged.
    for (const input of ['#000000', 'black', '#000', '#010101', '#ffffff', 'blue']) {
      const result = parseColour(input)
      expect(result.ok && result.value).not.toBe(UNSET)
    }
  })

  it('treats an empty box as taking the colour off', () => {
    // A role can be uncoloured, so there has to be a way back to that. The
    // field is optional for exactly this.
    expect(value('')).toBe(UNSET)
    expect(value('   ')).toBe(UNSET)
  })

  it('understands the words people type instead of clearing the box', () => {
    for (const word of ['none', 'None', 'clear', 'unset', 'remove', 'default', 'no colour']) {
      expect(value(word), word).toBe(UNSET)
    }
  })

  it('nudges pure black off zero', () => {
    // Discord reads 0x000000 as "no colour", so a role set to it shows whatever
    // the member's next colour down is rather than black.
    expect(value('#000000')).toBe(NEAR_BLACK)
    expect(value('black')).toBe(NEAR_BLACK)
    expect(value('#000')).toBe(NEAR_BLACK)
  })

  it('keeps every other colour exactly as given', () => {
    expect(value('#000001')).toBe(1)
    expect(value('#ffffff')).toBe(0xffffff)
  })

  it('refuses things that are not colours', () => {
    rejects('nonsense')
    rejects('#12345')
    rejects('#1234567')
    rejects('#gggggg')
    rejects('rgb(1,2,3)')
  })
})

describe('formatColour', () => {
  it('writes it back the way somebody would type it', () => {
    expect(formatColour(0xe51b13)).toBe('#E51B13')
  })

  it('pads a small value rather than dropping digits', () => {
    expect(formatColour(1)).toBe('#000001')
  })

  it('round-trips anything parseColour accepts', () => {
    for (const input of ['#E51B13', '#000001', '#FFFFFF', 'blue', '#f0a']) {
      const parsed = value(input)
      expect(value(formatColour(parsed))).toBe(parsed)
    }
  })
})

describe('swatch', () => {
  it('picks the nearest square it has', () => {
    expect(swatch(0xff0000)).toBe('🟥')
    expect(swatch(0x00ff00)).toBe('🟩')
    expect(swatch(0x0000ff)).toBe('🟦')
    expect(swatch(0xffffff)).toBe('⬜')
  })

  it('still picks something for a colour it has no square for', () => {
    expect(swatch(0x123456)).toBeTruthy()
    expect(swatch(0x7f7f7f)).toBeTruthy()
  })
})

import { describe, expect, it } from 'vitest'
import { bar, barChart } from '../chart'

describe('bar', () => {
  it('fills the width at the maximum', () => {
    expect(bar(10, 10, 4)).toBe('████')
  })

  it('draws nothing for zero', () => {
    expect(bar(0, 10, 4)).toBe('')
  })

  it('gives a real value at least a sliver, however small', () => {
    // 1 of 1000 rounds to nothing without the floor, and then a source that did
    // bring somebody in looks identical to one that did not.
    expect(bar(1, 1000, 10)).toBe('▏')
  })

  it('uses partial blocks between whole ones', () => {
    expect(bar(5, 10, 4)).toBe('██')
    expect(bar(3, 10, 4)).toBe('█▎')
  })

  it('survives a maximum of zero', () => {
    expect(bar(0, 0, 6)).toBe('')
  })
})

describe('barChart', () => {
  it('orders widest first and shows counts and shares', () => {
    const out = barChart([
      { label: 'Campus Groups', value: 12 },
      { label: 'Website', value: 24 },
      { label: 'Handbook', value: 4 },
    ])
    const lines = out.split('\n')
    expect(lines[0]).toContain('Website')
    expect(lines[0]).toContain('24')
    expect(lines[0]).toContain('60%')
    expect(lines[1]).toContain('Campus Groups')
    expect(lines[2]).toContain('Handbook')
  })

  it('aligns bars into a column regardless of label length', () => {
    const out = barChart([
      { label: 'A', value: 100 },
      { label: 'Longer name', value: 7 },
    ])
    const barStart = (line: string) => line.search(/[█▏▎▍▌▋▊▉]/)
    const [first, second] = out.split('\n')
    expect(barStart(first!)).toBe(barStart(second!))
    expect(barStart(first!)).toBeGreaterThan(0)
  })

  it('breaks ties by label so the order does not wander between runs', () => {
    const out = barChart([
      { label: 'Zebra', value: 5 },
      { label: 'Alpha', value: 5 },
    ])
    expect(out.split('\n')[0]).toContain('Alpha')
  })

  it('truncates a label too long for its column', () => {
    const out = barChart([{ label: 'An extremely long source name indeed', value: 1 }], 10, 12)
    expect(out).toContain('An extremel…')
  })

  it('returns nothing for no slices', () => {
    expect(barChart([])).toBe('')
  })

  it('does not divide by zero when every slice is empty', () => {
    const out = barChart([
      { label: 'A', value: 0 },
      { label: 'B', value: 0 },
    ])
    expect(out).toContain('0%')
  })
})

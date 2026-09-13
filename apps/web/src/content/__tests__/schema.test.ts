import { describe, expect, it } from 'vitest'
import { committeeSchema } from '../schema'

function role(history: unknown) {
  return [{ role: 'President', about: 'Runs the club.', history }]
}

const valid = [
  { name: 'Current Person', from: '2026-07' },
  { name: 'Previous Person', from: '2025-03', to: '2026-06' },
]

describe('committee terms', () => {
  it('accepts a well-formed role', () => {
    expect(committeeSchema.safeParse(role(valid)).success).toBe(true)
  })

  it('rejects a month that is not YYYY-MM', () => {
    const result = committeeSchema.safeParse(role([{ name: 'A', from: 'Jul 2026' }]))
    expect(result.success).toBe(false)
  })

  it('rejects month 13', () => {
    expect(committeeSchema.safeParse(role([{ name: 'A', from: '2026-13' }])).success).toBe(false)
  })

  it('rejects a term that ends before it starts', () => {
    const result = committeeSchema.safeParse(
      role([
        { name: 'A', from: '2026-07' },
        { name: 'B', from: '2026-06', to: '2025-01' },
      ]),
    )
    expect(result.success).toBe(false)
  })

  it('rejects a role with nobody currently holding it', () => {
    const result = committeeSchema.safeParse(role([{ name: 'A', from: '2025-03', to: '2026-06' }]))
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error)).toContain('No current holder')
  })

  it('rejects two people holding one role at once', () => {
    const result = committeeSchema.safeParse(
      role([
        { name: 'A', from: '2026-07' },
        { name: 'B', from: '2025-03' },
      ]),
    )
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error)).toContain('cannot hold one role at once')
  })

  it('rejects overlapping terms', () => {
    const result = committeeSchema.safeParse(
      role([
        { name: 'A', from: '2026-07' },
        { name: 'B', from: '2025-03', to: '2026-08' },
      ]),
    )
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error)).toContain('overlapping terms')
  })

  it('accepts terms that sit back to back', () => {
    const result = committeeSchema.safeParse(
      role([
        { name: 'A', from: '2026-07' },
        { name: 'B', from: '2025-03', to: '2026-06' },
      ]),
    )
    expect(result.success).toBe(true)
  })
})

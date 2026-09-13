import { describe, expect, it } from 'vitest'
import { resolveCommittee } from '../committee'
import type { CommitteeRole } from '@/content/schema'

const now = new Date('2026-09-13T00:00:00Z')

const president: CommitteeRole = {
  role: 'President',
  about: 'Runs the club.',
  history: [
    { name: 'Owen Richardson', from: '2025-03', to: '2026-06' },
    { name: 'William Jackson', from: '2026-07' },
  ],
}

describe('resolveCommittee', () => {
  it('sorts history newest first regardless of how it was written', () => {
    // Deliberately oldest-first above: the content file should not have to care.
    const [role] = resolveCommittee([president], now)
    expect(role?.history.map((t) => t.name)).toEqual(['William Jackson', 'Owen Richardson'])
  })

  it('identifies the holder by the missing end date, not by position', () => {
    const [role] = resolveCommittee([president], now)
    expect(role?.holder.name).toBe('William Jackson')
    expect(role?.holder.current).toBe(true)
  })

  it('measures an ongoing term against today', () => {
    const [role] = resolveCommittee([president], now)
    expect(role?.holder.term).toBe('Jul 2026 to Present')
    expect(role?.holder.duration).toBe('3 mos')
  })

  it('keeps a finished term fixed', () => {
    const [role] = resolveCommittee([president], now)
    const previous = role?.history[1]
    expect(previous?.term).toBe('Mar 2025 to Jun 2026')
    expect(previous?.duration).toBe('1 yr 4 mos')
    expect(previous?.current).toBe(false)
  })

  it('grows the ongoing term as time passes, without any edit', () => {
    // The whole point of deriving it. Six months later, same content file.
    const later = resolveCommittee([president], new Date('2027-03-13T00:00:00Z'))
    expect(later[0]?.holder.duration).toBe('9 mos')
    expect(later[0]?.history[1]?.duration).toBe('1 yr 4 mos')
  })
})

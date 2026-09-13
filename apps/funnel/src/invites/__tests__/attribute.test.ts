import { describe, expect, it } from 'vitest'
import { attribute, type InviteSnapshot } from '../attribute'

const invite = (
  code: string,
  uses: number,
  inviterId: string | null = 'u1',
  maxUses = 0,
): InviteSnapshot => ({ code, uses, inviterId, maxUses })

describe('attribute', () => {
  it('names the invite whose count went up', () => {
    const result = attribute(
      [invite('abc', 4), invite('xyz', 9)],
      [invite('abc', 5), invite('xyz', 9)],
    )
    expect(result).toEqual({ confidence: 'certain', code: 'abc', inviterId: 'u1' })
  })

  it('carries the creator through, so the leaderboard has someone to credit', () => {
    const result = attribute([invite('abc', 0, 'inviter-7')], [invite('abc', 1, 'inviter-7')])
    expect(result).toMatchObject({ confidence: 'certain', inviterId: 'inviter-7' })
  })

  it('refuses to guess when two counts move at once', () => {
    const result = attribute(
      [invite('abc', 1), invite('xyz', 1)],
      [invite('abc', 2), invite('xyz', 2)],
    )
    expect(result).toEqual({ confidence: 'ambiguous', candidates: ['abc', 'xyz'] })
  })

  it('reports unknown when nothing moved at all', () => {
    // Server Discovery and Student Hub joins use no invite.
    const result = attribute([invite('abc', 4)], [invite('abc', 4)])
    expect(result).toEqual({ confidence: 'unknown' })
  })

  it('treats a vanished invite as the one that was spent', () => {
    // Discord deletes an invite the instant it hits max uses.
    const result = attribute([invite('abc', 4), invite('xyz', 2)], [invite('xyz', 2)])
    expect(result).toEqual({ confidence: 'certain', code: 'abc', inviterId: 'u1' })
  })

  it('counts an invite created and used between two reads', () => {
    const result = attribute([invite('abc', 4)], [invite('abc', 4), invite('new', 1, 'u2')])
    expect(result).toEqual({ confidence: 'certain', code: 'new', inviterId: 'u2' })
  })

  it('ignores an invite created but not yet used', () => {
    const result = attribute([invite('abc', 4)], [invite('abc', 4), invite('new', 0)])
    expect(result).toEqual({ confidence: 'unknown' })
  })

  it('separates the vanity URL from ordinary invites', () => {
    const result = attribute(
      [invite('abc', 4)],
      [invite('abc', 4)],
      { code: 'griffithict', uses: 10 },
      { code: 'griffithict', uses: 11 },
    )
    expect(result).toEqual({ confidence: 'vanity', code: 'griffithict' })
  })

  it('goes ambiguous when the vanity and an invite both move', () => {
    const result = attribute(
      [invite('abc', 4)],
      [invite('abc', 5)],
      { code: 'vanity', uses: 1 },
      { code: 'vanity', uses: 2 },
    )
    expect(result).toEqual({ confidence: 'ambiguous', candidates: ['abc', 'vanity'] })
  })

  it('does not treat a first vanity reading as a use', () => {
    const result = attribute([invite('abc', 4)], [invite('abc', 4)], null, { code: 'v', uses: 3 })
    expect(result).toEqual({ confidence: 'unknown' })
  })

  it('sorts candidates so the stored list is stable', () => {
    const result = attribute(
      [invite('zed', 1), invite('abc', 1)],
      [invite('zed', 2), invite('abc', 2)],
    )
    expect(result).toMatchObject({ candidates: ['abc', 'zed'] })
  })

  it('handles a count jumping by more than one', () => {
    // A join we processed late: the count moved twice before we read it.
    const result = attribute([invite('abc', 4)], [invite('abc', 6)])
    expect(result).toEqual({ confidence: 'certain', code: 'abc', inviterId: 'u1' })
  })

  it('survives an empty guild with no invites either side', () => {
    expect(attribute([], [])).toEqual({ confidence: 'unknown' })
  })

  it('ignores a count that went down, which means a reset not a join', () => {
    const result = attribute([invite('abc', 9)], [invite('abc', 0)])
    expect(result).toEqual({ confidence: 'unknown' })
  })
})

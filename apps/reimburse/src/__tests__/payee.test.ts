import { describe, expect, it } from 'vitest'
import { formatBankCode, maskAccount, parsePayee } from '../payee'

const ok = (name: string, code: string, account: string) => {
  const result = parsePayee(name, code, account)
  if (!result.ok) throw new Error(`expected success: ${result.error}`)
  return result.details
}

const rejects = (name: string, code: string, account: string) => {
  expect(parsePayee(name, code, account).ok).toBe(false)
}

describe('parsePayee', () => {
  it('takes the details as typed', () => {
    expect(ok('Ada Lovelace', '123456', '12345678')).toEqual({
      accountName: 'Ada Lovelace',
      bankCode: '123456',
      accountNumber: '12345678',
    })
  })

  it('normalises the punctuation people put in a BSB', () => {
    // 123-456 and 123 456 must land identically, or a treasurer comparing two
    // claims sees a difference that is not really there.
    expect(ok('A B', '123-456', '1234 5678').bankCode).toBe('123456')
    expect(ok('A B', '123 456', '1234-5678').accountNumber).toBe('12345678')
  })

  it('collapses runs of spaces in the name', () => {
    expect(ok('Ada    Lovelace', '123456', '12345678').accountName).toBe('Ada Lovelace')
  })

  it('accepts code lengths other than an Australian BSB', () => {
    // A six digit rule would work here and lock out every other country.
    expect(ok('A B', '0400', '12345678').bankCode).toBe('0400')
    expect(ok('A B', '12345678901', '12345678').bankCode).toBe('12345678901')
  })

  it('rejects a missing or too-short name', () => {
    rejects('', '123456', '12345678')
    rejects(' A ', '123456', '12345678')
  })

  it('rejects letters in the numbers', () => {
    rejects('A B', 'ABC456', '12345678')
    rejects('A B', '123456', '1234ABCD')
  })

  it('rejects numbers that are obviously wrong lengths', () => {
    rejects('A B', '12', '12345678')
    rejects('A B', '123456', '123')
    rejects('A B', '123456', '1'.repeat(21))
  })
})

describe('maskAccount', () => {
  it('leaves the last three digits visible', () => {
    expect(maskAccount('12345678')).toBe('•••••678')
  })

  it('hides a very short number entirely', () => {
    expect(maskAccount('123')).toBe('•••')
  })
})

describe('formatBankCode', () => {
  it('splits a six digit code the way a BSB is read', () => {
    expect(formatBankCode('123456')).toBe('123-456')
  })

  it('leaves other lengths alone rather than inventing a grouping', () => {
    expect(formatBankCode('0400')).toBe('0400')
  })
})

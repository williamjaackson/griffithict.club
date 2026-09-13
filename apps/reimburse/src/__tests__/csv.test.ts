import { describe, expect, it } from 'vitest'
import { decimalAmount, escapeCell, isoDate, toCsv } from '../csv'

describe('escapeCell', () => {
  it('leaves plain text alone', () => {
    expect(escapeCell('Pizza')).toBe('Pizza')
  })

  it('quotes a value containing a comma', () => {
    expect(escapeCell('Pizza, chips')).toBe('"Pizza, chips"')
  })

  it('doubles quotes inside a quoted value', () => {
    expect(escapeCell('He said "hi"')).toBe('"He said ""hi"""')
  })

  it('quotes a value containing a newline', () => {
    expect(escapeCell('one\ntwo')).toBe('"one\ntwo"')
  })

  it('defuses a cell a spreadsheet would run as a formula', () => {
    // A description is whatever somebody typed into a modal. Opened in Excel,
    // this is a live formula rather than text.
    expect(escapeCell('=HYPERLINK("http://evil","click")')).toBe(
      '"\'=HYPERLINK(""http://evil"",""click"")"',
    )
    expect(escapeCell('+1234')).toBe("'+1234")
    expect(escapeCell('-1+1')).toBe("'-1+1")
    expect(escapeCell('@SUM(A1)')).toBe("'@SUM(A1)")
  })

  it('does not mangle a negative number that is genuinely a number', () => {
    // Prefixed, deliberately. A spreadsheet reading -5 as a number is fine, but
    // telling one from a formula by eye is not worth the risk on a text column.
    expect(escapeCell(-5)).toBe("'-5")
  })

  it('renders null and undefined as empty', () => {
    expect(escapeCell(null)).toBe('')
    expect(escapeCell(undefined)).toBe('')
  })
})

describe('toCsv', () => {
  const rows = [
    { ref: 1, what: 'Pizza, large', amount: 2166 },
    { ref: 2, what: 'Drinks', amount: 500 },
  ]
  const columns = [
    { header: 'Reference', value: (r: (typeof rows)[number]) => r.ref },
    { header: 'Description', value: (r: (typeof rows)[number]) => r.what },
    { header: 'Amount', value: (r: (typeof rows)[number]) => decimalAmount(r.amount) },
  ]

  it('writes a header and a line per row', () => {
    const body = toCsv(rows, columns).replace('﻿', '')
    expect(body.split('\r\n').filter(Boolean)).toEqual([
      'Reference,Description,Amount',
      '1,"Pizza, large",21.66',
      '2,Drinks,5.00',
    ])
  })

  it('starts with a BOM so Excel reads it as UTF-8', () => {
    // Without it, Excel uses the local codepage and mangles every accented name.
    expect(toCsv(rows, columns).startsWith('﻿')).toBe(true)
  })

  it('uses CRLF, which is what RFC 4180 and Excel expect', () => {
    expect(toCsv(rows, columns)).toContain('\r\n')
  })

  it('still writes the header when there are no rows', () => {
    expect(toCsv([], columns).replace('﻿', '')).toBe('Reference,Description,Amount\r\n')
  })
})

describe('decimalAmount', () => {
  it('writes money a spreadsheet can add up', () => {
    expect(decimalAmount(2166)).toBe('21.66')
    expect(decimalAmount(500)).toBe('5.00')
    expect(decimalAmount(5)).toBe('0.05')
  })
})

describe('isoDate', () => {
  it('writes a date that sorts and cannot be misread', () => {
    expect(isoDate(new Date('2026-09-14T03:21:00Z'))).toBe('2026-09-14')
  })
})

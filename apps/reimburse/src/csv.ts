/**
 * Turning rows into a CSV a treasurer can open.
 *
 * The escaping is the boring half. The interesting half is that a spreadsheet
 * treats a cell beginning with =, +, - or @ as a formula, and these cells carry
 * text somebody typed into a Discord modal. A description of
 * `=HYPERLINK("http://...", "click")` is a live link the moment the file opens,
 * and worse is possible. Those cells get a leading apostrophe, which Excel and
 * Sheets both read as "this is text" and neither shows.
 */

const NEEDS_QUOTING = /[",\n\r]/
const LOOKS_LIKE_A_FORMULA = /^[=+\-@\t\r]/

export function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''

  const text = String(value)
  const safe = LOOKS_LIKE_A_FORMULA.test(text) ? `'${text}` : text

  return NEEDS_QUOTING.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export type Column<Row> = { header: string; value: (row: Row) => string | number | null }

export function toCsv<Row>(rows: readonly Row[], columns: readonly Column<Row>[]): string {
  const lines = [columns.map((column) => escapeCell(column.header)).join(',')]

  for (const row of rows) {
    lines.push(columns.map((column) => escapeCell(column.value(row))).join(','))
  }

  /*
   * CRLF, because RFC 4180 says so and because Excel on Windows renders a
   * bare LF file as one long line. A BOM for the same reason: without it Excel
   * reads UTF-8 as the local codepage and mangles every name with an accent.
   */
  return `﻿${lines.join('\r\n')}\r\n`
}

/** YYYY-MM-DD, which sorts correctly and cannot be read as the wrong month. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Money as a plain decimal, because a spreadsheet cannot add up "$12.50". */
export function decimalAmount(cents: number): string {
  return (cents / 100).toFixed(2)
}

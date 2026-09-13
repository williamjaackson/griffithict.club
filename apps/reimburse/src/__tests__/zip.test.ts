import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createZip, safeName } from '../zip'

/**
 * Checked with the system unzip rather than by reading the bytes back with the
 * same code that wrote them. An archive only this module can open is exactly
 * the failure worth catching, and reading it back with the writer's own
 * assumptions would not catch it.
 */
function roundTrip(entries: { name: string; data: Buffer }[]) {
  const dir = mkdtempSync(join(tmpdir(), 'zip-'))
  const archive = join(dir, 'out.zip')
  writeFileSync(archive, createZip(entries))

  execFileSync('unzip', ['-t', archive], { stdio: 'pipe' })
  execFileSync('unzip', ['-o', '-q', archive, '-d', dir], { stdio: 'pipe' })

  return (name: string) => readFileSync(join(dir, name))
}

describe('createZip', () => {
  it('writes an archive the system unzip accepts', () => {
    const read = roundTrip([{ name: 'hello.txt', data: Buffer.from('hello', 'utf8') }])
    expect(read('hello.txt').toString('utf8')).toBe('hello')
  })

  it('round-trips several files, including binary', () => {
    const binary = Buffer.from([0, 1, 2, 253, 254, 255, 0, 0, 128])
    const read = roundTrip([
      { name: 'a.txt', data: Buffer.from('first', 'utf8') },
      { name: 'receipts/b.bin', data: binary },
      { name: 'c.csv', data: Buffer.from('x,y\r\n1,2\r\n', 'utf8') },
    ])

    expect(read('a.txt').toString('utf8')).toBe('first')
    expect(read('receipts/b.bin').equals(binary)).toBe(true)
    expect(read('c.csv').toString('utf8')).toBe('x,y\r\n1,2\r\n')
  })

  it('keeps a non-ASCII filename readable', () => {
    const read = roundTrip([{ name: 'cafe-recu.txt', data: Buffer.from('ok', 'utf8') }])
    expect(read('cafe-recu.txt').toString('utf8')).toBe('ok')
  })

  it('handles an empty file without corrupting what follows', () => {
    const read = roundTrip([
      { name: 'empty.txt', data: Buffer.alloc(0) },
      { name: 'after.txt', data: Buffer.from('still here', 'utf8') },
    ])
    expect(read('empty.txt').byteLength).toBe(0)
    expect(read('after.txt').toString('utf8')).toBe('still here')
  })

  it('writes a timestamp unzip renders as a real date', () => {
    // Zero is legal and shows as 00-00-1980, which reads as a corrupt archive.
    const dir = mkdtempSync(join(tmpdir(), 'zip-'))
    const archive = join(dir, 'dated.zip')
    writeFileSync(
      archive,
      createZip([
        { name: 'a.txt', data: Buffer.from('x'), modified: new Date(2026, 8, 14, 10, 30, 0) },
      ]),
    )
    const listing = execFileSync('unzip', ['-l', archive], { encoding: 'utf8' })
    expect(listing).toContain('2026')
    expect(listing).not.toContain('1980')
  })

  it('survives a file bigger than a receipt actually is', () => {
    const big = Buffer.alloc(1_500_000, 7)
    const read = roundTrip([{ name: 'big.bin', data: big }])
    expect(read('big.bin').equals(big)).toBe(true)
  })
})

describe('safeName', () => {
  it('flattens path separators so nothing escapes the archive', () => {
    expect(safeName('../../etc/passwd')).toBe('etc-passwd')
    expect(safeName('a\\b.jpg')).toBe('a-b.jpg')
  })

  it('leaves no separator behind, whatever the input', () => {
    // The property that actually matters. The tidiness above is cosmetic.
    for (const nasty of ['../../etc/passwd', 'a/b/c', 'x\\y', '/////', '..\\..\\win.ini']) {
      expect(safeName(nasty)).not.toMatch(/[/\\]/)
    }
  })

  it('drops characters Windows refuses', () => {
    expect(safeName('in:valid?.jpg')).toBe('invalid.jpg')
  })

  it('drops control characters', () => {
    expect(safeName(`a${String.fromCharCode(9)}b.jpg`)).toBe('ab.jpg')
  })

  it('never returns an empty name', () => {
    expect(safeName('...')).toBe('file')
    expect(safeName('   ')).toBe('file')
  })

  it('leaves an ordinary name alone', () => {
    expect(safeName('IMG_3002.jpg')).toBe('IMG_3002.jpg')
  })
})

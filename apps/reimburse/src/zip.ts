import { crc32 } from 'node:zlib'

/**
 * A minimal ZIP writer, storing files uncompressed.
 *
 * Hand-written rather than pulled in, for two reasons. Receipts are JPEGs and
 * PDFs, already compressed, so deflating them buys a percent or two and costs
 * the only part of this that could go subtly wrong. And the format's stored
 * case is small enough to read in one sitting, which matters more than a
 * dependency saved: an archive a treasurer cannot open is a bad week.
 *
 * Correctness is checked against the system unzip, not against itself.
 *
 * No Zip64. Discord will not take an attachment anywhere near the 4GB where
 * that begins to matter.
 */

export type ZipEntry = { name: string; data: Buffer; modified?: Date }

/**
 * MS-DOS packed date and time, which is what a ZIP entry carries.
 *
 * Zero is a legal value and unzip renders it as 00-00-1980, which reads as a
 * corrupt archive to anybody who opens one. Seconds have one bit less than they
 * need, hence the halving; the format has been like that since 1980.
 */
function dosStamp(date: Date): { time: number; date: number } {
  const year = Math.max(1980, date.getFullYear())
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  }
}

const LOCAL_HEADER = 0x04034b50
const CENTRAL_HEADER = 0x02014b50
const END_OF_CENTRAL = 0x06054b50

/** Stored, not deflated. */
const METHOD_STORE = 0

/** Tells a reader the names are UTF-8, not the 1980s default codepage. */
const FLAG_UTF8 = 0x800

export function createZip(entries: readonly ZipEntry[]): Buffer {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8')
    const checksum = crc32(entry.data)
    const size = entry.data.byteLength
    const stamp = dosStamp(entry.modified ?? new Date())

    const local = Buffer.alloc(30)
    local.writeUInt32LE(LOCAL_HEADER, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(FLAG_UTF8, 6)
    local.writeUInt16LE(METHOD_STORE, 8)
    local.writeUInt16LE(stamp.time, 10)
    local.writeUInt16LE(stamp.date, 12)
    local.writeUInt32LE(checksum, 14)
    local.writeUInt32LE(size, 18)
    local.writeUInt32LE(size, 22)
    local.writeUInt16LE(name.byteLength, 26)
    local.writeUInt16LE(0, 28)

    locals.push(local, name, entry.data)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(CENTRAL_HEADER, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(FLAG_UTF8, 8)
    central.writeUInt16LE(METHOD_STORE, 10)
    central.writeUInt16LE(stamp.time, 12)
    central.writeUInt16LE(stamp.date, 14)
    central.writeUInt32LE(checksum, 16)
    central.writeUInt32LE(size, 20)
    central.writeUInt32LE(size, 24)
    central.writeUInt16LE(name.byteLength, 28)
    central.writeUInt16LE(0, 30)
    central.writeUInt16LE(0, 32)
    central.writeUInt16LE(0, 34)
    central.writeUInt16LE(0, 36)
    central.writeUInt32LE(0, 38)
    central.writeUInt32LE(offset, 42)

    centrals.push(central, name)
    offset += local.byteLength + name.byteLength + size
  }

  const directory = Buffer.concat(centrals)

  const end = Buffer.alloc(22)
  end.writeUInt32LE(END_OF_CENTRAL, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(directory.byteLength, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)

  return Buffer.concat([...locals, directory, end])
}

/** Characters Windows will not accept in a filename. */
const FORBIDDEN = new Set(['<', '>', ':', '"', '|', '?', '*'])

/**
 * Make a filename safe to write wherever the archive is opened.
 *
 * A receipt is called whatever the claimant's phone called it. A path separator
 * in there would put the entry somewhere unexpected on extraction, and a
 * control character can confuse the shell of whoever unpacks it.
 */
export function safeName(name: string): string {
  let cleaned = ''

  for (const character of name) {
    const code = character.codePointAt(0) ?? 0
    if (character === '/' || character === '\\') cleaned += '-'
    else if (FORBIDDEN.has(character)) continue
    else if (code < 0x20 || code === 0x7f) continue
    else cleaned += character
  }

  // The whole leading run, not just the dots: ../../etc/passwd flattens to
  // ..-..-etc-passwd, and trimming only dots would leave it starting with a
  // dash, which some tools read as the start of an option.
  cleaned = cleaned.replace(/^[.-]+/, '').trim()
  return cleaned === '' ? 'file' : cleaned.slice(0, 100)
}

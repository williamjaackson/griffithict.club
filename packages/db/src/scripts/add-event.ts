/**
 * Adds or updates an event from the command line.
 *
 * `pnpm db:event` beats the Drizzle Studio path in the runbook for anything you
 * want to repeat or review: it is a command you can paste into a pull request,
 * and it does not need a GUI over an SSH tunnel.
 *
 * Idempotent on `slug`, so re-running with a corrected time fixes the row rather
 * than creating a second event with the same name.
 *
 * Times are Brisbane, because that is where the events are. Queensland has no
 * daylight saving, so the offset is always +10:00 and this needs no timezone
 * database to be correct.
 */
import { parseArgs } from 'node:util'
import { sql } from 'drizzle-orm'
import { createDatabase } from '../client'
import { loadRootEnv } from '../env'
import { events } from '../schema'

loadRootEnv()

const BRISBANE_OFFSET = '+10:00'

/** `2026-09-15 18:30` in Brisbane, to a UTC instant. */
function parseBrisbane(input: string): Date {
  const match = input.trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})$/)
  if (!match) {
    throw new Error(`Expected a time like "2026-09-15 18:30", got "${input}"`)
  }

  const date = new Date(`${match[1]}T${match[2]}:00${BRISBANE_OFFSET}`)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`"${input}" is not a real date`)
  }

  return date
}

/** `Tech Social` to `tech-social`. */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const USAGE = `
Usage: pnpm db:event --title "..." --starts "2026-09-15 18:30" [options]

  --title         Required. Event name.
  --starts        Required. Brisbane local time, "YYYY-MM-DD HH:MM".
  --ends          Brisbane local time.
  --location      Where it is, e.g. "G23_1.14, Griffith Gold Coast".
  --summary       One line, used for the page description and link previews.
  --description   Longer body. Use \\n for paragraph breaks.
  --url           Registration link. Defaults to the Discord on the site.
  --slug          Defaults to a slug made from the title.
  --status        draft | published | cancelled. Defaults to draft.
  --publish-at    Brisbane local time. Hold a published event back until then, so
                  a run of events can be queued and revealed one at a time.
`

async function main() {
  const { values } = parseArgs({
    options: {
      title: { type: 'string' },
      starts: { type: 'string' },
      ends: { type: 'string' },
      location: { type: 'string' },
      summary: { type: 'string' },
      description: { type: 'string' },
      url: { type: 'string' },
      slug: { type: 'string' },
      status: { type: 'string' },
      'publish-at': { type: 'string' },
      help: { type: 'boolean' },
    },
  })

  if (values.help || !values.title || !values.starts) {
    console.log(USAGE)
    process.exit(values.help ? 0 : 1)
  }

  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')

  const status = values.status ?? 'draft'
  if (!['draft', 'published', 'cancelled'].includes(status)) {
    throw new Error(`--status must be draft, published or cancelled, got "${status}"`)
  }

  const slug = values.slug ?? slugify(values.title)
  const startsAt = parseBrisbane(values.starts)
  const endsAt = values.ends ? parseBrisbane(values.ends) : null
  const publishAt = values['publish-at'] ? parseBrisbane(values['publish-at']) : null

  if (endsAt && endsAt <= startsAt) {
    throw new Error('--ends is not after --starts')
  }

  const db = createDatabase(url, 1)
  const row = {
    slug,
    title: values.title,
    summary: values.summary ?? null,
    description: values.description?.replace(/\\n/g, '\n') ?? null,
    startsAt,
    endsAt,
    location: values.location ?? null,
    registrationUrl: values.url ?? null,
    status: status as 'draft' | 'published' | 'cancelled',
    publishAt,
  }

  await db
    .insert(events)
    .values(row)
    .onConflictDoUpdate({
      target: events.slug,
      set: { ...row, updatedAt: sql`now()` },
    })

  console.log(`${status === 'published' ? 'Published' : `Saved (${status})`}: ${slug}`)
  console.log(`  ${startsAt.toISOString()}  (${values.starts} Brisbane)`)
  if (status !== 'published') {
    console.log('  Not visible on the site until --status published')
  } else if (publishAt && publishAt > new Date()) {
    console.log(`  Hidden until ${publishAt.toISOString()} (${values['publish-at']} Brisbane)`)
  }
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  },
)

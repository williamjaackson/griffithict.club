/**
 * Applies pending migrations, then exits.
 *
 * Runs as a one-shot container ahead of the app (see infra/compose.yml). Uses the
 * runtime migrator rather than `drizzle-kit migrate` so production never needs
 * drizzle-kit installed.
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { sql } from 'drizzle-orm'
import { createDatabase } from './client'
import { loadRootEnv } from './env'

loadRootEnv()

/** Arbitrary but fixed. Any other migrator must use the same number to queue behind us. */
const ADVISORY_LOCK_KEY = 4_815_162_342

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL is not set')
    process.exit(1)
  }

  const db = createDatabase(url, 1)
  const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), '..', 'drizzle')

  // Drizzle's migrator takes no lock of its own, so two services starting at once
  // would both try to apply the same file. The second one waits here instead.
  await db.execute(sql`SELECT pg_advisory_lock(${ADVISORY_LOCK_KEY})`)
  try {
    await migrate(db, { migrationsFolder })
    console.log('Migrations up to date')
  } finally {
    await db.execute(sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_KEY})`)
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error('Migration failed:', error)
    // Non-zero stops the deploy before the app is recreated, so the old container
    // keeps serving. A failed migration is not an outage.
    process.exit(1)
  },
)

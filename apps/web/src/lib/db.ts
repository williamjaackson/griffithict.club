import 'server-only'

import { createDatabase, type Database } from '@gict/db'

let cached: Database | undefined

/**
 * The shared Postgres connection.
 *
 * Lazy on purpose. `next build` runs in CI where there is no database, so nothing
 * here may be constructed at module load — importing this file must stay free.
 * Every caller sits behind a Suspense boundary that defers to request time.
 */
export function db(): Database {
  if (!cached) {
    const url = process.env.DATABASE_URL
    if (!url) {
      throw new Error(
        'DATABASE_URL is not set. Start Postgres with `docker compose -f infra/compose.dev.yml up -d`.',
      )
    }
    cached = createDatabase(url)
  }

  return cached
}

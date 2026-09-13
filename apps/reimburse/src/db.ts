import { createDatabase, type Database } from '@gict/db'

let instance: Database | null = null

/** One pool for the process. Opened on first use. */
export function db(url: string): Database {
  instance ??= createDatabase(url)
  return instance
}

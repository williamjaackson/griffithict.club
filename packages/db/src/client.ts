import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

export type Database = ReturnType<typeof createDatabase>

/**
 * Build a Drizzle client. Callers own the pool's lifetime.
 *
 * Small pool on purpose: one VPS, a handful of services, and Postgres defaults to
 * 100 connections total. A club site does not need more than this and running out
 * of connections is a miserable thing to debug.
 */
export function createDatabase(connectionString: string, max = 5) {
  const pool = new Pool({ connectionString, max })
  return drizzle(pool, { schema })
}

export { schema }

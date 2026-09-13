import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

/** Readiness. For the external uptime monitor, not for Docker's healthcheck. */
export async function GET() {
  try {
    await db().execute(sql`SELECT 1`)
    return Response.json({ ok: true, database: 'up' })
  } catch (error) {
    console.error('Database health check failed:', error)
    return Response.json({ ok: false, database: 'down' }, { status: 503 })
  }
}

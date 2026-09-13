/**
 * Liveness only. Deliberately does not touch the database.
 *
 * Docker restarts the container when this fails, so a Postgres blip must not be
 * able to trigger a restart loop. `/api/health/db` is the deeper check, for the
 * external uptime monitor.
 */
export async function GET() {
  return Response.json({ ok: true })
}

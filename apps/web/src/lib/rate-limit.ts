import 'server-only'

type Bucket = { tokens: number; refilledAt: number }

const buckets = new Map<string, Bucket>()

/**
 * In-memory token bucket, keyed by caller IP.
 *
 * Deliberately not Redis. One container, one process, and the thing being
 * protected is a Discord webhook that rate-limits around 30 messages a minute
 * anyway. If this ever runs on two containers the limit doubles, which is still
 * far below what Discord will accept.
 *
 * State is lost on restart. That is fine — a deploy is not an attack window worth
 * engineering around.
 */
export function rateLimit(key: string, limit = 3, windowMs = 60 * 60 * 1000): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now - bucket.refilledAt > windowMs) {
    buckets.set(key, { tokens: limit - 1, refilledAt: now })
    return true
  }

  if (bucket.tokens <= 0) return false

  bucket.tokens -= 1
  return true
}

/** Drops buckets that have aged out, so a long-running process does not grow forever. */
export function pruneRateLimits(windowMs = 60 * 60 * 1000): void {
  const cutoff = Date.now() - windowMs
  for (const [key, bucket] of buckets) {
    if (bucket.refilledAt < cutoff) buckets.delete(key)
  }
}

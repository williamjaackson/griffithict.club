import type { MetadataRoute } from 'next'
import { connection } from 'next/server'
import { site } from '@/content'
import { getPublishedEvents } from '@/lib/events'

/**
 * Built per request. `connection()` keeps the database out of `next build`, which
 * runs in CI with no Postgres, and a sitemap is hit rarely enough that caching it
 * would be solving a problem nobody has.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: site.url, changeFrequency: 'weekly', priority: 1 },
    { url: `${site.url}/events`, changeFrequency: 'weekly', priority: 0.8 },
  ]

  try {
    const events = await getPublishedEvents()
    return [
      ...staticRoutes,
      ...events.map((event) => ({
        url: `${site.url}/events/${event.slug}`,
        lastModified: event.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      })),
    ]
  } catch {
    // A sitemap missing its event URLs beats a 500 that makes crawlers back off.
    return staticRoutes
  }
}

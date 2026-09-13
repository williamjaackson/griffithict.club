import type { MetadataRoute } from 'next'
import { site } from '@/content'

/** Events have no page of their own, so the listing is the only URL to offer. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: site.url, changeFrequency: 'weekly', priority: 1 },
    { url: `${site.url}/events`, changeFrequency: 'weekly', priority: 0.8 },
  ]
}

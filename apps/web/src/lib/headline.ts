import type { Site } from '@/content/schema'

/** The headline as one string, for the page title and social cards. */
export function taglineOf(site: Site): string {
  return site.headline.lines.join(' ')
}

/**
 * A headline line split around the emphasised words, so the hero can colour the
 * middle piece without the wording being written out a second time in JSX.
 *
 * Returns `null` for lines that do not contain the emphasis.
 */
export function splitHighlight(
  line: string,
  highlight: string,
): { before: string; match: string; after: string } | null {
  const at = line.indexOf(highlight)
  if (at === -1) return null

  return {
    before: line.slice(0, at),
    match: highlight,
    after: line.slice(at + highlight.length),
  }
}

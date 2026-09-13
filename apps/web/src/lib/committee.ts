import type { CommitteeRole } from '@/content/schema'
import { formatDuration, formatTerm, monthOf, termMonths } from './term'

export type ResolvedTerm = {
  name: string
  /** Headshot path, if this person has one. */
  photo?: string
  /** `Jul 2026 to Present` */
  term: string
  /** `1 yr 4 mos` */
  duration: string
  current: boolean
}

export type ResolvedRole = {
  role: string
  about: string
  /** Whoever holds it now. Named, rather than left as `history[0]` for callers to assume. */
  holder: ResolvedTerm
  /** Newest first. */
  history: ResolvedTerm[]
}

/**
 * Turns the two dates on each term into everything the UI shows.
 *
 * Takes `now` rather than reading the clock, so the ongoing term's length can be
 * tested and so the caller decides how long the result stays cached.
 */
export function resolveCommittee(roles: CommitteeRole[], now: Date): ResolvedRole[] {
  const thisMonth = monthOf(now)

  return roles.map((role) => {
    const history = [...role.history]
      // Sorted here, so "newest first" is a guarantee rather than a convention
      // the content files are trusted to follow.
      .sort((a, b) => b.from.localeCompare(a.from))
      .map((entry) => ({
        name: entry.name,
        photo: entry.photo,
        term: formatTerm(entry.from, entry.to),
        duration: formatDuration(termMonths(entry.from, entry.to ?? thisMonth)),
        current: !entry.to,
      }))

    // The schema guarantees exactly one term without a `to`.
    const holder = history.find((t) => t.current)
    if (!holder) {
      throw new Error(`No current holder for ${role.role}`)
    }

    return { role: role.role, about: role.about, holder, history }
  })
}

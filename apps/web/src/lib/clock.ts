import { cacheLife } from 'next/cache'
import { committee } from '@/content'
import { resolveCommittee, type ResolvedRole } from './committee'
import { sponsorshipPeriods } from './sponsorship-period'

/*
 * Values derived from the current date, cached with a lifetime.
 *
 * Reading the clock during a prerender bakes the build date into the HTML, and
 * both of these are wrong for up to a year once that happens. Neither changes more
 * than annually, so a daily revalidate is plenty and keeps the page static.
 */

/** The sponsorship years currently open for sign-up. */
export async function currentSponsorshipPeriods(): Promise<string[]> {
  'use cache'
  cacheLife('days')
  return sponsorshipPeriods()
}

/** Year for the footer copyright line. */
export async function currentYear(): Promise<number> {
  'use cache'
  cacheLife('days')
  return new Date().getUTCFullYear()
}

/**
 * Committee roles with their terms worked out.
 *
 * The ongoing term's length depends on today's date, so this cannot be computed
 * during a prerender without freezing the build date into the page. A day is
 * plenty: the only thing that changes is a month rolling over.
 */
export async function currentCommittee(): Promise<ResolvedRole[]> {
  'use cache'
  cacheLife('days')
  return resolveCommittee(committee, new Date())
}

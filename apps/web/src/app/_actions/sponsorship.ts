'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { sponsorshipEnquiries } from '@gict/db'
import { sponsorship } from '@/content'
import { db } from '@/lib/db'
import { postSponsorshipEnquiry } from '@/lib/discord'
import { rateLimit } from '@/lib/rate-limit'
import { sponsorshipPeriods } from '@/lib/sponsorship-period'

export type SponsorshipResult = { ok: true } | { ok: false; error: string }

/*
 * Lengths are capped rather than left open. This endpoint is unauthenticated and
 * forwards into the club's Discord, where a 40KB paste gets the whole payload
 * rejected.
 */
const schema = z.object({
  tier: z.enum(sponsorship.tiers.map((t) => t.name) as [string, ...string[]]),
  period: z.string().min(1).max(60),
  organisation: z.string().trim().min(1).max(200),
  contactName: z.string().trim().min(1).max(200),
  email: z.email().max(320),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  message: z.string().trim().max(2000).optional().or(z.literal('')),
  // Hidden field. Real people leave it empty; bots fill everything in.
  website: z.string().max(0).optional(),
})

export async function submitSponsorshipEnquiry(formData: FormData): Promise<SponsorshipResult> {
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, error: 'Please check the form and try again.' }
  }

  const { website, ...enquiry } = parsed.data

  // Honeypot. Report success so the bot has nothing to tune against.
  if (website) return { ok: true }

  if (!sponsorshipPeriods().includes(enquiry.period)) {
    return { ok: false, error: 'That sponsorship period is not open.' }
  }

  const headerList = await headers()
  const ip = headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!rateLimit(`sponsorship:${ip}`)) {
    return { ok: false, error: 'Too many enquiries from this address. Try again later.' }
  }

  const delivered = await postSponsorshipEnquiry(enquiry)

  // Stored regardless of whether Discord accepted it. deliveredAt is null when it
  // did not, which is the row worth checking after a webhook outage.
  await db()
    .insert(sponsorshipEnquiries)
    .values({
      ...enquiry,
      phone: enquiry.phone || null,
      message: enquiry.message || null,
      deliveredAt: delivered ? new Date() : null,
    })

  return { ok: true }
}

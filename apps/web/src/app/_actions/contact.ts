'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { contactEnquiries } from '@gict/db'
import { contact } from '@/content'
import { db } from '@/lib/db'
import { postContactEnquiry } from '@/lib/discord'
import { rateLimit } from '@/lib/rate-limit'

export type ContactResult = { ok: true } | { ok: false; error: string }

/*
 * Lengths are capped rather than left open. This is an unauthenticated endpoint
 * that forwards into the club's Discord, where a 40KB paste gets the whole
 * payload rejected.
 */
const schema = z.object({
  // Only the topics the form actually offers, so the select cannot be edited in
  // devtools into something arbitrary.
  topic: z.enum(contact.topics as [string, ...string[]]),
  name: z.string().trim().min(1).max(200),
  email: z.email().max(320),
  message: z.string().trim().min(1).max(2000),
  // Hidden field. Real people leave it empty; bots fill everything in.
  website: z.string().max(0).optional(),
})

export async function submitContactEnquiry(formData: FormData): Promise<ContactResult> {
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, error: 'Please check the form and try again.' }
  }

  const { website, ...enquiry } = parsed.data

  // Report success so the bot has nothing to tune against.
  if (website) return { ok: true }

  const headerList = await headers()
  const ip = headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!rateLimit(`contact:${ip}`)) {
    return { ok: false, error: 'Too many messages from this address. Try again later.' }
  }

  const delivered = await postContactEnquiry(enquiry)

  // Stored regardless of whether Discord accepted it. deliveredAt is null when it
  // did not, which is the row worth checking after a webhook outage.
  await db()
    .insert(contactEnquiries)
    .values({ ...enquiry, deliveredAt: delivered ? new Date() : null })

  return { ok: true }
}

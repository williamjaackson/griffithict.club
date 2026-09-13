import 'server-only'

import type { NewSponsorshipEnquiry } from '@gict/db'

const BRAND_RED = 0xe51b13

/**
 * Posts a sponsorship enquiry into the committee's Discord channel.
 *
 * Returns whether Discord accepted it. The caller stores the enquiry either way —
 * this is the notification, not the record, and the webhook dies quietly the day
 * someone deletes the channel.
 */
export async function postSponsorshipEnquiry(enquiry: NewSponsorshipEnquiry): Promise<boolean> {
  const webhook = process.env.DISCORD_WEBHOOK_URL
  if (!webhook) {
    console.warn('DISCORD_WEBHOOK_URL is not set; enquiry stored but not announced')
    return false
  }

  const fields = [
    { name: 'Organisation', value: enquiry.organisation, inline: true },
    { name: 'Tier', value: enquiry.tier, inline: true },
    { name: 'Period', value: enquiry.period, inline: false },
    { name: 'Contact', value: enquiry.contactName, inline: true },
    { name: 'Email', value: enquiry.email, inline: true },
  ]

  if (enquiry.phone) fields.push({ name: 'Phone', value: enquiry.phone, inline: true })
  if (enquiry.message) {
    // Discord rejects the whole payload if a field value exceeds 1024 characters.
    fields.push({
      name: 'Notes',
      value: enquiry.message.slice(0, 1000),
      inline: false,
    })
  }

  try {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title: `Sponsorship enquiry — ${enquiry.tier}`,
            color: BRAND_RED,
            fields,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      console.error(`Discord webhook returned ${response.status}`)
      return false
    }

    return true
  } catch (error) {
    console.error('Discord webhook failed:', error)
    return false
  }
}

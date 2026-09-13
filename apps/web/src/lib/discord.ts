import 'server-only'

import type { NewSponsorshipEnquiry } from '@gict/db'

const BRAND_RED = 0xe51b13

/**
 * Posts a sponsorship enquiry into the committee's Discord channel.
 *
 * Returns whether Discord accepted it. The caller stores the enquiry either way —
 * this is the notification, not the record, and the webhook dies quietly the day
 * someone deletes the channel.
 *
 * The webhook URL is a secret and lives only in the host's env file. The role to
 * ping is not a secret, so it sits in config beside it.
 */
export async function postSponsorshipEnquiry(enquiry: NewSponsorshipEnquiry): Promise<boolean> {
  const webhook = process.env.DISCORD_WEBHOOK_URL
  if (!webhook) {
    console.warn('DISCORD_WEBHOOK_URL is not set; enquiry stored but not announced')
    return false
  }

  const roleId = process.env.DISCORD_SPONSORSHIP_ROLE_ID

  const fields: { name: string; value: string; inline: boolean }[] = [
    { name: 'Organisation', value: enquiry.organisation, inline: true },
    { name: 'Tier', value: enquiry.tier, inline: true },
    { name: 'Period', value: enquiry.period, inline: false },
    { name: 'Contact', value: enquiry.contactName, inline: true },
    // Wrapped so Discord does not turn it into a mailto embed mid-sentence.
    { name: 'Email', value: `\`${enquiry.email}\``, inline: true },
  ]

  if (enquiry.phone) {
    fields.push({ name: 'Phone', value: `\`${enquiry.phone}\``, inline: true })
  }

  if (enquiry.message) {
    fields.push({
      name: 'What they want out of it',
      // Discord rejects the whole payload if a field value exceeds 1024
      // characters, so this is cut well short of that.
      value: enquiry.message.slice(0, 1000),
      inline: false,
    })
  }

  try {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: 'Griffith ICT Club',
        content: roleId ? `<@&${roleId}> new sponsorship enquiry` : undefined,
        embeds: [
          {
            title: `${enquiry.organisation} — ${enquiry.tier}`,
            description: `Someone has asked about sponsoring the club.`,
            color: BRAND_RED,
            fields,
            footer: { text: 'Sent from the sponsorship form on griffithict.club' },
            timestamp: new Date().toISOString(),
          },
        ],
        // A webhook cannot ping a role unless it says so explicitly, and naming
        // the one role means a pasted enquiry can never turn into an @everyone.
        allowed_mentions: roleId ? { parse: [], roles: [roleId] } : { parse: [] },
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

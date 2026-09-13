import 'server-only'

import type { NewContactEnquiry, NewSponsorshipEnquiry } from '@gict/db'

const BRAND_RED = 0xe51b13

type Field = { name: string; value: string; inline: boolean }

/**
 * Posts one embed to a webhook and says whether Discord took it.
 *
 * Both forms go through here so they cannot drift on the things that are easy to
 * get subtly wrong: the mention allowlist, the timeout, and treating a non-2xx as
 * a failure rather than ignoring it.
 */
async function post({
  webhook,
  title,
  description,
  fields,
}: {
  webhook: string
  title: string
  description: string
  fields: Field[]
}): Promise<boolean> {
  // One committee role covers both forms.
  const roleId = process.env.DISCORD_COMMITTEE_ROLE_ID

  try {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: 'Griffith ICT Club',
        content: roleId ? `<@&${roleId}> ${description}` : description,
        embeds: [
          {
            title,
            color: BRAND_RED,
            fields,
            footer: { text: 'Sent from a form on griffithict.club' },
            timestamp: new Date().toISOString(),
          },
        ],
        // A webhook cannot ping a role without being told to, and naming the one
        // role means a pasted enquiry can never turn into an @everyone.
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

/** Wrapped so Discord does not linkify it mid-sentence. */
function code(value: string): string {
  return `\`${value}\``
}

/** Discord rejects the whole payload if a field value passes 1024 characters. */
function clamp(value: string): string {
  return value.length > 1000 ? `${value.slice(0, 1000)}…` : value
}

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

  const fields: Field[] = [
    { name: 'Organisation', value: enquiry.organisation, inline: true },
    { name: 'Tier', value: enquiry.tier, inline: true },
    { name: 'Period', value: enquiry.period, inline: false },
    { name: 'Contact', value: enquiry.contactName, inline: true },
    { name: 'Email', value: code(enquiry.email), inline: true },
  ]

  if (enquiry.phone) fields.push({ name: 'Phone', value: code(enquiry.phone), inline: true })
  if (enquiry.message) {
    fields.push({ name: 'What they want out of it', value: clamp(enquiry.message), inline: false })
  }

  return post({
    webhook,
    title: `${enquiry.organisation} — ${enquiry.tier}`,
    description: 'new sponsorship enquiry',
    fields,
  })
}

/**
 * Posts a general enquiry to its own channel.
 *
 * Separate webhook so a student asking a question does not land among sponsor
 * leads, but the same committee role is pinged: it is the same people reading.
 */
export async function postContactEnquiry(enquiry: NewContactEnquiry): Promise<boolean> {
  const webhook = process.env.DISCORD_CONTACT_WEBHOOK_URL
  if (!webhook) {
    console.warn('DISCORD_CONTACT_WEBHOOK_URL is not set; enquiry stored but not announced')
    return false
  }

  const fields: Field[] = [
    { name: 'From', value: enquiry.name, inline: true },
    { name: 'Email', value: code(enquiry.email), inline: true },
  ]
  if (enquiry.company) fields.push({ name: 'Company', value: enquiry.company, inline: true })
  fields.push(
    { name: 'About', value: enquiry.topic, inline: false },
    { name: 'Message', value: clamp(enquiry.message), inline: false },
  )

  return post({
    webhook,
    title: enquiry.company
      ? `${enquiry.topic} — ${enquiry.name}, ${enquiry.company}`
      : `${enquiry.topic} — ${enquiry.name}`,
    description: 'new enquiry from the website',
    fields,
  })
}

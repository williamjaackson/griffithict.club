import { index, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

// The bot's tables live beside these in the same database but share nothing with
// them, so they keep their own file. Re-exported here because the Drizzle client
// builds its schema from this module.
export * from './funnel'

/**
 * Draft events are invisible to the site. Cancelled ones are kept rather than
 * deleted so a link already posted in Discord still resolves and explains itself.
 */
export const eventStatus = pgEnum('event_status', ['draft', 'published', 'cancelled'])

export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** URL segment. Stable once published — it is what gets pasted into Discord. */
    slug: varchar('slug', { length: 120 }).notNull().unique(),

    title: varchar('title', { length: 200 }).notNull(),

    /**
     * A one-line description, used for the page description and link previews.
     *
     * Not the time — that is derived from `startsAt` wherever it is shown, so the
     * two cannot disagree.
     */
    summary: varchar('summary', { length: 300 }),

    /** Markdown. Rendered in the event modal and on the detail page. */
    description: text('description'),

    /**
     * Always UTC. The mockup's "Aug"/"14"/"Thursday · 5:30pm" strings are
     * presentation and get derived from this in Australia/Brisbane.
     */
    startsAt: timestamp('starts_at', { withTimezone: true, mode: 'date' }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true, mode: 'date' }),

    location: varchar('location', { length: 200 }),
    coverImage: varchar('cover_image', { length: 500 }),
    registrationUrl: varchar('registration_url', { length: 500 }),

    status: eventStatus('status').notNull().default('draft'),

    /**
     * Hold a published event back until this moment passes.
     *
     * Null means show it as soon as it is published, which is the common case.
     * Setting it lets a run of events be written up once and revealed one at a
     * time — queue the next month of socials, each appearing as the one before it
     * happens, so the site is never showing an empty What's On or a wall of
     * identical entries.
     *
     * Distinct from `status`: a draft is unfinished, a scheduled event is
     * finished and waiting.
     */
    publishAt: timestamp('publish_at', { withTimezone: true, mode: 'date' }),

    /**
     * Set by the Discord bot when it mirrors this into a Discord scheduled event,
     * so the two stay linked instead of drifting into duplicates.
     */
    discordEventId: varchar('discord_event_id', { length: 40 }).unique(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('events_status_starts_at_idx').on(t.status, t.startsAt)],
)

/**
 * Sponsorship enquiries are posted to Discord, and also written here.
 *
 * The webhook is the notification, not the record: it silently 404s the day
 * someone deletes the channel, and a lost sponsor lead is expensive. `deliveredAt`
 * is null when Discord rejected it, which is the row worth checking after an outage.
 */
export const sponsorshipEnquiries = pgTable('sponsorship_enquiries', {
  id: uuid('id').primaryKey().defaultRandom(),
  tier: varchar('tier', { length: 40 }).notNull(),
  period: varchar('period', { length: 60 }).notNull(),
  organisation: varchar('organisation', { length: 200 }).notNull(),
  contactName: varchar('contact_name', { length: 200 }).notNull(),
  email: varchar('email', { length: 320 }).notNull(),
  phone: varchar('phone', { length: 40 }),
  message: text('message'),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Everything that is not a sponsorship enquiry: questions, collaborations,
 * press, and whatever else the form collects.
 *
 * Kept separate from `sponsorship_enquiries` rather than merged behind a `kind`
 * column. A sponsorship lead has a tier and a period; this has a topic. Merging
 * them would mean columns that are null for half the rows and meaningful for the
 * other half, and nothing would enforce which.
 */
export const contactEnquiries = pgTable('contact_enquiries', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** One of the options in contact.yaml, stored as written so old rows survive an edit. */
  topic: varchar('topic', { length: 60 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  /** Who they are writing on behalf of, if anyone. Blank for most students. */
  company: varchar('company', { length: 200 }),
  email: varchar('email', { length: 320 }).notNull(),
  message: text('message').notNull(),
  /** Null when Discord rejected it. The row worth checking after a webhook outage. */
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert
export type SponsorshipEnquiry = typeof sponsorshipEnquiries.$inferSelect
export type NewSponsorshipEnquiry = typeof sponsorshipEnquiries.$inferInsert
export type ContactEnquiry = typeof contactEnquiries.$inferSelect
export type NewContactEnquiry = typeof contactEnquiries.$inferInsert

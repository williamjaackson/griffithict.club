import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

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

    /** One line under the title in listings. */
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

export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert
export type SponsorshipEnquiry = typeof sponsorshipEnquiries.$inferSelect
export type NewSponsorshipEnquiry = typeof sponsorshipEnquiries.$inferInsert

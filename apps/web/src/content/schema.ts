import { z } from 'zod'

const url = z.string().min(1)

export const siteSchema = z.object({
  name: z.string(),
  url: z.url(),
  /** Used verbatim as the page title, so it is written out rather than composed. */
  title: z.string(),
  description: z.string(),
  eyebrow: z.string(),
  headline: z
    .object({
      lines: z.array(z.string()).min(1),
      highlight: z.string().min(1),
    })
    // An emphasis that matches nothing renders the headline flat, with no
    // indication anything is wrong.
    .refine((h) => h.lines.some((line) => line.includes(h.highlight)), {
      message: 'headline.highlight must appear in one of headline.lines',
      path: ['highlight'],
    }),
  nav: z.array(z.object({ label: z.string(), href: z.string() })).min(1),
})

export const linksSchema = z.object({
  discord: url,
  instagram: url,
  linkedin: url,
  github: url,
  membership: url,
  university: url,
  builtBy: z.object({ label: z.string(), href: url }),
})

/** Key of a link in links.yaml, so content can point at one without repeating it. */
export type LinkKey = keyof Omit<z.infer<typeof linksSchema>, 'builtBy'>

export const sponsorsSchema = z
  .array(
    z.object({
      name: z.string(),
      logo: z.string().startsWith('/'),
      url: url,
    }),
  )
  .min(1)

export const eventTypesSchema = z.array(z.object({ title: z.string(), body: z.string() })).min(1)

/** `YYYY-MM`. Sorts and compares correctly as a plain string, which is the point. */
const month = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Expected a month as YYYY-MM, e.g. 2026-07')

const termEntry = z
  .object({
    name: z.string(),
    /** Headshot, if there is one. Absent falls back to a placeholder. */
    photo: z.string().startsWith('/').optional(),
    /** First month of the term. */
    from: month,
    /** Last month of the term. Omit it for whoever holds the role now. */
    to: month.optional(),
  })
  .refine((t) => !t.to || t.to >= t.from, {
    message: 'A term cannot end before it starts',
    path: ['to'],
  })

export const committeeSchema = z
  .array(
    z.object({
      role: z.string(),
      about: z.string(),
      /**
       * Everyone who has held the role. Order does not matter — it is sorted on
       * load — and the current holder is the entry with no `to`, rather than
       * whichever one happens to be written first.
       */
      history: z
        .array(termEntry)
        .min(1)
        .superRefine((history, ctx) => {
          const current = history.filter((t) => !t.to)
          if (current.length !== 1) {
            ctx.addIssue({
              code: 'custom',
              message:
                current.length === 0
                  ? 'No current holder: exactly one term must have no `to`'
                  : `Two people cannot hold one role at once: ${current
                      .map((t) => t.name)
                      .join(' and ')} both have no \`to\``,
            })
          }

          // Overlaps produce a timeline that reads as nonsense, and nothing
          // downstream would notice.
          const sorted = [...history].sort((a, b) => a.from.localeCompare(b.from))
          for (const [i, earlier] of sorted.entries()) {
            const later = sorted[i + 1]
            if (!later || !earlier.to) continue
            if (earlier.to >= later.from) {
              ctx.addIssue({
                code: 'custom',
                message: `${earlier.name} and ${later.name} have overlapping terms`,
              })
            }
          }
        }),
    }),
  )
  .min(1)

export const sponsorshipSchema = z
  .object({
    benefits: z
      .array(
        z.object({
          level: z.int().min(0),
          label: z.string(),
        }),
      )
      .min(1),
    tiers: z
      .array(
        z.object({
          name: z.string(),
          price: z.string(),
          accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
          tint: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
          mark: z.string(),
        }),
      )
      .min(1),
  })
  // A benefit tagged above the highest tier would silently never render.
  .refine((v) => v.benefits.every((b) => b.level < v.tiers.length), {
    message: 'A benefit is tagged with a level higher than the number of tiers',
    path: ['benefits'],
  })

export const contactSchema = z.object({
  heading: z.string(),
  body: z.string(),
  topics: z.array(z.string().min(1).max(60)).min(1),
})

export const joinSchema = z
  .array(
    z.object({
      title: z.string(),
      body: z.string(),
      cta: z.string(),
      link: z.enum(['discord', 'instagram', 'linkedin', 'github', 'membership', 'university']),
    }),
  )
  .min(1)

export type Site = z.infer<typeof siteSchema>
export type Links = z.infer<typeof linksSchema>
export type Sponsor = z.infer<typeof sponsorsSchema>[number]
export type EventType = z.infer<typeof eventTypesSchema>[number]
export type CommitteeRole = z.infer<typeof committeeSchema>[number]
export type TermEntry = CommitteeRole['history'][number]
export type Sponsorship = z.infer<typeof sponsorshipSchema>
export type SponsorshipTier = Sponsorship['tiers'][number]
export type Contact = z.infer<typeof contactSchema>
export type JoinStep = z.infer<typeof joinSchema>[number]

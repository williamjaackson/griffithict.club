import { z } from 'zod'

const url = z.string().min(1)

export const siteSchema = z.object({
  name: z.string(),
  shortName: z.string(),
  url: z.url(),
  tagline: z.string(),
  description: z.string(),
  eyebrow: z.string(),
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

export const eventTypesSchema = z
  .array(z.object({ title: z.string(), body: z.string() }))
  .min(1)

export const committeeSchema = z
  .array(
    z.object({
      role: z.string(),
      about: z.string(),
      // Newest first. The first entry is the current holder, which drives both
      // the card and the highlighted row in the timeline.
      history: z
        .array(
          z.object({
            name: z.string(),
            term: z.string(),
            length: z.string(),
          }),
        )
        .min(1),
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
          blurb: z.string(),
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

export const joinSchema = z
  .array(
    z.object({
      step: z.string(),
      title: z.string(),
      body: z.string(),
      cta: z.string(),
      link: z.enum(['discord', 'instagram', 'linkedin', 'github', 'membership', 'university']),
    }),
  )
  .min(1)

export const perksSchema = z.array(
  z.object({
    name: z.string(),
    description: z.string(),
    url: url.optional(),
  }),
)

export type Site = z.infer<typeof siteSchema>
export type Links = z.infer<typeof linksSchema>
export type Sponsor = z.infer<typeof sponsorsSchema>[number]
export type EventType = z.infer<typeof eventTypesSchema>[number]
export type CommitteeRole = z.infer<typeof committeeSchema>[number]
export type Sponsorship = z.infer<typeof sponsorshipSchema>
export type SponsorshipTier = Sponsorship['tiers'][number]
export type JoinStep = z.infer<typeof joinSchema>[number]
export type Perk = z.infer<typeof perksSchema>[number]

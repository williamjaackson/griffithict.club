import 'server-only'

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { z } from 'zod'
import {
  committeeSchema,
  contactSchema,
  eventTypesSchema,
  joinSchema,
  linksSchema,
  siteSchema,
  sponsorshipSchema,
  sponsorsSchema,
} from './schema'

const dir = dirname(fileURLToPath(import.meta.url))

/**
 * Read a YAML file and validate it.
 *
 * Called at module load, so a malformed edit throws while the page is being
 * rendered rather than shipping a half-empty section. In CI that means the build
 * fails, which is the point of keeping this content in git.
 */
function load<T extends z.ZodType>(file: string, schema: T): z.infer<T> {
  const raw = readFileSync(join(dir, file), 'utf8')
  const result = schema.safeParse(parse(raw))

  if (!result.success) {
    throw new Error(`Invalid content in src/content/${file}:\n${z.prettifyError(result.error)}`)
  }

  return result.data
}

export const site = load('site.yaml', siteSchema)
export const links = load('links.yaml', linksSchema)
export const sponsors = load('sponsors.yaml', sponsorsSchema)
export const eventTypes = load('event-types.yaml', eventTypesSchema)
export const committee = load('committee.yaml', committeeSchema)
export const contact = load('contact.yaml', contactSchema)
export const sponsorship = load('sponsorship.yaml', sponsorshipSchema)
export const joinSteps = load('join.yaml', joinSchema)

export * from './schema'

import { defineConfig } from 'drizzle-kit'
import { loadRootEnv } from './src/env'

loadRootEnv()

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: true,
  verbose: true,
})

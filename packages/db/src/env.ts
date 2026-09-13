import { loadEnvFile } from 'node:process'

/**
 * Load the workspace-root `.env` into `process.env`.
 *
 * The site, the migrator and drizzle-kit all want the same `DATABASE_URL`, and
 * Next only looks for `.env` inside `apps/web`. Rather than keep a copy of the
 * file per tool, every entry point calls this. Does nothing when the file is
 * missing, which is the case in CI and in Docker, where the values are already
 * in the environment.
 */
export function loadRootEnv(): void {
  try {
    loadEnvFile(new URL('../../../.env', import.meta.url))
  } catch {
    // No local env file.
  }
}

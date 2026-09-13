# griffithict.club

The Griffith ICT Club website.

## Layout

| Path | What |
| --- | --- |
| `apps/web` | The site. Next.js 16, App Router |
| `apps/bot` | Discord bot. Not built yet |
| `packages/db` | Drizzle schema and migrations for the shared Postgres |
| `design/` | The original mockup, kept as a visual reference |
| `infra/` | Compose files and the Caddyfile |
| `docs/` | Runbook and the annual handover checklist |

The database is shared with other club services, so `packages/db` owns the schema
and every service consumes it through the workspace. Nothing is published to a
registry.

## Running it

```sh
pnpm install
cp .env.example .env      # then fill it in
docker compose -f infra/compose.dev.yml up -d   # postgres
pnpm db:migrate
pnpm dev
```

The site comes up on http://localhost:3000.

## Editing content

Sponsors, perks, links and the committee live in `apps/web/src/content/*.yaml`.
Edit the file, open a pull request. The schemas are validated on build, so a typo
fails CI rather than the page.

Events come from the database instead, because the Discord bot will write to them
too. Until that bot exists, add events with `pnpm db:studio` — see
[docs/RUNBOOK.md](docs/RUNBOOK.md).

## Deploying

Push to `main`. GitHub Actions builds an image, pushes it to GHCR tagged with the
commit SHA, and the VPS pulls it. Rollback and recovery are in
[docs/RUNBOOK.md](docs/RUNBOOK.md).

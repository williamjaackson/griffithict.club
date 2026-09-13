# griffithict.club

The Griffith ICT Club website.

## Layout

| Path          | What                                                  |
| ------------- | ----------------------------------------------------- |
| `apps/web`    | The site. Next.js 16, App Router                      |
| `apps/bot`    | Discord bot. Not built yet                            |
| `packages/db` | Drizzle schema and migrations for the shared Postgres |
| `design/`     | The original mockup, kept as a visual reference       |
| `deploy/`     | The compose file the VPS runs                         |
| `docs/`       | Runbook and the annual handover checklist             |

The database is shared with other club services, so `packages/db` owns the schema
and every service consumes it through the workspace. Nothing is published to a
registry.

## Running it

```sh
pnpm install
cp .env.example .env      # then fill it in
docker compose -f compose.dev.yaml up -d   # postgres
pnpm db:migrate
pnpm dev
```

The site comes up on http://localhost:3000.

## Editing content

Sponsors, links and the committee live in `apps/web/src/content/*.yaml`.
Edit the file, open a pull request. The schemas are validated on build, so a typo
fails CI rather than the page.

**Restart `pnpm dev` after editing one.** The loader reads these with `fs`, which
the dev server does not watch, so the page keeps serving the old values and it
looks like the edit did nothing.

Events come from the database instead, because the Discord bot will write to them
too. Until that bot exists, add events with `pnpm db:studio` — see
[docs/RUNBOOK.md](docs/RUNBOOK.md).

## Deploying

Push to `master`. GitHub Actions builds both images, tags them with the commit
SHA, and runs the host's deploy script over SSH.

The site is one app on a shared host: nginx terminates TLS, Postgres is shared
with the other services, and `/srv/infra` on that host documents the
arrangement. Rollback and recovery are in [docs/RUNBOOK.md](docs/RUNBOOK.md).

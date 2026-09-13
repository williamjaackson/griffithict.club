# @gict/db

Drizzle schema and migrations for the club's Postgres. Not published — every
consumer is a workspace package.

## Why this is its own package

The database is shared. The website reads events from it, and the Discord bot will
read and write them. If each service carried its own schema they would drift, and
the first symptom would be a production error nobody can reproduce locally. One
package, one migration history.

## Changing the schema

```sh
# 1. edit src/schema.ts
pnpm db:generate     # writes a new SQL file into drizzle/
# 2. read the generated SQL before committing it
pnpm db:migrate      # applies it locally
```

Commit the generated file. CI fails if `drizzle-kit generate` produces a diff,
which catches the most common mistake here: editing the schema and forgetting to
generate.

## Migrations are additive

**Never drop or rename a column in the same change that stops using it.**

Deploys are not atomic across services. The website and the bot restart at
different moments, and during that window old code is talking to a new schema. A
dropped column takes the old code down with it.

To remove a column, take two semesters:

1. Stop reading and writing it everywhere. Ship that.
2. Next semester, once nothing references it, drop it.

Renaming is the same thing twice: add the new column, backfill, move the readers,
then drop the old one later.

## Running migrations

One thing runs them: the `migrate` container in `infra/compose.yml`, before the app
starts. Not the app on boot, not a person over SSH. `src/migrate.ts` takes a
Postgres advisory lock so a second migrator waits rather than racing.

If it exits non-zero the deploy stops and the previous container keeps serving.
That is the intended behaviour — verify it still holds by deliberately breaking a
migration once, as described in `docs/RUNBOOK.md`.

## Adding an event by hand

Until the bot exists, use Drizzle Studio over an SSH tunnel:

```sh
ssh -L 5432:localhost:5432 gict-vps
pnpm db:studio
```

Events are `draft` by default, so a half-finished row is not live.

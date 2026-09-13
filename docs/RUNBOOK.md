# Runbook

Everything you need to keep griffithict.club running, written for someone who has
never seen it before. If you find a step that does not work, fix this file in the
same pull request.

## What exists

| Thing                     | Where                                          | Who pays    |
| ------------------------- | ---------------------------------------------- | ----------- |
| Domain `griffithict.club` | _registrar, account_                           | _club card_ |
| VPS                       | _provider, region, IP_                         | _club card_ |
| Images                    | `ghcr.io/griffithict/gict-web`, `gict-migrate` | Free        |
| Backups                   | _Backblaze B2 bucket_                          | ~$1/month   |

Fill in the italics. About $100 a year all up — worth writing in the treasurer's
budget so nobody cancels the VPS to save money.

Everything on the VPS lives in `/opt/gict`:

```
/opt/gict/
├── compose.yml     copied from infra/compose.yml
├── Caddyfile       copied from infra/Caddyfile
└── .env            secrets, root-owned, mode 600, never in git
```

## Deploying

Push to `main`. GitHub Actions builds the images, tags them with the commit SHA,
and the VPS pulls and restarts. Watch it in the Actions tab.

To deploy by hand:

```sh
ssh gict-vps
cd /opt/gict
TAG=<commit-sha> docker compose up -d
```

## Rolling back

Find the SHA of the last good commit, then:

```sh
ssh gict-vps
cd /opt/gict
TAG=<old-commit-sha> docker compose up -d
```

Images are kept for a week. Older than that, re-run the deploy workflow from the
tag you want.

## When a migration fails

This is designed to be boring. The `migrate` container runs before `web` and, if
it exits non-zero, Compose stops without recreating `web` — the old container
keeps serving. A failed migration is not an outage.

```sh
docker compose logs migrate
```

Fix the migration, push, deploy again.

**Check this still works once a semester.** Break a migration on purpose, deploy,
and confirm the site stays up. An untested failure path is a guess.

## Adding an event

```sh
pnpm db:event \
  --title "Tech Social" \
  --starts "2026-09-15 18:30" \
  --location "G23_1.14, Griffith University" \
  --summary "Games, hangout, and afters at the Parkwood Tavern." \
  --status published
```

Times are Brisbane. `pnpm db:event --help` lists every option.

Idempotent on the slug, so re-running with a corrected time fixes the row instead
of creating a second event with the same name. Against production, open a tunnel
first and point `DATABASE_URL` at it.

**Queueing a run of events.** `--publish-at` holds a finished event back until a
moment passes, so a month of socials can be written up in one sitting and appear
one at a time:

```sh
# Written now, appears the evening the previous social runs.
pnpm db:event --title "Tech Social" --slug tech-social-2026-09-22 \
  --starts "2026-09-22 18:30" --publish-at "2026-09-15 21:00" --status published
```

Three states worth keeping straight:

|                                                 | Meaning                                        |
| ----------------------------------------------- | ---------------------------------------------- |
| `status: draft`                                 | Unfinished. Never shown                        |
| `status: published`, `publish_at` in the future | Finished, waiting. Not shown, and its URL 404s |
| `status: published`, `publish_at` null or past  | On the site                                    |

Cancelling: set `status` to `cancelled` rather than deleting. The link is already
out there, and the page says the event is off.

There is also Drizzle Studio, a table editor over a tunnel, if you would rather
click:

```sh
ssh -L 5432:localhost:5432 gict-vps    # leave this running
pnpm db:studio                          # in another terminal
```

## Editing everything else

Sponsors, links and the committee are files in
`apps/web/src/content/*.yaml`. Edit, open a pull request, merge. The schemas are
checked on build, so a typo fails CI instead of breaking the page.

## Backups

Nightly `pg_dump` to Backblaze B2, 30 days of history.

```sh
# Restore into a scratch database to check a backup is real
ssh gict-vps
docker compose exec -T db createdb -U gict gict_restore_test
gunzip -c /path/to/backup.sql.gz | docker compose exec -T db psql -U gict -d gict_restore_test
docker compose exec -T db psql -U gict -d gict_restore_test -c "SELECT count(*) FROM events;"
docker compose exec -T db dropdb -U gict gict_restore_test
```

**Do this once a semester and write the date here.** An untested backup is a
rumour, not a backup.

Last restore test: _never_

`/opt/gict/.env` and the Caddy volume are not in the nightly job — they change
roughly never. Copy them somewhere safe by hand when you change them.

## When TLS breaks

Caddy gets certificates automatically. If HTTPS stops working:

```sh
docker compose logs caddy | tail -50
```

Usual causes:

- **DNS moved.** Caddy cannot prove it owns the domain. Check the A record points
  at the VPS.
- **The `caddy_data` volume was deleted.** That volume holds the ACME account key
  and certificates. Losing it forces re-issue, and repeated re-issues hit Let's
  Encrypt rate limits, which lock you out for hours. Never `docker compose down -v`
  in production.
- **Port 80 blocked.** Certificate renewal needs it, even though the site runs on 443.

## Rotating the Discord webhook

1. Discord → committee channel → Edit Channel → Integrations → Webhooks.
2. Delete the old one, create a new one, copy the URL.
3. On the VPS, edit `DISCORD_WEBHOOK_URL` in `/opt/gict/.env`.
4. `docker compose up -d web`.
5. Send a test enquiry through the sponsorship form.

Enquiries are written to the database as well, so a broken webhook loses the
notification but not the lead. Check for missed ones:

```sql
SELECT * FROM sponsorship_enquiries WHERE delivered_at IS NULL ORDER BY created_at DESC;
```

## The deploy key

CI connects with an SSH key restricted to a single command, so it can ask for a
tag to be deployed and nothing else. In the deploy user's `~/.ssh/authorized_keys`:

```
command="/usr/local/bin/gict-deploy",no-agent-forwarding,no-port-forwarding,no-pty,no-X11-forwarding ssh-ed25519 AAAA... gict-deploy
```

The script is `infra/gict-deploy`, installed at `/usr/local/bin/gict-deploy`. It
validates the requested tag is a commit SHA before doing anything. If the key
leaks, an attacker can redeploy an existing image — they cannot get a shell.

GitHub Secrets holds `DEPLOY_SSH_KEY`, `DEPLOY_HOST`, `DEPLOY_USER` and
`DEPLOY_KNOWN_HOSTS`. Nothing else. The application secrets live only on the VPS.

## Monitoring

An external checker hits `https://griffithict.club/api/health` and alerts a
Discord channel. `/api/health` deliberately does not touch the database, so a
Postgres blip cannot send the container into a restart loop.
`/api/health/db` is the deeper check.

## Health check

```sh
ssh gict-vps
cd /opt/gict
docker compose ps                    # everything up, migrate exited 0
docker compose logs --tail=50 web
df -h                                # disk: the usual quiet killer
curl -s localhost/api/health/db      # through Caddy
```

Container logs are capped at 10MB × 3 per service. If the disk fills anyway, look
for Postgres WAL growth or a runaway backup file, not the logs.

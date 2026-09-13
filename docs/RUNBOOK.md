# Runbook

Everything you need to keep griffithict.club running, written for someone who has
never seen it before. If you find a step that does not work, fix this file in the
same pull request.

## What exists

This site is one app among several on a shared host. `/srv/infra` is a git repo
on that host documenting the arrangement; read its README before changing
anything shared.

| Thing               | Where                                                                         |
| ------------------- | ----------------------------------------------------------------------------- |
| Host                | `72.61.210.78`                                                                |
| Shared Postgres     | `/srv/infra/compose.yaml`, reachable as `postgres:5432` on the `club` network |
| This app's checkout | `/srv/apps/ict-web`                                                           |
| This app's secrets  | `/etc/club/ict-web.env`, root-owned, mode 600                                 |
| This app's compose  | `deploy/compose.yaml` in this repo                                            |
| TLS and routing     | nginx on the host, `/etc/nginx/sites-available/griffithict.club`              |
| Images              | `ghcr.io/williamjaackson/ict-web`, and `-migrate`                             |
| Upstream port       | `127.0.0.1:3100`                                                              |

The app publishes nothing but that loopback port, and owns no database of its
own. Postgres publishes no port at all, so it is unreachable from off the host.

## Deploying

Push to `master`. GitHub Actions builds both images, tags them with the commit
SHA, and runs the host's deploy script over SSH.

By hand:

```sh
ssh root@72.61.210.78
/srv/infra/scripts/deploy.sh ict-web <commit-sha>
```

That checks out the SHA in `/srv/apps/ict-web`, pulls both images at that tag and
brings the stack up.

## Rolling back

The same command with an older SHA:

```sh
/srv/infra/scripts/deploy.sh ict-web <old-sha>
```

Images are tagged by SHA, so anything CI has built is still deployable.

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
of creating a second event with the same name. The slug is an identifier only —
events have no page of their own, so it is never seen by anyone. Against production, open a tunnel
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

|                                                 | Meaning                               |
| ----------------------------------------------- | ------------------------------------- |
| `status: draft`                                 | Unfinished. Never shown               |
| `status: published`, `publish_at` in the future | Finished, waiting. Not shown anywhere |
| `status: published`, `publish_at` null or past  | On the site                           |

Cancelling: set `status` to `cancelled` rather than deleting. The link is already
out there, and the page says the event is off.

There is also Drizzle Studio, a table editor over a tunnel, if you would rather
click:

```sh
ssh -L 5432:localhost:5432 root@72.61.210.78   # leave this running
pnpm db:studio                          # in another terminal
```

## Editing everything else

Sponsors, links and the committee are files in
`apps/web/src/content/*.yaml`. Edit, open a pull request, merge. The schemas are
checked on build, so a typo fails CI instead of breaking the page.

## Backups

**There are none yet.** `/srv/infra/README.md` says the same, and now there is
finally data to lose: the events table and every sponsorship enquiry.

Set up `pg_dump` or pgBackRest off the host, then restore it once onto a scratch
database and write the date here. An untested backup is a rumour.

```sh
# Dump the app's database from the shared Postgres
docker compose -f /srv/infra/compose.yaml exec -T postgres \
  pg_dump -U ict_web -Fc ict_web > ict-web-$(date +%F).dump
```

Last restore test: _never_

`/etc/club/*.env` is not covered by any of this. Those change rarely; copy them
somewhere safe by hand when they change.

## When TLS breaks

nginx terminates TLS on the host and this app never sees it.

```sh
nginx -t && systemctl reload nginx
journalctl -u nginx -n 50 --no-pager
```

The certificate for griffithict.club is currently Let's Encrypt, renewed by
certbot, and predates the `/srv/infra` convention. That convention expects a
Cloudflare Origin CA certificate in `/etc/ssl/club/` instead, which needs
Cloudflare SSL mode set to Full (strict). Worth migrating, but the existing cert
renews on its own and nothing is broken.

```sh
certbot certificates
certbot renew --dry-run
```

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

CI connects over SSH and runs `/srv/infra/scripts/deploy.sh`, which takes an app
name and a SHA and does nothing else with them.

GitHub Secrets holds `DEPLOY_SSH_KEY`, `DEPLOY_HOST`, `DEPLOY_USER` and
`DEPLOY_KNOWN_HOSTS`. Nothing else. The application's own secrets live only in
`/etc/club/ict-web.env` on the host.

The key is restricted to a forced command, `/usr/local/bin/ci-deploy-ict-web`.
That wrapper takes the SHA out of what CI sent, refuses anything that is not 40
hex characters, and execs the host's deploy script. A leaked key can therefore
redeploy an existing commit and nothing else: no shell, no file access, no other
app.

To rotate it: generate a new pair on the host, replace the line in
`/root/.ssh/authorized_keys`, and update `DEPLOY_SSH_KEY`.

## Monitoring

An external checker hits `https://griffithict.club/api/health` and alerts a
Discord channel. `/api/health` deliberately does not touch the database, so a
Postgres blip cannot send the container into a restart loop.
`/api/health/db` is the deeper check.

## Health check

```sh
ssh root@72.61.210.78
docker compose -p ict-web -f /srv/apps/ict-web/deploy/compose.yaml ps
docker compose -p ict-web -f /srv/apps/ict-web/deploy/compose.yaml logs --tail=50 web
df -h                                       # disk: the usual quiet killer
curl -s 127.0.0.1:3100/api/health           # the app directly
curl -s https://griffithict.club/api/health/db   # through nginx
```

Container logs are capped at 10MB × 3 per service. If the disk fills anyway, look
for Postgres WAL growth or a runaway backup file, not the logs.

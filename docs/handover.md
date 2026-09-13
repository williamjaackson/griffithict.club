# Handover checklist

Run this every November, when the committee changes. It takes an afternoon and it
is the difference between this site existing in 2029 and not.

## Accounts

The most common way a student club loses its website is not a bad deploy. It is a
president graduating with the domain on their personal Gmail and their phone
number on the 2FA.

- [ ] Domain registrar is on a club-controlled email, with at least two people
      holding access
- [ ] VPS provider, same
- [ ] GitHub organisation owned by the club, with at least two owners
- [ ] Payment method is the club card, not a personal one
- [ ] 2FA recovery codes stored wherever the club keeps shared credentials, and
      the outgoing committee no longer has them
- [ ] Domain auto-renew is on, and the expiry date is in `docs/RUNBOOK.md`

## Secrets

Rotate all of these, whether or not you think you need to.

- [ ] Postgres passwords (`POSTGRES_PASSWORD`, and each service's role)
- [ ] `DISCORD_WEBHOOK_URL` — delete the old webhook, do not just make a new one
- [ ] Deploy SSH key — generate a new pair, update `authorized_keys` on the VPS
      and `DEPLOY_SSH_KEY` in GitHub Secrets
- [ ] Remove departing members from the GitHub organisation
- [ ] Remove departing members' SSH keys from the VPS

## Check it works

- [ ] Deploy something trivial and watch it go out
- [ ] Roll it back, using only the runbook
- [ ] Restore a backup into a scratch database, and write the date in the runbook
- [ ] Break a migration on purpose and confirm the site stays up
- [ ] Send a test sponsorship enquiry and confirm it reaches Discord
- [ ] Confirm the uptime monitor alerts a channel someone actually reads

## Hand over the knowledge

- [ ] Walk the incoming committee through `docs/RUNBOOK.md` on a real terminal
- [ ] Show them how to add an event with Drizzle Studio
- [ ] Show them how to edit `apps/web/src/content/*.yaml` and open a pull request
- [ ] Tell the treasurer what it costs and when it renews
- [ ] Fix anything in the runbook that turned out to be wrong or missing

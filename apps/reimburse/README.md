# Reimburse

Members claim back money they spent on the club. The treasurer moves each claim
along and everyone gets told what happened to theirs.

## Setup

1. Create an application at <https://discord.com/developers/applications>.
2. **Bot → Icon**: `assets/icon-512.png`.
3. No privileged intents to enable. This bot only answers interactions — it
   never watches members or reads messages — so there is nothing to toggle.
4. Put `REIMBURSE_BOT_TOKEN` and `REIMBURSE_APPLICATION_ID` in the workspace
   `.env`, and `REIMBURSE_DEV_GUILD_ID` while developing so commands appear
   instantly instead of taking up to an hour.
5. Add it to a server:

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_APP_ID&permissions=117760&scope=bot%20applications.commands
```

| Permission                        | Why                                      |
| --------------------------------- | ---------------------------------------- |
| View Channel, Send Messages       | Post claims in the review channel        |
| Attach Files                      | Put the receipt back up beside the claim |
| Embed Links, Read Message History | Render and edit its own posts            |

Notably **not** Manage Server. It has no business changing anything.

```sh
pnpm reimburse:commands   # upload the slash commands, after any change to them
pnpm reimburse            # run it
```

Then, in the server: `/reimbursements` → **Setup**.

## Use

Two commands, split by what somebody came to do.

```
/reimbursement     claim money back
/reimbursements    see and manage claims
```

Claiming is the common act, so it opens the form with nothing in the way. The
first time it asks for bank details first and hands over with a button, because
Discord will not let a modal submission open another modal.

`/reimbursements` is one private screen. A treasurer sees the whole server;
anybody else sees their own claims and the same controls minus the ones they
cannot use, so there is one screen to maintain rather than two that drift.

- Filter by state, ten to a page, with the total and what is still outstanding
- **Mark all N as …** when filtered to pending or submitted. A payment run is a
  dozen claims at once in a banking app, and ticking a dozen buttons afterwards
  is where somebody gives up and the records stop matching the bank. Each one
  still gets its own event, so the trail reads as if they were done by hand.
- Bank details for everyone; exports and setup for the committee

Moving a single claim along happens on its post in the review channel.

## Things worth knowing

- **CSV cells that start with `=`, `+`, `-` or `@` are prefixed.** Descriptions
  are whatever somebody typed into a modal, and a spreadsheet runs such a cell as
  a formula rather than showing it.

- **Receipts are stored, not linked.** Discord's CDN URLs carry signed expiry
  parameters and stop working within the day, so the bytes are pulled down at
  submission and kept in Postgres. A claim has to outlive a committee.
- **Money is integer cents everywhere.** A float would leave a treasurer with a
  one-cent drift against a bank statement and no way to explain it.
- **`submitted` means the treasurer has sent it on for payment**, wherever that
  is for a given server: a student guild, a finance team, someone's accountant.
  Not that the member filed it.
- **Any state can be set from any other.** The usual path is pending → submitted
  → paid, but the common mistake is pressing the wrong button, and having no way
  back is worse than any problem a one-way graph solves. Corrections stay visible
  in `reimburse_events`.
- **A treasurer may move their own claim along.** In a club the person buying
  things is usually the one holding the role, and a second pair of hands mostly
  means nothing gets logged at all. `reimburse_events` records who moved what
  either way, which is the control an audit actually asks about.
- **Bank details are a separate form.** A modal holds five components, and the
  claim needs three while the details need three, so they cannot share one. A
  first-time claimant gets the bank form, then a button through to the claim,
  because Discord will not let a modal submission open another modal. After that
  it is one step forever.
- **Bank details belong to the person, not the claim.** A claim is an
  instruction that has not been carried out, so if somebody changes banks
  between claiming and being paid, the money follows them rather than going to
  an account they have closed.
- **No bank details on the claim post at all.** A **Payment details** button
  shows them to whoever pressed it and nobody else, behind the treasurer role.
  The channel is read by a whole committee; only the person paying needs the
  number.
- **The review channel should be private.** Claims carry names, amounts and what
  people bought.
- **reimburse_events is append-only.** The status says where a claim is; the
  events say who moved it and when, which is what an audit asks for.

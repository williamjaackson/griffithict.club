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

Then, in the server: `/reimbursements setup channel:#treasury treasurer:@Treasurer`

## Use

```
/reimbursement                 opens the claim form
/reimbursements bank           set or change where you are paid
/reimbursements mine           your own claims
/reimbursements setup          review channel, treasurer role, currency
/reimbursements list [status]  every claim
```

`bank` and `mine` are open to everyone; `setup` needs Manage Server and `list`
needs that or the treasurer role. Those checks are in the handler rather than on
the command, because a single Discord permission would either hide somebody's
own bank details from them or show the whole claim list to the server.

`/reimbursement` has no subcommands on purpose. A command that has them cannot
be run bare, so Discord would make somebody choose from a list before they could
type an amount. Everything the treasurer does is on buttons attached to the
claim itself.

## Things worth knowing

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
- **Details are copied onto each claim** as given at the time, so changing them
  later does not rewrite which account an old claim was paid into.
- **The account number is masked** on the claim post. Whoever pays it has the
  full number in the payment run; the channel does not need it.
- **The review channel should be private.** Claims carry names, amounts and what
  people bought.
- **reimburse_events is append-only.** The status says where a claim is; the
  events say who moved it and when, which is what an audit asks for.

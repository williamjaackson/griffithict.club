# Funnel

Tracks which invite each member used, and which of your recruiting channels
that invite belongs to.

## Why it is not simply a lookup

Discord never says which invite a member used. `guildMemberAdd` gives you a
member and nothing else, and there has never been a field for it. The only
technique that works is to hold every invite's use count, re-read them the
moment someone joins, and see which one moved.

That is exact most of the time and genuinely impossible the rest of it. Two
people joining in the same second move two counters and nothing pairs them back
up. So every join is stored with a confidence, and both reports say how many
joins in them could not be pinned to one invite. A number you intend to spend
recruiting effort on is worth knowing the error bars of.

## Setup

1. Create an application at <https://discord.com/developers/applications>.
2. **Bot → Privileged Gateway Intents → Server Members Intent: on.** Without
   this `guildMemberAdd` never fires and the bot sees nothing at all.
3. **Bot → Icon**: `assets/icon-512.png`.
4. Put `FUNNEL_BOT_TOKEN` and `FUNNEL_APPLICATION_ID` in the workspace `.env`.
   Set `FUNNEL_DEV_GUILD_ID` too while developing: commands registered to one
   guild appear instantly, where global ones can take an hour, which looks
   exactly like a broken bot.
5. Add it to a server:

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_APP_ID&permissions=19489&scope=bot%20applications.commands
```

| Permission                               | Why                                                 |
| ---------------------------------------- | --------------------------------------------------- |
| Manage Server                            | Read invite use counts. Everything depends on this. |
| Create Invite                            | `/funnel source create`                             |
| View Channel, Send Messages, Embed Links | Post join notices                                   |

Manage Server is a heavy permission and an admin is right to hesitate. There is
no narrower one: Discord ties invite listing to it.

```sh
pnpm funnel:commands   # upload the slash commands, needed after any change to them
pnpm funnel            # run it
```

## Use

```
/funnel setup [channel]              where join notices go, empty to go silent
/setup                        where join notices go, empty to go silent
/funnel source create <name> [channel]   make a fresh invite and tag it
/funnel source set <invite> <name>   tag an invite that already exists
/funnel source unset <invite>
/funnel source list
/funnel leaderboard [share]          who has brought the most people in
/funnel sources [share]              arrivals by source
```

Everything needs Manage Server, and replies are private unless `share` is set.

**Use `source create` rather than making invites by hand.** Discord returns an
_existing_ invite when you ask for one whose settings match, and the client
never sets the flag that opts out of that. A server with one channel therefore
cannot make separate links for the website and a handbook through the UI — they
collapse into a single code, and there is nothing left to tell the two apart.
The API's `unique` flag avoids that, and only a bot can pass it.

## Things worth knowing

- **History cannot be recovered.** Discord gives a total per invite and no
  record of who used it when. Reports start from the day the bot joined.
- **A source is not an invite code.** Codes get revoked and remade; a source
  outlives them. Point the new code at the same source name and the numbers stay
  in one line.
- **Renaming a source does not rewrite the past.** Each join stores the source
  name as it read at the time.
- **Deleting a tagged invite is announced** in the log channel, because it
  silently stops that channel being counted while the report still looks healthy.

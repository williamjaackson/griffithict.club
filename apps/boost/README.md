# Boost

Booster perks: a personal role each booster colours themselves, and passes they
can hand to other members.

## Setup

1. Create an application at <https://discord.com/developers/applications>.
2. **Bot → Privileged Gateway Intents → Server Members Intent: on.** Without it
   `guildMemberUpdate` never fires, a boost starting or lapsing is invisible,
   and the bot does nothing at all.
3. **Bot → Icon**: `assets/icon-512.png`.
4. Put `BOOST_BOT_TOKEN` and `BOOST_APPLICATION_ID` in the workspace `.env`,
   plus `BOOST_DEV_GUILD_ID` while developing.
5. Add it to a server:

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_APP_ID&permissions=268438528&scope=bot%20applications.commands
```

| Permission                  | Why                                             |
| --------------------------- | ----------------------------------------------- |
| Manage Roles                | Make, colour and hand out roles. The whole bot. |
| View Channel, Send Messages | Answer where it is used                         |

**The bot's own role has to sit above everything it touches.** Discord will not
let a bot create, edit or assign a role at or above its own highest one, so drag
Boost's role near the top of the list. This is the single most common reason it
appears to do nothing.

```sh
pnpm boost:commands   # upload the slash commands, after any change to them
pnpm boost            # run it
```

Then, in the server: `/setup`.

## Use

```
/boost    your role colour and your passes
/setup    pass role, passes per booster, where personal roles sit
```

Everything else is a button on `/boost`.

## Things worth knowing

- **A personal role is named after the username, not the nickname.** A nickname
  is per-server and changes often; a role that followed it would keep reading as
  somebody else's. The name updates when the username does, across every server
  at once.
- **The colour can be taken off again.** The field is optional, so an empty box
  removes it, and "none" or "clear" do the same for anybody who types over what
  is there rather than deleting it. Without a way back, a role could be
  uncoloured only until somebody first picked something.
- **A new personal role has no colour at all.** Until somebody picks one, the
  colour they already have from their other roles should keep showing rather
  than being overridden by something nobody chose.
- **Asking for black gets `#010101`.** Discord reads `0x000000` as "this role
  has no colour", so a role actually set to it falls through to the member's
  next colour down. Stored `0` therefore means unset and anything else means
  chosen, which makes the column say which it is without a second one.
- **Several boosters can pass the same person.** The role goes only when the
  last pass does, so taking yours back cannot strip a role two others also
  gave. `/boost` shows who has passed you whether or not you boost, which is
  the point of a non-booster running it.
- **Where the role sits decides whether it does anything.** Discord shows the
  colour of the highest coloured role somebody holds, so a personal role below
  their other roles is invisible. `/setup` takes an anchor role to place them
  under; without one they go as high as the bot can reach.
- **Perks stop when the boost does.** The role is deleted and every pass that
  booster gave is revoked, because otherwise a server slowly fills with roles
  and pass-holders belonging to people who stopped paying. The colour is kept,
  so somebody who boosts again gets what they had.
- **One pass per person.** Two boosters cannot both spend a pass on the same
  member and have one of them get nothing for it.
- **Discord allows 250 roles per guild.** A personal role each means a large
  server can reach it; the bot says so rather than failing quietly.
- **Leaving counts as unboosting.** A member who leaves never fires
  `guildMemberUpdate`, so without handling the departure their role would sit
  there for ever and everybody they passed would keep the role.
- **A returning pass holder gets the role back.** They lose it by leaving, but
  the pass is still spent from the granter's allowance, so restoring it is the
  only reading that matches what the granter was told.
- **`BOOST_TEST_BOOSTERS` treats an id as boosting** without paying. It applies
  in every server the bot is in and the bot warns about it at startup, so a
  forgotten bypass cannot sit there quietly handing out perks.
- **Startup reconciles.** Boosts start and stop whether or not anything is
  listening, so every guild is checked on connect: boosters missing a role get
  one, and rows for people who have stopped are cleaned up. Passes are checked
  too: a pass whose granter no longer boosts is revoked, and a role taken off a
  valid holder by hand is put back.

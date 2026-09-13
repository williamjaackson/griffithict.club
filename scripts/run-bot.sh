#!/usr/bin/env bash
# Run one bot, and only one.
#
# Exists because `pkill -f "tsx watch"` matches nothing: the real process line is
# `tsx/dist/cli.mjs watch src/index.ts`. Four instances ended up running at once,
# each answering the same button press, which looks exactly like a race condition
# in the application and is not one.
#
# Usage: ./scripts/run-bot.sh funnel|reimburse
set -uo pipefail

APP="${1:?usage: run-bot.sh <app>}"
ROOT="$(git rev-parse --show-toplevel)" || exit 1
[ -d "$ROOT/apps/$APP" ] || { echo "no apps/$APP" >&2; exit 1; }

# Anchored on the app directory, so this only ever stops the bot asked for.
# pkill exits non-zero when nothing matched, which is the normal case here.
pkill -f "apps/$APP/node_modules/.*tsx" || true
pkill -f "filter @gict/$APP dev" || true
sleep 2

echo "starting $APP"
exec pnpm --filter "@gict/$APP" dev

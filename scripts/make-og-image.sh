#!/usr/bin/env bash
# Render the social card that Discord, Slack and iMessage show when the site is
# linked.
#
# It has to be a raster image: none of them render an SVG og:image, which is why
# linking the site used to produce a bare grey box. 1200x630 is the size they all
# expect, and anything else gets letterboxed or cropped.
#
# Regenerate after `pnpm brand:sync`, then commit the PNG.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
# The guidelines call this the one for "documents, decks, anything wide".
SRC="$ROOT/apps/web/public/brand/lockup-inline-background_white-brandmark_red-wordmark_stacked_ink.svg"
# Next's file convention: dropping these in app/ makes it emit og:image with the
# type, width and height read off the file, so those can never drift from it.
OUT="$ROOT/apps/web/src/app/opengraph-image.png"
OUT_TWITTER="$ROOT/apps/web/src/app/twitter-image.png"

W=1200
H=630
# The lockup is roughly 3:1, so this leaves a clear margin on all four sides at
# the card's 1.91:1.
LOGO_W=820

command -v rsvg-convert >/dev/null || { echo "needs rsvg-convert (brew install librsvg)" >&2; exit 1; }
command -v magick >/dev/null || { echo "needs imagemagick (brew install imagemagick)" >&2; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

rsvg-convert --width="$LOGO_W" --keep-aspect-ratio --background-color=none \
  "$SRC" --output "$TMP/logo.png"

magick -size "${W}x${H}" canvas:white \
  "$TMP/logo.png" -gravity center -composite \
  -strip -quality 92 "$OUT"

# X wants its own file. Written from the same source here so the two cannot
# drift apart.
cp "$OUT" "$OUT_TWITTER"

# No trailing newline: Next puts the file's whole contents in the alt attribute.
ALT="Griffith ICT Club"
printf '%s' "$ALT" > "${OUT%.png}.alt.txt"
printf '%s' "$ALT" > "${OUT_TWITTER%.png}.alt.txt"

echo "wrote $(basename "$OUT") and $(basename "$OUT_TWITTER")  $(magick identify -format '%wx%h' "$OUT")  $(du -h "$OUT" | cut -f1)"

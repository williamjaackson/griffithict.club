#!/usr/bin/env bash
# Render Funnel's avatar to PNG.
#
# The Discord developer portal takes a raster upload for an application icon and
# will not accept an SVG, so the shape is authored once in assets/icon.svg and
# this produces the file you actually upload. 512x512 is what Discord stores;
# anything larger is downscaled by them and anything smaller is upscaled badly.
#
# Regenerate after editing the SVG, then commit the PNG.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
SRC="$ROOT/apps/funnel/assets/icon.svg"
OUT="$ROOT/apps/funnel/assets/icon-512.png"

for tool in rsvg-convert; do
  command -v "$tool" >/dev/null || { echo "$tool not found; brew install librsvg" >&2; exit 1; }
done

rsvg-convert -w 512 -h 512 "$SRC" -o "$OUT"
echo "wrote ${OUT#"$ROOT"/}"

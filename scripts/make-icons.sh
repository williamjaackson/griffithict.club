#!/usr/bin/env bash
# Render every bot avatar to PNG.
#
# The Discord developer portal takes a raster upload for an application icon and
# will not accept an SVG, so each bot authors its mark once in
# apps/<name>/assets/icon.svg and this produces the file you upload. 512x512 is
# what Discord stores: larger is downscaled by them, smaller is upscaled badly.
#
# Globs rather than naming each bot, so a new one is picked up by putting the SVG
# in the right place. Regenerate after editing any of them, then commit the PNGs.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
command -v rsvg-convert >/dev/null || { echo "rsvg-convert not found; brew install librsvg" >&2; exit 1; }

found=0
for src in "$ROOT"/apps/*/assets/icon.svg; do
  [ -e "$src" ] || continue
  found=1
  out="${src%.svg}-512.png"
  rsvg-convert -w 512 -h 512 "$src" -o "$out"
  echo "wrote ${out#"$ROOT"/}"
done

[ "$found" = 1 ] || { echo "no apps/*/assets/icon.svg found" >&2; exit 1; }

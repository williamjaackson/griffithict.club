#!/usr/bin/env bash
# Re-pull the logo SVGs from the brand guidelines repo.
#
# The artwork is generated, not drawn, so it is owned upstream and vendored here
# rather than edited in place. Never hand-edit anything in apps/web/public/brand.
set -euo pipefail

REPO="https://github.com/williamjaackson/griffithict.club_brand-guidelines.git"
DEST="$(git rev-parse --show-toplevel)/apps/web/public/brand"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

git clone --depth 1 "$REPO" "$TMP/brand" >/dev/null 2>&1

rm -f "$DEST"/*.svg
cp "$TMP/brand/logo/svg/"*.svg "$DEST/"
git -C "$TMP/brand" rev-parse HEAD > "$DEST/.source-sha"

echo "Synced $(ls -1 "$DEST"/*.svg | wc -l | tr -d ' ') files at $(cat "$DEST/.source-sha")"
echo "Regenerate the typed manifest with: pnpm brand:manifest"

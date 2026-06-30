#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
# Build the FabFlow product from this (private) repo.
#
# Same app code, COMMERCIAL config swapped in + paywall ON. Produces a folder you
# upload/push to your separate `fabflow` repo (GitHub Pages).
#
#   bash scripts/build-product.sh
#   → build/fabflow/   (upload its CONTENTS to the fabflow repo)
#
# Run this whenever you change the app and want to ship the update to customers.
# Editing happens HERE (one source of truth); the product is always a build of it.
# ════════════════════════════════════════════════════════════════════════════
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/build/fabflow"

# Guard: make sure the commercial config has been filled in.
if grep -q "TODO-COMMERCIAL-REF" "$ROOT/config.commercial.js"; then
  echo "⚠  config.commercial.js still has TODO placeholders."
  echo "   Fill in your commercial Supabase URL + anon key first (see TWO_VERSIONS.md)."
  echo "   Building anyway so you can preview…"
fi

echo "Building FabFlow product → $OUT"
rm -rf "$OUT"; mkdir -p "$OUT"

# 1) Identical app + shared code.
cp "$ROOT/index.html"                "$OUT/index.html"
cp -R "$ROOT/shared"                 "$OUT/shared"
cp -R "$ROOT/fabsuite"               "$OUT/fabsuite"
cp -R "$ROOT/admin"                  "$OUT/admin"
cp -R "$ROOT/supabase"               "$OUT/supabase"
[ -f "$ROOT/.nojekyll" ]             && cp "$ROOT/.nojekyll" "$OUT/.nojekyll"
[ -f "$ROOT/SET_PIN_FUNCTION_SETUP.md" ] && cp "$ROOT/SET_PIN_FUNCTION_SETUP.md" "$OUT/"
[ -f "$ROOT/FABSUITE_SETUP.md" ]     && cp "$ROOT/FABSUITE_SETUP.md" "$OUT/"
[ -f "$ROOT/NESTING_INTEGRATION.md" ] && cp "$ROOT/NESTING_INTEGRATION.md" "$OUT/"

# 2) The ONLY real difference: commercial config (Supabase + brand + paywall ON).
cp "$ROOT/config.commercial.js"          "$OUT/config.js"
cp "$ROOT/fabsuite/config.commercial.js" "$OUT/fabsuite/config.js"

# 3) Don't ship the templates or any stray DS_Store inside the product.
rm -f "$OUT/config.commercial.js" "$OUT/fabsuite/config.commercial.js" "$OUT/admin/preview.html"
find "$OUT" -name ".DS_Store" -delete 2>/dev/null || true

echo "✓ Done."
echo "  Upload the CONTENTS of $OUT to your 'fabflow' repo (or: cd build/fabflow && git init && push)."
echo "  Your private app (this repo) is untouched."

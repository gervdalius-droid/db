#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
# Build the CraftOS product from this (private) repo.
#
# Same app code, COMMERCIAL config swapped in + paywall ON. Produces one folder
# per deployment, which you push to its own GitHub Pages repo:
#
#   build/fabflow/          → repo `fabflow`          (DB app + storefront + admin)
#   build/fabflow-nesting/  → repo `fabflow-nesting`  (Nesting app)
#   build/fabflow-crm/      → repo `fabflow-crm`      (CRM app)
#   build/fabflow-offer/    → repo `fabflow-offer`    (Offer app, wrapped)
#   build/fabflow-invoices/ → repo `fabflow-invoices` (Invoices app, wrapped)
#
# Editing happens HERE (one source of truth); the product is always a build of
# it. Run this whenever you change an app and want to ship the update.
#
#   bash scripts/build-product.sh            # everything
#   bash scripts/build-product.sh crm offer  # just those
# ════════════════════════════════════════════════════════════════════════════
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$ROOT/build"
# The Offer calculator lives in its own repo; override with OFFER_SRC=… if it
# is checked out somewhere else.
OFFER_SRC="${OFFER_SRC:-$HOME/github/offer/index.html}"
# Same arrangement for the invoicing app (repo `invoices`).
INVOICES_SRC="${INVOICES_SRC:-$HOME/github/invoices}"

WANT="${*:-db nesting crm offer invoices}"
want() { [[ " $WANT " == *" $1 "* ]]; }
say()  { printf '\n\033[1m%s\033[0m\n' "$1"; }

# Guard: make sure the commercial configs have been filled in.
if grep -rq "TODO-COMMERCIAL-REF" "$ROOT"/*.commercial.js "$ROOT"/*/config.commercial.js 2>/dev/null; then
  echo "⚠  A commercial config still has TODO placeholders."
  echo "   Fill in the commercial Supabase URL + publishable key (see TWO_VERSIONS.md)."
  echo "   Building anyway so you can preview…"
fi

# ── Pre-flight: never build a paying product with no legal identity ─────────
# Stripe requires identifiable terms and a refund policy on the site, and the
# GDPR requires a named controller. If checkout is live (FREE_SIGNUP:false) but
# LEGAL.company is still blank, terms.html and privacy.html would render
# "[ COMPANY NAME ]" to paying customers. Fail closed.
SF="$ROOT/fabsuite/config.commercial.js"
if [ -f "$SF" ]; then
  # `|| true`: grep exits 1 when it matches nothing, and this script runs under
  # `set -e -o pipefail`, which would otherwise abort the build silently.
  paid=$(grep -cE "^[[:space:]]*FREE_SIGNUP:[[:space:]]*false" "$SF" || true)
  missing=""
  for k in company reg_no address email; do
    n=$(grep -cE "^[[:space:]]*$k:[[:space:]]*\"[^\"]+\"" "$SF" || true)
    [ "$n" = "0" ] && missing="$missing $k"
  done
  if [ "$paid" != "0" ] && [ -n "$missing" ]; then
    echo
    echo "✗  REFUSING TO BUILD: checkout is live but LEGAL is incomplete."
    echo "   Missing:$missing"
    echo "   fabsuite/config.commercial.js has FREE_SIGNUP:false, so customers"
    echo "   would be charged while terms.html / privacy.html still show"
    echo "   [ … ] placeholders where the seller should be identified."
    echo
    echo "   Fill those in — or set ALLOW_INCOMPLETE_LEGAL=1 for a preview build."
    echo
    [ "${ALLOW_INCOMPLETE_LEGAL:-0}" = "1" ] || exit 3
    echo "   ALLOW_INCOMPLETE_LEGAL=1 — building a preview."
  fi
fi

clean() { find "$1" -name ".DS_Store" -delete 2>/dev/null || true; }

# ── 1) DB app + storefront + admin ──────────────────────────────────────────
if want db; then
  OUT="$BUILD/fabflow"
  say "DB app + storefront → $OUT"
  # Keep the repo's .git so pushes stay incremental (build/fabflow is a checkout
  # of the product repo). Everything else is replaced.
  mkdir -p "$OUT"
  find "$OUT" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +

  cp "$ROOT/index.html"                     "$OUT/index.html"
  cp -R "$ROOT/shared"                      "$OUT/shared"
  cp -R "$ROOT/fabsuite"                    "$OUT/fabsuite"
  cp -R "$ROOT/admin"                       "$OUT/admin"
  cp -R "$ROOT/supabase"                    "$OUT/supabase"
  [ -f "$ROOT/.nojekyll" ]                  && cp "$ROOT/.nojekyll"              "$OUT/.nojekyll"
  [ -f "$ROOT/SET_PIN_FUNCTION_SETUP.md" ]  && cp "$ROOT/SET_PIN_FUNCTION_SETUP.md" "$OUT/"
  [ -f "$ROOT/FABSUITE_SETUP.md" ]          && cp "$ROOT/FABSUITE_SETUP.md"      "$OUT/"
  [ -f "$ROOT/NESTING_INTEGRATION.md" ]     && cp "$ROOT/NESTING_INTEGRATION.md" "$OUT/"

  # The ONLY real difference: commercial config (Supabase + brand + paywall ON).
  cp "$ROOT/config.commercial.js"           "$OUT/config.js"
  cp "$ROOT/fabsuite/config.commercial.js"  "$OUT/fabsuite/config.js"
  rm -f "$OUT/config.commercial.js" "$OUT/fabsuite/config.commercial.js" "$OUT/admin/preview.html"
  clean "$OUT"
  echo "  ✓ $(du -sh "$OUT" | cut -f1)"
fi

# ── 2) Nesting ──────────────────────────────────────────────────────────────
if want nesting; then
  OUT="$BUILD/fabflow-nesting"
  say "Nesting → $OUT"
  mkdir -p "$OUT"
  find "$OUT" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
  cp "$ROOT/nesting-patch/index.html"       "$OUT/index.html"
  cp -R "$ROOT/nesting-patch/shared"        "$OUT/shared"
  cp "$ROOT/nesting-patch/config.commercial.js" "$OUT/config.js"
  [ -f "$ROOT/.nojekyll" ] && cp "$ROOT/.nojekyll" "$OUT/.nojekyll"
  clean "$OUT"
  echo "  ✓ $(du -sh "$OUT" | cut -f1)"
fi

# ── 3) CRM ──────────────────────────────────────────────────────────────────
if want crm; then
  OUT="$BUILD/fabflow-crm"
  say "CRM → $OUT"
  mkdir -p "$OUT"
  find "$OUT" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
  cp "$ROOT/crm/index.html"                 "$OUT/index.html"
  cp -R "$ROOT/crm/shared"                  "$OUT/shared"
  cp "$ROOT/crm/config.commercial.js"       "$OUT/config.js"
  [ -f "$ROOT/.nojekyll" ] && cp "$ROOT/.nojekyll" "$OUT/.nojekyll"
  clean "$OUT"
  echo "  ✓ $(du -sh "$OUT" | cut -f1)"
fi

# ── 4) Offer (wrapped: pristine calculator + craftos.js) ────────────────────
if want offer; then
  OUT="$BUILD/fabflow-offer"
  say "Offer → $OUT"
  if [ ! -f "$OFFER_SRC" ]; then
    echo "  ⚠  Offer source not found at $OFFER_SRC — skipping."
    echo "     Clone the 'offer' repo, or set OFFER_SRC=/path/to/index.html."
  else
    mkdir -p "$OUT"
    find "$OUT" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
    cp -R "$ROOT/offer-patch/shared"          "$OUT/shared"
    cp "$ROOT/offer-patch/craftos.js"         "$OUT/craftos.js"
    cp "$ROOT/offer-patch/config.commercial.js" "$OUT/config.js"
    [ -f "$ROOT/.nojekyll" ] && cp "$ROOT/.nojekyll" "$OUT/.nojekyll"

    # Inject config.js into <head>, and the licence client + wrapper right
    # before </body> so they run after the calculator has defined its globals.
    python3 - "$OFFER_SRC" "$OUT/index.html" <<'PY'
import sys, io
src, dst = sys.argv[1], sys.argv[2]
s = io.open(src, encoding="utf-8").read()

head_tag = '<script src="config.js"></script>'
foot_tags = ('<script src="shared/fabsuite-license.js"></script>\n'
             '<script src="shared/craftos-backup.js"></script>\n'
             '<script src="craftos.js"></script>\n')

if head_tag not in s:
    i = s.lower().find("</head>")
    if i < 0:
        raise SystemExit("build: no </head> in the Offer source")
    s = s[:i] + head_tag + "\n" + s[i:]

if 'src="craftos.js"' not in s:
    j = s.lower().rfind("</body>")
    if j < 0:
        raise SystemExit("build: no </body> in the Offer source")
    s = s[:j] + foot_tags + s[j:]

io.open(dst, "w", encoding="utf-8").write(s)
print("  injected config.js + craftos.js")
PY
    clean "$OUT"
    echo "  ✓ $(du -sh "$OUT" | cut -f1)"
  fi
fi

# ── 5) Invoices (wrapped: pristine invoicing app + craftos.js) ─────────────
if want invoices; then
  OUT="$BUILD/fabflow-invoices"
  say "Invoices → $OUT"
  if [ ! -f "$INVOICES_SRC/index.html" ]; then
    echo "  ⚠  Invoices source not found at $INVOICES_SRC — skipping."
    echo "     Clone the 'invoices' repo, or set INVOICES_SRC=/path/to/repo."
  else
    mkdir -p "$OUT"
    find "$OUT" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
    cp -R "$ROOT/invoices-patch/shared"            "$OUT/shared"
    cp "$ROOT/invoices-patch/craftos.js"           "$OUT/craftos.js"
    cp "$ROOT/invoices-patch/config.commercial.js" "$OUT/config.js"
    [ -f "$ROOT/.nojekyll" ] && cp "$ROOT/.nojekyll" "$OUT/.nojekyll"

    # The company registry is a lazy, user-triggered ~6 MB download; ship the
    # payload and its metadata, but none of the build inputs beside them.
    if [ -f "$INVOICES_SRC/data/lt-registry.txt.gz" ]; then
      mkdir -p "$OUT/data"
      cp "$INVOICES_SRC/data/lt-registry.txt.gz" "$OUT/data/"
      [ -f "$INVOICES_SRC/data/lt-registry.json" ] && cp "$INVOICES_SRC/data/lt-registry.json" "$OUT/data/"
    fi

    # Inject config.js into <head>, and the licence client + wrapper right
    # before </body> so they run after the app has defined its globals.
    # cloud-config.js is deliberately NOT shipped: craftos.js owns the
    # connection, and the app already tolerates that script 404-ing.
    python3 - "$INVOICES_SRC/index.html" "$OUT/index.html" <<'PYINV'
import sys, io
src, dst = sys.argv[1], sys.argv[2]
s = io.open(src, encoding="utf-8").read()

head_tag = '<script src="config.js"></script>'
foot_tags = ('<script src="shared/fabsuite-license.js"></script>\n'
             '<script src="craftos.js"></script>\n')

if head_tag not in s:
    i = s.lower().find("</head>")
    if i < 0:
        raise SystemExit("build: no </head> in the Invoices source")
    s = s[:i] + head_tag + "\n" + s[i:]

if 'src="craftos.js"' not in s:
    j = s.lower().rfind("</body>")
    if j < 0:
        raise SystemExit("build: no </body> in the Invoices source")
    s = s[:j] + foot_tags + s[j:]

io.open(dst, "w", encoding="utf-8").write(s)
print("  injected config.js + craftos.js")
PYINV
    clean "$OUT"
    echo "  ✓ $(du -sh "$OUT" | cut -f1)"
  fi
fi

say "Done."
cat <<'TXT'
Before pushing, run the suite:  bash scripts/suite-test/run.sh   (55 checks,
including that each BUILT app boots clean — the source passing is not enough).

Push each folder to its own repo (GitHub Pages serves from the default branch):

  cd build/fabflow          && git add -A && git commit -m "Update" && git push
  cd build/fabflow-nesting  && git add -A && git commit -m "Update" && git push
  cd build/fabflow-crm      && git add -A && git commit -m "Update" && git push
  cd build/fabflow-offer    && git add -A && git commit -m "Update" && git push
  cd build/fabflow-invoices && git add -A && git commit -m "Update" && git push

Your private apps (this repo, ~/github/offer and ~/github/invoices) are untouched.
TXT

#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
# Publish the built product to the dbxfabflow GitHub Pages repos.
#
#   bash scripts/build-product.sh          # build first
#   GITHUB_TOKEN=ghp_... bash scripts/deploy.sh
#   GITHUB_TOKEN=ghp_... bash scripts/deploy.sh crm offer     # just those
#
# The token must belong to **dbxfabflow** (a classic PAT with `repo` scope, or a
# fine-grained token with Contents: read+write and Administration: read+write on
# these repos). The `gh` CLI on this machine is logged in as gervdalius-droid,
# which has NO push access here — that is why this script takes a token instead
# of using gh.
#
# Each deployment is its own repo served from main at /. The build folders keep
# their own .git so pushes stay incremental; missing repos are created and had
# Pages switched on automatically.
# ════════════════════════════════════════════════════════════════════════════
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OWNER="${DEPLOY_OWNER:-dbxfabflow}"
TOKEN="${GITHUB_TOKEN:-}"
MSG="${DEPLOY_MSG:-Update CraftOS ($(date +%Y-%m-%d))}"

#      key        build folder         repo name          live url path
TARGETS="
db|fabflow|fabflow|/
nesting|fabflow-nesting|fabflow-nesting|/
crm|fabflow-crm|fabflow-crm|/
offer|fabflow-offer|fabflow-offer|/
"

WANT="${*:-db nesting crm offer}"
want(){ [[ " $WANT " == *" $1 "* ]]; }
say(){ printf '\n\033[1m%s\033[0m\n' "$1"; }
ok(){  printf '  \033[32m✓\033[0m %s\n' "$1"; }
bad(){ printf '  \033[31m✗\033[0m %s\n' "$1"; }

# ── --verify: is what is live actually what we built? ───────────────────────
# Compares a fingerprint of each deployed entry file against the local build, so
# "I pushed it" and "it is live" are two different claims.
if [ "${1:-}" = "--verify" ]; then
  say "Live vs build"
  rc=0
  check_one(){ # name  local-file  live-url
    local n="$1" f="$2" u="$3"
    if [ ! -f "$f" ]; then bad "$n — not built"; rc=1; return; fi
    local lh rh
    lh=$(shasum -a 256 "$f" | cut -c1-12)
    rh=$(curl -s --max-time 20 "$u" | shasum -a 256 | cut -c1-12)
    if [ "$lh" = "$rh" ]; then ok "$n up to date ($lh)"
    else bad "$n STALE — build $lh, live $rh"; rc=1; fi
  }
  B="$ROOT/build"; O="https://$OWNER.github.io"
  check_one "storefront i18n" "$B/fabflow/fabsuite/i18n.js"    "$O/fabflow/fabsuite/i18n.js"
  check_one "storefront page" "$B/fabflow/fabsuite/index.html" "$O/fabflow/fabsuite/index.html"
  check_one "DB app"          "$B/fabflow/index.html"          "$O/fabflow/index.html"
  check_one "Nesting"         "$B/fabflow-nesting/index.html"  "$O/fabflow-nesting/index.html"
  check_one "CRM"             "$B/fabflow-crm/index.html"      "$O/fabflow-crm/index.html"
  check_one "Offer"           "$B/fabflow-offer/index.html"    "$O/fabflow-offer/index.html"
  exit $rc
fi

if [ -z "$TOKEN" ]; then
  echo "No GITHUB_TOKEN set."
  echo
  echo "This needs a token for the '$OWNER' account — the gh CLI here is signed in"
  echo "as gervdalius-droid, which has read-only access to those repos."
  echo
  echo "  github.com → Settings → Developer settings → Personal access tokens"
  echo "  Classic token with the 'repo' scope is simplest."
  echo
  echo "  GITHUB_TOKEN=ghp_... bash scripts/deploy.sh"
  exit 1
fi

api(){ # api METHOD PATH [json]
  local m="$1" p="$2" body="${3:-}"
  if [ -n "$body" ]; then
    curl -s -X "$m" "https://api.github.com$p" \
      -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" \
      -H "Content-Type: application/json" -d "$body"
  else
    curl -s -X "$m" "https://api.github.com$p" \
      -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json"
  fi
}

who=$(api GET /user | python3 -c "import sys,json;print(json.load(sys.stdin).get('login','?'))" 2>/dev/null)
if [ "$who" != "$OWNER" ]; then
  echo "✗ That token belongs to '$who', not '$OWNER'. Refusing to push."
  exit 2
fi
ok "authenticated as $who"

FAILED=0
echo "$TARGETS" | while IFS='|' read -r key folder repo path; do
  [ -z "${key:-}" ] && continue
  want "$key" || continue
  OUT="$ROOT/build/$folder"
  say "$repo  ←  build/$folder"

  if [ ! -d "$OUT" ]; then
    bad "not built — run: bash scripts/build-product.sh $key"
    FAILED=1; continue
  fi

  # Create the repo the first time, and turn Pages on.
  if ! api GET "/repos/$OWNER/$repo" | grep -q '"full_name"'; then
    api POST /user/repos "{\"name\":\"$repo\",\"private\":false,\"description\":\"CraftOS — $key\",\"has_issues\":false,\"has_wiki\":false}" >/dev/null
    ok "created $OWNER/$repo"
    NEW=1
  else
    NEW=0
  fi

  cd "$OUT" || { bad "cannot enter $OUT"; FAILED=1; continue; }
  [ -d .git ] || { git init -q -b main; ok "git init"; }
  git config user.name  "CraftOS deploy"
  git config user.email "$OWNER@users.noreply.github.com"
  git remote remove origin 2>/dev/null
  git remote add origin "https://x-access-token:$TOKEN@github.com/$OWNER/$repo.git"

  git add -A
  if git diff --cached --quiet 2>/dev/null && [ "$(git rev-list --count HEAD 2>/dev/null || echo 0)" != "0" ]; then
    ok "no changes"
  else
    git commit -q -m "$MSG" || true
    if git push -q --force origin main 2>/dev/null; then
      ok "pushed $(git rev-parse --short HEAD)"
    else
      bad "push failed"; FAILED=1; continue
    fi
  fi

  # Pages: enable on a fresh repo, otherwise leave the existing config alone.
  if [ "$NEW" = "1" ]; then
    sleep 2
    api POST "/repos/$OWNER/$repo/pages" '{"source":{"branch":"main","path":"/"}}' >/dev/null
    ok "Pages enabled → https://$OWNER.github.io/$repo/"
  fi
  # The token must never survive in a config file on disk.
  git remote set-url origin "https://github.com/$OWNER/$repo.git"
done

say "Done. Pages takes ~1 minute to rebuild."
echo "Verify with:  bash scripts/deploy.sh --verify"

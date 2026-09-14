#!/usr/bin/env bash
# Apply the tenant-isolation migrations to a real Postgres (PGlite/WASM) and
# assert that the policies actually isolate tenants.
#   bash scripts/rls-test/run.sh
# Needs network access once, to fetch PGlite from the CDN.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT=8763
PGLITE_SRC="${PGLITE_SRC:-/private/tmp/claude-501/-Users-User/fbf3394d-570b-49d5-95e8-b4363b362c9a/scratchpad/pglite}"
STAGE="$ROOT/scripts/rls-test/_pglite"

# PGlite (Postgres 16 in WASM) is vendored rather than imported from a CDN:
# headless Chrome's virtual clock skips past real network waits, so a remote
# module import never resolves. ~18 MB, not committed — see .gitignore.
if [ ! -f "$STAGE/index.js" ]; then
  if [ -d "$PGLITE_SRC" ]; then mkdir -p "$STAGE"; cp "$PGLITE_SRC"/* "$STAGE"/;
  else echo "PGlite not found. Fetch it with:"; \
       echo "  npm pack @electric-sql/pglite  (or curl the dist/ files from cdn.jsdelivr.net)"; \
       echo "  then point PGLITE_SRC at the dist folder."; exit 2; fi
fi

exec python3 "$ROOT/scripts/rls-test/serve_and_run.py"

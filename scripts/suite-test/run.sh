#!/usr/bin/env bash
# Run the CraftOS suite tests headlessly. Exits non-zero on any failure.
#   bash scripts/suite-test/run.sh
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OFFER="${OFFER_SRC:-$HOME/github/offer}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT=8761
STAGE="$ROOT/scripts/suite-test/_offer"

# The Offer app lives in its own repo, but the tests reach into its globals —
# so it has to be served from the SAME origin as the runner, not a second port.
rm -rf "$STAGE"; mkdir -p "$STAGE"
if [ -f "$OFFER/index.html" ]; then cp "$OFFER/index.html" "$STAGE/index.html"; fi

python3 -m http.server $PORT --directory "$ROOT" >/dev/null 2>&1 & SRVPID=$!
trap 'kill $SRVPID 2>/dev/null; rm -rf "$STAGE" "$ROOT/scripts/suite-test/_where.js"' EXIT
sleep 1.5

cat > "$ROOT/scripts/suite-test/_where.js" <<JS
var OFFER_SRC = '_offer/index.html';
JS
# Idempotent: strip any tag a previous run left behind before adding this one,
# otherwise every run stacks another <script src="_where.js"> into the file.
sed -i '' 's|<script src="_where.js"></script>||g' "$ROOT/scripts/suite-test/runner.html" 2>/dev/null || true
sed -i '' 's|<script src="tests.js">|<script src="_where.js"></script><script src="tests.js">|' "$ROOT/scripts/suite-test/runner.html" 2>/dev/null || true

OUT=$("$CHROME" --headless --disable-gpu --no-sandbox --virtual-time-budget=45000 \
      --dump-dom "http://localhost:$PORT/scripts/suite-test/runner.html" 2>/dev/null)

echo "$OUT" | python3 -c "
import sys,re,html
s=sys.stdin.read()
m=re.search(r'<div id=\"out\">(.*?)</div>\s*<div id=\"sum\">', s, re.S)
if m:
    body=m.group(1)
    body=re.sub(r'<h2[^>]*>(.*?)</h2>', lambda x:'\n== '+html.unescape(x.group(1))+' ==', body)
    body=re.sub(r'<div class=\"(ok|fail)\">(.*?)</div>', lambda x:'  '+html.unescape(x.group(2)), body)
    body=re.sub(r'<[^>]+>','',body)
    print('\n'.join(l for l in body.split('\n') if l.strip()))
t=re.search(r'<title>([^<]*)</title>', s)
print('\n'+ (t.group(1) if t else 'NO RESULT'))
sys.exit(0 if t and t.group(1).startswith('PASS') else 1)
"

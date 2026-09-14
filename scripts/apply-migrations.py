#!/usr/bin/env python3
"""
Apply the pending CraftOS migrations to a live Supabase project, with checks.

Needs a Supabase **personal access token** (starts `sbp_`), created at
https://supabase.com/dashboard/account/tokens — it is the only credential that
can run DDL over the API. The publishable key cannot, and the service-role key
cannot either (PostgREST does not do DDL).

  python3 scripts/apply-migrations.py --print         # no token needed: writes a
                                                      # single file to paste into
                                                      # the SQL editor
  export SUPABASE_ACCESS_TOKEN=sbp_...
  python3 scripts/apply-migrations.py                 # dry run: shows the plan
  python3 scripts/apply-migrations.py --apply         # actually apply

What it does, in order:
  1. Refuses to start unless `set-worker-pin` is deployed — older versions
     created workers with no org_members row, and 0005 would lock them out.
  2. Snapshots the row counts it is about to put behind RLS.
  3. Applies 0003 → 0004 → 0005, stopping at the first failure.
  4. Verifies: entitlement reports has_crm/has_offer; the publishable key can no
     longer read fabflow; org_entitlement still answers for anon.
"""
import json, os, sys, urllib.request, urllib.error, pathlib

REF = os.environ.get("SUPABASE_PROJECT_REF", "yyamcwkbwptvrdbylqji")
TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "").strip()
PUBKEY = os.environ.get("SUPABASE_PUBLISHABLE_KEY",
                        "sb_publishable_ODSJnx1sWO1KUjQEl0IRZQ_2_Iyz596")
BASE = "https://%s.supabase.co" % REF
API = "https://api.supabase.com/v1/projects/%s/database/query" % REF
MIGRATIONS = ["0003_apps_catalog.sql", "0004_project_tenancy.sql",
              "0005_tenant_isolation.sql"]
HERE = pathlib.Path(__file__).resolve().parent.parent / "supabase" / "migrations"
APPLY = "--apply" in sys.argv
PRINT = "--print" in sys.argv


# Cloudflare fronts the Management API and rejects urllib's default signature
# with a 403 (error 1010), so every request carries a normal User-Agent.
UA = "craftos-migrations/1.0 (+https://github.com/dbxfabflow)"


def http(url, data=None, headers=None, method=None):
    h = dict(headers or {})
    h.setdefault("User-Agent", UA)
    h.setdefault("Accept", "application/json")
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:
        return 0, str(e)


def sql(query):
    return http(API, json.dumps({"query": query}).encode(),
                {"Authorization": "Bearer " + TOKEN,
                 "Content-Type": "application/json"}, "POST")


def rest(path, key=None):
    return http(BASE + path, headers={"apikey": key or PUBKEY})


def ok(m):   print("  \033[32m✓\033[0m " + m)
def bad(m):  print("  \033[31m✗\033[0m " + m)
def info(m): print("  · " + m)


def write_combined():
    """Emit all pending migrations as one paste-ready file — no token required."""
    out = pathlib.Path(__file__).resolve().parent.parent / "APPLY_ME.sql"
    parts = ["""-- ════════════════════════════════════════════════════════════════════════════
-- CraftOS — pending migrations, in order. Paste ALL of this into
-- Supabase → SQL Editor → New query → Run.
--
-- BEFORE YOU RUN IT: redeploy the `set-worker-pin` edge function. Older
-- versions created workers with no org_members row, and section 6 of 0005 is
-- what gets those workers their access back.
--
-- The editor wraps a paste in one transaction, so if anything fails NOTHING is
-- applied and you can just fix and re-run. Every statement here is idempotent.
--
-- AFTERWARDS, check two things:
--   1. this must return NO rows —
--        (run it from a terminal, not the editor, so it uses the public key)
--        curl "https://%s.supabase.co/rest/v1/fabflow?select=key&limit=1" \\
--             -H "apikey: <your publishable key>"
--   2. sign in as a WORKER and as a MANAGER; both must still work.
--      If either is blocked:  select public.fab_whoami();
-- ════════════════════════════════════════════════════════════════════════════
""" % REF]
    for f in MIGRATIONS:
        parts.append("\n\n-- ═══ %s ═══════════════════════════════════════════\n\n" % f)
        parts.append((HERE / f).read_text(encoding="utf-8"))
    out.write_text("".join(parts), encoding="utf-8")
    print("Wrote %s (%d KB)" % (out, out.stat().st_size // 1024))
    print("\nPaste it into Supabase → SQL Editor → Run. No token needed.")
    print("Redeploy set-worker-pin first.")
    return 0


def main():
    if PRINT:
        return write_combined()
    print("CraftOS — migration applier")
    print("project: %s   mode: %s\n" % (REF, "APPLY" if APPLY else "dry run"))

    # ── 1. the worker-lockout guard ────────────────────────────────────────
    print("1) pre-flight")
    code, _ = http(BASE + "/functions/v1/set-worker-pin",
                   b"{}", {"apikey": PUBKEY, "Content-Type": "application/json"}, "POST")
    if code == 0:
        bad("cannot reach the project at all — is it awake?"); return 2
    ok("set-worker-pin is deployed (HTTP %d)" % code)
    print("     ⚠ this only proves it EXISTS. If you have not redeployed it since")
    print("       the org_members change, do that first or 0005 locks workers out.")

    if not TOKEN:
        print("\nNo SUPABASE_ACCESS_TOKEN set — stopping before any change.")
        print("Create one at https://supabase.com/dashboard/account/tokens then:")
        print("  export SUPABASE_ACCESS_TOKEN=sbp_...")
        print("  python3 scripts/apply-migrations.py --apply")
        return 1

    # ── 2. what is about to go behind RLS ──────────────────────────────────
    print("\n2) snapshot")
    st, body = sql("select count(*) as n from public.fabflow")
    if st not in (200, 201):
        bad("cannot run SQL: HTTP %d %s" % (st, body[:200])); return 2
    info("fabflow rows: %s" % body.strip())
    st, body = sql("select count(*) as n from public.org_members")
    info("org_members rows: %s" % body.strip())
    st, body = sql("select count(*) as n from auth.users where email like '%@%'")
    info("auth users: %s" % body.strip())

    if not APPLY:
        print("\nDry run — nothing changed. Re-run with --apply.")
        return 0

    # ── 3. apply ───────────────────────────────────────────────────────────
    print("\n3) applying")
    for f in MIGRATIONS:
        text = (HERE / f).read_text(encoding="utf-8")
        st, body = sql(text)
        if st not in (200, 201):
            bad("%s FAILED: %s" % (f, body[:400]))
            print("\nStopped. Nothing after this ran. The SQL editor wraps a paste in")
            print("one transaction, so this migration rolled back cleanly.")
            return 2
        ok(f)

    # ── 4. verify ──────────────────────────────────────────────────────────
    print("\n4) verify")
    st, body = http(BASE + "/rest/v1/rpc/org_entitlement",
                    b'{"p_code":"ZZZZZ"}',
                    {"apikey": PUBKEY, "Content-Type": "application/json"}, "POST")
    try:
        d = json.loads(body)
        (ok if "has_crm" in d and "has_offer" in d else bad)(
            "entitlement reports has_crm/has_offer")
    except Exception:
        bad("entitlement response unreadable: " + body[:120])

    closed = True
    for t in ("fabflow", "fabflow_stock", "fabflow_offcuts",
              "fabflow_cut_jobs", "fabflow_projects"):
        st, body = rest("/rest/v1/%s?select=*&limit=1" % t)
        leaked = st == 200 and body.strip() not in ("[]", "")
        if leaked:
            closed = False
            bad("%s is STILL readable with the publishable key" % t)
        else:
            ok("%s no longer readable with the publishable key (HTTP %d)" % (t, st))
    (ok if closed else bad)("tenant isolation is %s" % ("closed" if closed else "NOT closed"))

    print("\nNow sign in as a worker AND as a manager and confirm both still work.")
    print("If anything is blocked:  select public.fab_whoami();")
    return 0 if closed else 1


if __name__ == "__main__":
    sys.exit(main())

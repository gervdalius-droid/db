# Tenant-isolation tests

Runs the migrations against a **real Postgres** and proves the row-level
security policies actually isolate one customer from another.

```bash
bash scripts/rls-test/run.sh      # exit 0 = 25/25
```

## Why it exists

`0005_tenant_isolation.sql` is the migration that stops every customer being
able to read every other customer's data. It is also the migration most likely
to lock people out if it is wrong — enable RLS without a policy that matches how
workers actually sign in, and the entire shop floor is locked out on Monday.

It cannot be rehearsed on the live database, and this machine has no Postgres,
no Docker and no brew. So the harness boots **PGlite** — Postgres 18 compiled to
WebAssembly — inside headless Chrome, stubs the handful of Supabase objects the
migrations reference (`auth.users`, `auth.uid()`, `auth.role()`, and the `anon`
/ `authenticated` / `service_role` roles), and runs the real files from
`supabase/migrations/`.

This caught two bugs that would each have made the paste fail outright: a
set-returning function whose output column was never aliased, in both
`fab_is_member()` and `fab_whoami()`.

## What it asserts

- all six migrations apply, and **re-apply** (idempotency)
- an owner sees only their own workspace's rows
- **a worker can still read their workspace** — the lockout risk
- a manager reads their own `fab_admin_<uid>` row but not another's
- writing into another tenant is refused by the policy
- `fabflow_projects` / `fabflow_stock` are scoped by `workspace_code`
- a signed-in user with no membership sees nothing
- `anon` is refused outright — the publishable key stops being a skeleton key
- `org_entitlement` still answers for `anon`, because the paywall runs before
  sign-in, and reports `has_crm` / `has_offer`
- `fab_whoami()` reports the caller's workspaces, for debugging a lockout
- 0005 §6 adopts a pre-existing worker who has no membership row

## Notes

`run.sh` vendors PGlite into `_pglite/` (~18 MB, gitignored). It is not imported
from a CDN because headless Chrome's virtual clock fast-forwards past real
network waits, so a remote module import never resolves. For the same reason the
harness POSTs its result to `serve_and_run.py` instead of being scraped with
`--dump-dom`, which fires at the load event — long before Postgres has booted.

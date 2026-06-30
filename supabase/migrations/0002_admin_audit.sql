-- ════════════════════════════════════════════════════════════════════════════
-- Admin audit log
-- ────────────────────────────────────────────────────────────────────────────
-- Every action taken in the operator console (grant free access, cancel, extend
-- trial, reset password, …) is recorded here so there's always a clear history
-- of who did what. Only the service role (the admin edge function) writes to it.
--
-- Apply: Supabase → SQL Editor → paste → Run. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.fab_audit_log (
  id             bigint generated always as identity primary key,
  at             timestamptz not null default now(),
  admin_email    text,
  action         text not null,
  workspace_code text,
  detail         jsonb not null default '{}'
);

create index if not exists fab_audit_at_idx on public.fab_audit_log(at desc);
create index if not exists fab_audit_ws_idx on public.fab_audit_log(workspace_code);

-- Locked: only the service role (admin edge function) can read/write.
alter table public.fab_audit_log enable row level security;

-- Helpful indexes for the customers list / dashboard.
create index if not exists fab_orgs_status_idx  on public.fab_orgs(status);
create index if not exists fab_orgs_created_idx on public.fab_orgs(created_at desc);

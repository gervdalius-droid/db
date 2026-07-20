-- ════════════════════════════════════════════════════════════════════════════
-- FabFlow — base app tables (run FIRST on a fresh commercial project)
-- ────────────────────────────────────────────────────────────────────────────
-- Creates the tables the DB app and the Nesting app read/write. Column shapes
-- match exactly how the apps use them. Kept permissive (like your working
-- project) so everything works out of the box; you can harden with RLS later
-- (see WAREHOUSE_AUTH_SETUP.md). Then run 0001_fabsuite_billing.sql and
-- 0002_admin_audit.sql.
--
-- Apply: Supabase → SQL Editor → paste all → Run. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) The main key-value store (all DB-app data, namespaced by workspace) ──
create table if not exists public.fabflow (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

-- ── 2) Shared warehouse the DB app publishes and Nesting reads ──────────────
create table if not exists public.fabflow_stock (
  workspace_code text not null,
  sku            text not null,
  material       text,
  thickness      numeric,
  unit           text default 'm²',
  qty            numeric default 0,
  reserved       numeric default 0,
  available      numeric default 0,
  sheet_w        numeric,
  sheet_h        numeric,
  kind           text default 'sheet',
  archived       boolean default false,
  updated_at     timestamptz not null default now(),
  primary key (workspace_code, sku)
);

create table if not exists public.fabflow_offcuts (
  id             text primary key,          -- '<WORKSPACE>:<id>'
  workspace_code text,
  sku            text,
  material       text,
  thickness      numeric,
  w              numeric,
  h              numeric,
  shape          text,
  status         text default 'available',
  source_job_id  text,
  archived       boolean default false,
  updated_at     timestamptz not null default now()
);

-- ── 3) Cut-job reservations sent from Nesting, confirmed in the DB app ──────
create table if not exists public.fabflow_cut_jobs (
  id             text primary key,
  workspace_code text,
  project_name   text,
  gvs_project_id text,
  status         text default 'reserved',
  lines          jsonb default '[]',
  offcuts        jsonb default '[]',
  created_by     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── 4) Nesting projects (the Nesting app's own saved jobs) ─────────────────
create table if not exists public.fabflow_projects (
  name       text primary key,
  data       jsonb,
  updated_at timestamptz not null default now()
);

-- ── Access ──────────────────────────────────────────────────────────────────
-- Permissive, matching your current working setup (isolation is by workspace
-- code). The browser apps use the anon key (falling back) and the logged-in
-- user's JWT. RLS stays OFF here; harden later per WAREHOUSE_AUTH_SETUP.md.
grant all on public.fabflow           to anon, authenticated;
grant all on public.fabflow_stock     to anon, authenticated;
grant all on public.fabflow_offcuts   to anon, authenticated;
grant all on public.fabflow_cut_jobs  to anon, authenticated;
grant all on public.fabflow_projects  to anon, authenticated;

-- Explicitly keep RLS OFF. The Supabase dashboard nags you to "Enable RLS" on
-- public tables; if enabled without policies it blocks the apps with
-- "42501: new row violates row-level security policy". The apps isolate tenants
-- by workspace code in app logic. Re-run this block to undo an accidental enable.
alter table public.fabflow           disable row level security;
alter table public.fabflow_stock     disable row level security;
alter table public.fabflow_offcuts   disable row level security;
alter table public.fabflow_cut_jobs  disable row level security;
alter table public.fabflow_projects  disable row level security;

-- ════════════════════════════════════════════════════════════════════════════
-- Fabsuite billing & entitlements
-- ────────────────────────────────────────────────────────────────────────────
-- Turns the apps (NESTING + DB) into a sellable subscription product.
--
-- The apps already namespace every row in `fabflow` by a WORKSPACE CODE
-- (keys look like  fab_<CODE>_projects ). A "workspace" therefore == one
-- customer company == one tenant. This migration adds a billing registry
-- keyed by that same workspace_code, plus a safe way for the browser apps to
-- ask "is this workspace's subscription active, and for which apps?".
--
-- HOW TO APPLY: Supabase dashboard → SQL Editor → paste this whole file → Run.
-- Idempotent: safe to run more than once.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) Registry: one row per customer workspace ─────────────────────────────
create table if not exists public.fab_orgs (
  workspace_code        text primary key,                 -- e.g. 'FAB123' (matches fab_<CODE>_ keys)
  name                  text,                              -- company / workspace name
  owner_user_id         uuid references auth.users(id) on delete set null,
  owner_email           text,
  stripe_customer_id    text unique,
  stripe_subscription_id text,
  plan                  text,                              -- 'nesting' | 'db' | 'suite' | null
  billing_interval      text,                              -- 'month' | 'year' | null
  apps                  text[] not null default '{}',      -- unlocked apps, e.g. {'nesting','db'}
  status                text not null default 'none',      -- none|trialing|active|past_due|canceled|unpaid
  comp                  boolean not null default false,    -- complimentary / legacy free access (overrides status)
  trial_end             timestamptz,
  current_period_end    timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists fab_orgs_owner_idx     on public.fab_orgs(owner_user_id);
create index if not exists fab_orgs_customer_idx  on public.fab_orgs(stripe_customer_id);

-- ── 2) Membership map (user → workspace) ────────────────────────────────────
-- Lets us tie an auth user to their workspace(s) for the account page and for
-- future RLS hardening on `fabflow`. Populated by register-org / set-worker-pin.
create table if not exists public.org_members (
  user_id        uuid not null references auth.users(id) on delete cascade,
  workspace_code text not null references public.fab_orgs(workspace_code) on delete cascade,
  role           text not null default 'worker',           -- owner|manager|engineer|worker|view
  created_at     timestamptz not null default now(),
  primary key (user_id, workspace_code)
);
create index if not exists org_members_ws_idx on public.org_members(workspace_code);

-- ── 3) keep updated_at fresh ────────────────────────────────────────────────
create or replace function public.fab_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists fab_orgs_touch on public.fab_orgs;
create trigger fab_orgs_touch before update on public.fab_orgs
  for each row execute function public.fab_touch_updated_at();

-- ── 4) Lock the tables down ─────────────────────────────────────────────────
-- RLS ON with NO public policies = only the service role (edge functions /
-- webhook) and SECURITY DEFINER functions below can touch these rows. Browsers
-- never read or write the billing tables directly; they go through the RPCs.
alter table public.fab_orgs    enable row level security;
alter table public.org_members enable row level security;

-- Members may read their own membership rows (handy for the account page).
drop policy if exists org_members_self_read on public.org_members;
create policy org_members_self_read on public.org_members
  for select using (user_id = auth.uid());

-- ── 5) "active" helper: is a subscription currently good for access? ─────────
create or replace function public.fab_is_active(o public.fab_orgs)
returns boolean language sql immutable as $$
  select o.comp
      or o.status in ('trialing','active','past_due');
$$;

-- ── 6) PUBLIC entitlement check the browser apps call ───────────────────────
-- Returns just enough to gate the apps. Exposing "is workspace X active" to a
-- caller who already knows the code is not sensitive: in this model, knowing
-- the workspace code is already what grants access to the workspace data.
-- SECURITY DEFINER so it can read fab_orgs past RLS; only returns status, never
-- billing identifiers.
create or replace function public.org_entitlement(p_code text)
returns json
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select json_build_object(
        'workspace_code',     o.workspace_code,
        'name',               o.name,
        'status',             o.status,
        'plan',               o.plan,
        'interval',           o.billing_interval,
        'apps',               o.apps,
        'comp',               o.comp,
        'active',             public.fab_is_active(o),
        'has_nesting',        public.fab_is_active(o) and ('nesting' = any(o.apps)),
        'has_db',             public.fab_is_active(o) and ('db'      = any(o.apps)),
        'trial_end',          o.trial_end,
        'current_period_end', o.current_period_end,
        'found',              true
      )
      from public.fab_orgs o
      where o.workspace_code = upper(p_code)),
    json_build_object('workspace_code', upper(p_code), 'status','none',
                      'apps', '[]'::json, 'active', false,
                      'has_nesting', false, 'has_db', false, 'found', false)
  );
$$;

revoke all on function public.org_entitlement(text) from public;
grant execute on function public.org_entitlement(text) to anon, authenticated;

-- ── 7) The signed-in owner's own orgs (for the account page) ────────────────
create or replace function public.my_orgs()
returns setof public.fab_orgs
language sql
security definer
set search_path = public
as $$
  select * from public.fab_orgs
  where owner_user_id = auth.uid()
     or workspace_code in (select workspace_code from public.org_members where user_id = auth.uid());
$$;
revoke all on function public.my_orgs() from public;
grant execute on function public.my_orgs() to authenticated;

-- ── 8) One-time helper: grant a workspace permanent free (comp) access ───────
-- Use this for your existing/legacy company so nothing breaks when billing
-- goes live. Run e.g.:   select public.fabsuite_grant_comp('FAB123','Dėdės Baldai');
create or replace function public.fabsuite_grant_comp(p_code text, p_name text default null)
returns public.fab_orgs
language plpgsql
security definer
set search_path = public
as $$
declare row public.fab_orgs;
begin
  insert into public.fab_orgs (workspace_code, name, plan, apps, status, comp)
  values (upper(p_code), p_name, 'suite', array['nesting','db'], 'active', true)
  on conflict (workspace_code) do update
    set comp = true,
        apps = array['nesting','db'],
        status = 'active',
        plan = coalesce(public.fab_orgs.plan, 'suite'),
        name = coalesce(p_name, public.fab_orgs.name)
  returning * into row;
  return row;
end $$;
revoke all on function public.fabsuite_grant_comp(text,text) from public;
-- intentionally NOT granted to anon/authenticated: run it from the SQL editor
-- (service role) only.

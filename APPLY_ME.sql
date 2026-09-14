-- ════════════════════════════════════════════════════════════════════════════
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
--        curl "https://yyamcwkbwptvrdbylqji.supabase.co/rest/v1/fabflow?select=key&limit=1" \
--             -H "apikey: <your publishable key>"
--   2. sign in as a WORKER and as a MANAGER; both must still work.
--      If either is blocked:  select public.fab_whoami();
-- ════════════════════════════════════════════════════════════════════════════


-- ═══ 0003_apps_catalog.sql ═══════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════
-- CraftOS — 4-app catalog (nesting · db · crm · offer)
-- ────────────────────────────────────────────────────────────────────────────
-- Adds CRM and Offer to the sellable app catalog. Only replaces the two
-- functions that hard-coded the old two-app list; no table changes.
--
-- Apply: Supabase → SQL Editor → paste all → Run. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Entitlement check the browser apps call ─────────────────────────────────
-- Now reports has_crm / has_offer alongside has_nesting / has_db. The generic
-- `apps` array is what the shared license client actually reads; the has_*
-- booleans are kept for convenience and backwards compatibility.
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
        'has_crm',            public.fab_is_active(o) and ('crm'     = any(o.apps)),
        'has_offer',          public.fab_is_active(o) and ('offer'   = any(o.apps)),
        'trial_end',          o.trial_end,
        'current_period_end', o.current_period_end,
        'found',              true
      )
      from public.fab_orgs o
      where o.workspace_code = upper(p_code)),
    json_build_object('workspace_code', upper(p_code), 'status','none',
                      'apps', '[]'::json, 'active', false,
                      'has_nesting', false, 'has_db', false,
                      'has_crm', false, 'has_offer', false, 'found', false)
  );
$$;

revoke all on function public.org_entitlement(text) from public;
grant execute on function public.org_entitlement(text) to anon, authenticated;

-- ── Comp helper: a comped workspace now gets every app ──────────────────────
create or replace function public.fabsuite_grant_comp(p_code text, p_name text default null)
returns public.fab_orgs
language plpgsql
security definer
set search_path = public
as $$
declare row public.fab_orgs;
begin
  insert into public.fab_orgs (workspace_code, name, plan, apps, status, comp)
  values (upper(p_code), p_name, 'suite', array['nesting','db','crm','offer'], 'active', true)
  on conflict (workspace_code) do update
    set comp = true,
        apps = array['nesting','db','crm','offer'],
        status = 'active',
        plan = coalesce(public.fab_orgs.plan, 'suite'),
        name = coalesce(p_name, public.fab_orgs.name)
  returning * into row;
  return row;
end $$;
revoke all on function public.fabsuite_grant_comp(text,text) from public;

-- ── Back-fill: every existing suite / comped workspace unlocks the new apps ──
update public.fab_orgs
   set apps = array['nesting','db','crm','offer']
 where (comp = true or plan = 'suite')
   and not (apps @> array['crm','offer']);


-- ═══ 0004_project_tenancy.sql ═══════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════
-- CraftOS — scope Nesting projects to a workspace
-- ────────────────────────────────────────────────────────────────────────────
-- `fabflow_projects` was keyed on `name` alone. In a single-tenant deployment
-- that is fine; in the product it means two customers who both save a project
-- called "Virtuvė" overwrite each other, and every customer's project list
-- shows every other customer's projects.
--
-- This adds the missing tenant column and moves the primary key onto
-- (workspace_code, name). Existing rows are attributed to a workspace you pass
-- in below — set it to your own code before running, or leave 'LOCAL' if the
-- project is fresh and has no rows worth keeping.
--
-- Apply: Supabase → SQL Editor → paste all → Run. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

-- 1) The column, defaulted so old clients that don't send it still write a row.
alter table public.fabflow_projects
  add column if not exists workspace_code text not null default 'LOCAL';

-- 2) Attribute pre-existing rows. Change 'LOCAL' if your legacy rows belong to
--    a real workspace code.
update public.fabflow_projects
   set workspace_code = 'LOCAL'
 where workspace_code is null or workspace_code = '';

-- 3) Move the primary key onto (workspace_code, name).
do $$
declare pk_name text;
begin
  select conname into pk_name
    from pg_constraint
   where conrelid = 'public.fabflow_projects'::regclass and contype = 'p';

  -- Already composite? nothing to do.
  if pk_name is not null and (
       select count(*) from unnest((
         select conkey from pg_constraint where conname = pk_name
       )) ) = 2 then
    return;
  end if;

  if pk_name is not null then
    execute format('alter table public.fabflow_projects drop constraint %I', pk_name);
  end if;

  alter table public.fabflow_projects
    add constraint fabflow_projects_pkey primary key (workspace_code, name);
end $$;

create index if not exists fabflow_projects_ws_idx
  on public.fabflow_projects(workspace_code, updated_at desc);

-- 4) Keep the grants/RLS posture the base schema set.
grant all on public.fabflow_projects to anon, authenticated;


-- ═══ 0005_tenant_isolation.sql ═══════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════
-- CraftOS — tenant isolation (row-level security)
-- ────────────────────────────────────────────────────────────────────────────
-- Until now every app table was `grant all … to anon` with RLS OFF, and the
-- publishable key ships inside public JavaScript. That is fine for a single
-- workshop running its own copy; for the product it means any customer — or
-- anyone who opens the page — can read and write every other customer's data.
--
-- This migration closes that. Access is decided by ONE question: is the signed-in
-- user a member of the workspace that owns the row?
--
--   • `fabflow` rows are namespaced by key: fab_<CODE>_…   → code parsed from the key
--   • the other tables carry workspace_code                → compared directly
--   • fab_admin_<uid> is the user's own profile row        → matched on the uid
--
-- ⚠ BEFORE YOU RUN THIS
--   1. Apply 0004_project_tenancy.sql first (fabflow_projects needs its column).
--   2. Deploy the current `set-worker-pin` — older versions created workers
--      WITHOUT an org_members row, and those workers would be locked out.
--   3. Run the backfill in section 6 so existing workers get memberships.
--   4. Test with a real worker login before letting customers in.
--
-- The edge functions use the service role, which bypasses RLS, so provisioning
-- and the Stripe webhook keep working untouched.
--
-- Apply: Supabase → SQL Editor → paste all → Run. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) Which workspaces does the caller belong to? ──────────────────────────
-- SECURITY DEFINER so the policies can read org_members/fab_orgs without the
-- caller needing rights on them. STABLE so Postgres caches it per statement.
create or replace function public.fab_my_workspaces()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select workspace_code from public.org_members where user_id = auth.uid()
  union
  select workspace_code from public.fab_orgs   where owner_user_id = auth.uid()
$$;
revoke all on function public.fab_my_workspaces() from public;
grant execute on function public.fab_my_workspaces() to authenticated;

create or replace function public.fab_is_member(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_code is not null
     and upper(p_code) in (select upper(code) from public.fab_my_workspaces() as t(code))
$$;
revoke all on function public.fab_is_member(text) from public;
grant execute on function public.fab_is_member(text) to authenticated;

-- ── 2) The workspace code carried by a `fabflow` key ────────────────────────
-- Keys look like  fab_<CODE>_projects  where CODE is [A-Z0-9]{4,12}.
-- Anything else (fab_admin_<uuid>, stray keys) yields NULL and is handled by
-- the dedicated policies below rather than falling through to "allow".
create or replace function public.fab_key_workspace(p_key text)
returns text
language sql
immutable
as $$
  select (regexp_match(p_key, '^fab_([A-Z0-9]{4,12})_'))[1]
$$;

-- ── 3) `fabflow` — the key-value store every app writes ─────────────────────
alter table public.fabflow enable row level security;

-- The browser must never reach these with the bare publishable key.
revoke all on public.fabflow from anon;
grant select, insert, update, delete on public.fabflow to authenticated;

drop policy if exists fabflow_member_rw on public.fabflow;
create policy fabflow_member_rw on public.fabflow
  for all
  to authenticated
  using      (public.fab_is_member(public.fab_key_workspace(key)))
  with check (public.fab_is_member(public.fab_key_workspace(key)));

-- A manager's own profile row: fab_admin_<their uid>.
drop policy if exists fabflow_own_profile on public.fabflow;
create policy fabflow_own_profile on public.fabflow
  for all
  to authenticated
  using      (key = 'fab_admin_' || auth.uid()::text)
  with check (key = 'fab_admin_' || auth.uid()::text);

-- ── 4) The tables that carry workspace_code outright ────────────────────────
do $$
declare tbl text;
begin
  foreach tbl in array array['fabflow_stock','fabflow_offcuts','fabflow_cut_jobs','fabflow_projects']
  loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('revoke all on public.%I from anon', tbl);
    execute format('grant select, insert, update, delete on public.%I to authenticated', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_member_rw', tbl);
    execute format($f$
      create policy %I on public.%I
        for all to authenticated
        using      (public.fab_is_member(workspace_code))
        with check (public.fab_is_member(workspace_code))
    $f$, tbl || '_member_rw', tbl);
  end loop;
end $$;

-- ── 5) The entitlement check stays reachable before sign-in ─────────────────
-- The paywall runs on the login screen, so it has to answer for anon too. It
-- is SECURITY DEFINER and returns only status — never billing identifiers.
grant execute on function public.org_entitlement(text) to anon, authenticated;

-- ── 6) Backfill: workers created before memberships were written ────────────
-- Their synthetic email is  <name>.<workspace>@<domain>, so the workspace code
-- is recoverable from the address. Only fills gaps; never overwrites.
insert into public.org_members (user_id, workspace_code, role)
select u.id,
       upper(split_part(split_part(u.email, '@', 1), '.', 2)) as code,
       'worker'
  from auth.users u
 where u.email is not null
   and split_part(split_part(u.email, '@', 1), '.', 2) <> ''
   and upper(split_part(split_part(u.email, '@', 1), '.', 2))
       in (select workspace_code from public.fab_orgs)
   and not exists (
         select 1 from public.org_members m where m.user_id = u.id
       )
on conflict (user_id, workspace_code) do nothing;

-- ── 7) What the caller can see, for debugging a lockout ─────────────────────
create or replace function public.fab_whoami()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'uid', auth.uid(),
    'role', auth.role(),
    -- alias the function's OUTPUT COLUMN, not just the table: a setof-text
    -- function names its column after the function, so `... f(x)` is required
    -- before json_agg can refer to it.
    'workspaces', coalesce(
      (select json_agg(code) from public.fab_my_workspaces() as t(code)), '[]'::json)
  )
$$;
revoke all on function public.fab_whoami() from public;
grant execute on function public.fab_whoami() to anon, authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- CraftOS — 5-app catalog (nesting · db · crm · offer · invoices)
-- ────────────────────────────────────────────────────────────────────────────
-- Adds Invoices to the sellable app catalog. Like 0003, this only replaces the
-- two functions that carry a hard-coded app list; there are no table changes.
--
-- The Invoices app keeps its whole state in ONE `fabflow` row per workspace
-- (key `fab_<CODE>_invoices`), so 0005's RLS already covers it — a customer can
-- only read and write their own workspace's row, with no new policy.
--
-- Apply: Supabase → SQL Editor → paste all → Run. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Entitlement check the browser apps call ─────────────────────────────────
-- Adds has_invoices next to the other has_* booleans. The generic `apps` array
-- is what the shared license client actually reads; the booleans are kept for
-- convenience and backwards compatibility.
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
        'has_nesting',        public.fab_is_active(o) and ('nesting'  = any(o.apps)),
        'has_db',             public.fab_is_active(o) and ('db'       = any(o.apps)),
        'has_crm',            public.fab_is_active(o) and ('crm'      = any(o.apps)),
        'has_offer',          public.fab_is_active(o) and ('offer'    = any(o.apps)),
        'has_invoices',       public.fab_is_active(o) and ('invoices' = any(o.apps)),
        'trial_end',          o.trial_end,
        'current_period_end', o.current_period_end,
        'found',              true
      )
      from public.fab_orgs o
      where o.workspace_code = upper(p_code)),
    json_build_object('workspace_code', upper(p_code), 'status','none',
                      'apps', '[]'::json, 'active', false,
                      'has_nesting', false, 'has_db', false,
                      'has_crm', false, 'has_offer', false,
                      'has_invoices', false, 'found', false)
  );
$$;

revoke all on function public.org_entitlement(text) from public;
grant execute on function public.org_entitlement(text) to anon, authenticated;

-- ── Comp helper: a comped workspace gets every app, Invoices included ───────
create or replace function public.fabsuite_grant_comp(p_code text, p_name text default null)
returns public.fab_orgs
language plpgsql
security definer
set search_path = public
as $$
declare row public.fab_orgs;
begin
  insert into public.fab_orgs (workspace_code, name, plan, apps, status, comp)
  values (upper(p_code), p_name, 'suite',
          array['nesting','db','crm','offer','invoices'], 'active', true)
  on conflict (workspace_code) do update
    set comp = true,
        apps = array['nesting','db','crm','offer','invoices'],
        status = 'active',
        plan = coalesce(public.fab_orgs.plan, 'suite'),
        name = coalesce(p_name, public.fab_orgs.name)
  returning * into row;
  return row;
end $$;
revoke all on function public.fabsuite_grant_comp(text,text) from public;

-- ── Back-fill: every suite / comped workspace unlocks Invoices too ──────────
-- Single-app subscribers are untouched: they bought one app and still have it.
update public.fab_orgs
   set apps = array['nesting','db','crm','offer','invoices']
 where (comp = true or plan = 'suite')
   and not (apps @> array['invoices']);

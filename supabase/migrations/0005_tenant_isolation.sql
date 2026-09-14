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

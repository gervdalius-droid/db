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

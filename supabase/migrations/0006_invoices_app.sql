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

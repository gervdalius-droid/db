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

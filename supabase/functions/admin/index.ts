// Supabase Edge Function: admin
// ──────────────────────────────────────────────────────────────────────────
// The secure backend for the operator console (admin/index.html). Every
// privileged action runs here with the service role and is allowed ONLY for
// emails listed in the FABSUITE_ADMINS secret. The browser never holds admin
// keys.
//
// Body: { action: "...", ...params }
// Auth: Authorization: Bearer <your Supabase access token> (you sign in to the
//       console first). The function then checks your email is a super-admin.
//
// Secrets required: STRIPE_SECRET_KEY, FABSUITE_ADMINS (comma-separated emails)
// Deploy: supabase functions deploy admin
// ──────────────────────────────────────────────────────────────────────────
import { admin, stripe, json, cors, callerUser, ALL_APPS } from "../_shared/fabsuite.ts";

// Monthly-equivalent EUR per plan (keep in sync with scripts/stripe-seed.mjs).
const PRICE: Record<string, { month: number; year: number }> = {
  nesting: { month: 39, year: 390 },
  db: { month: 49, year: 490 },
  suite: { month: 69, year: 690 },
};
const monthlyEur = (plan?: string, interval?: string) => {
  const p = plan ? PRICE[plan] : undefined;
  if (!p) return 0;
  return interval === "year" ? Math.round(p.year / 12) : p.month;
};

function adminList(): string[] {
  return (Deno.env.get("FABSUITE_ADMINS") || "")
    .toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
}

const ORG_COLS =
  "workspace_code,name,owner_email,owner_user_id,stripe_customer_id,stripe_subscription_id,plan,billing_interval,apps,status,comp,trial_end,current_period_end,created_at,updated_at";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const sb = admin();
  const user = await callerUser(req, sb);
  if (!user) return json({ error: "Reikia prisijungti" }, 401);
  const email = (user.email || "").toLowerCase();
  const allow = adminList();
  if (allow.length === 0) return json({ error: "Administratorių sąrašas nenustatytas (FABSUITE_ADMINS)" }, 500);
  if (!allow.includes(email)) return json({ error: "Neturite administratoriaus teisių" }, 403);

  let body: Record<string, any>;
  try { body = await req.json(); } catch { return json({ error: "Blogi duomenys" }, 400); }
  const action = String(body.action || "");

  const audit = async (act: string, code: string | null, detail: unknown) => {
    try { await sb.from("fab_audit_log").insert({ admin_email: email, action: act, workspace_code: code, detail }); }
    catch (e) { console.warn("audit failed:", (e as Error).message); }
  };
  const code = body.workspace_code ? String(body.workspace_code).toUpperCase() : null;
  const getOrg = async () => {
    const { data } = await sb.from("fab_orgs").select(ORG_COLS).eq("workspace_code", code).maybeSingle();
    return data;
  };

  try {
    switch (action) {
      // ── Dashboard numbers ────────────────────────────────────────────────
      case "stats": {
        const { data: orgs } = await sb.from("fab_orgs")
          .select("status,comp,plan,billing_interval,created_at,name,workspace_code,owner_email");
        const rows = orgs || [];
        const count = (pred: (o: any) => boolean) => rows.filter(pred).length;
        const totals = {
          customers: rows.length,
          active: count((o) => o.status === "active"),
          trialing: count((o) => o.status === "trialing"),
          past_due: count((o) => o.status === "past_due"),
          canceled: count((o) => o.status === "canceled" || o.status === "unpaid"),
          comp: count((o) => o.comp),
        };
        const mrr = rows
          .filter((o) => !o.comp && (o.status === "active" || o.status === "past_due"))
          .reduce((s, o) => s + monthlyEur(o.plan, o.billing_interval), 0);
        const recent = [...rows]
          .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
          .slice(0, 6)
          .map((o) => ({ workspace_code: o.workspace_code, name: o.name, owner_email: o.owner_email, status: o.status, created_at: o.created_at }));
        const { data: log } = await sb.from("fab_audit_log").select("*").order("at", { ascending: false }).limit(15);
        return json({ totals, mrr_eur: mrr, recent, activity: log || [] });
      }

      // ── Customers list (search + filter + paging) ─────────────────────────
      case "list_orgs": {
        const search = String(body.search || "").trim();
        const status = String(body.status || "").trim();
        const limit = Math.min(Number(body.limit) || 50, 200);
        const offset = Number(body.offset) || 0;
        let q = sb.from("fab_orgs").select(ORG_COLS, { count: "exact" });
        if (status === "comp") q = q.eq("comp", true);
        else if (status) q = q.eq("status", status);
        if (search) q = q.or(`name.ilike.%${search}%,workspace_code.ilike.%${search}%,owner_email.ilike.%${search}%`);
        q = q.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
        const { data, count } = await q;
        return json({ orgs: data || [], total: count || 0 });
      }

      // ── One customer (with members + recent activity) ─────────────────────
      case "get_org": {
        if (!code) return json({ error: "Trūksta darbo vietos kodo" }, 400);
        const org = await getOrg();
        if (!org) return json({ error: "Darbo vieta nerasta" }, 404);
        const { data: members } = await sb.from("org_members").select("user_id,role,created_at").eq("workspace_code", code);
        const withEmails = await Promise.all((members || []).map(async (m) => {
          let mEmail = "";
          try { const { data } = await sb.auth.admin.getUserById(m.user_id); mEmail = data?.user?.email || ""; } catch { /* ignore */ }
          return { ...m, email: mEmail };
        }));
        const { data: log } = await sb.from("fab_audit_log").select("*").eq("workspace_code", code).order("at", { ascending: false }).limit(10);
        return json({ org, members: withEmails, activity: log || [] });
      }

      // ── Grant / revoke free (complimentary) access ────────────────────────
      case "set_comp": {
        if (!code) return json({ error: "Trūksta kodo" }, 400);
        const comp = !!body.comp;
        const patch: Record<string, unknown> = { comp };
        if (comp) {
          const cur = await getOrg();
          patch.apps = ALL_APPS; // free access = the whole suite
          if (!cur?.status || cur.status === "none" || cur.status === "canceled") patch.status = "active";
        }
        const { data, error } = await sb.from("fab_orgs").update(patch).eq("workspace_code", code).select(ORG_COLS).maybeSingle();
        if (error) return json({ error: error.message }, 500);
        await audit(comp ? "grant_free_access" : "revoke_free_access", code, {});
        return json({ ok: true, org: data });
      }

      // ── Manual override (status / apps / plan) — escape hatch ─────────────
      case "set_override": {
        if (!code) return json({ error: "Trūksta kodo" }, 400);
        const patch: Record<string, unknown> = {};
        if (typeof body.status === "string") patch.status = body.status;
        if (Array.isArray(body.apps)) patch.apps = body.apps;
        if (typeof body.plan === "string") patch.plan = body.plan;
        if (Object.keys(patch).length === 0) return json({ error: "Nieko nepakeista" }, 400);
        const { data, error } = await sb.from("fab_orgs").update(patch).eq("workspace_code", code).select(ORG_COLS).maybeSingle();
        if (error) return json({ error: error.message }, 500);
        await audit("manual_override", code, patch);
        return json({ ok: true, org: data });
      }

      // ── Extend access by N days (manual grant; independent of Stripe) ─────
      case "extend_trial": {
        if (!code) return json({ error: "Trūksta kodo" }, 400);
        const days = Math.max(1, Math.min(Number(body.days) || 14, 365));
        const org = await getOrg();
        if (!org) return json({ error: "Nerasta" }, 404);
        const base = [org.current_period_end, org.trial_end]
          .map((d) => (d ? new Date(d).getTime() : 0))
          .reduce((a, b) => Math.max(a, b), Date.now());
        const until = new Date(base + days * 86400000).toISOString();
        const newStatus = org.status === "active" || org.status === "past_due" ? org.status : "trialing";
        const { data, error } = await sb.from("fab_orgs")
          .update({ trial_end: until, current_period_end: until, status: newStatus })
          .eq("workspace_code", code).select(ORG_COLS).maybeSingle();
        if (error) return json({ error: error.message }, 500);
        await audit("extend_access", code, { days, until });
        return json({ ok: true, org: data });
      }

      // ── Cancel the Stripe subscription ────────────────────────────────────
      case "cancel_subscription": {
        if (!code) return json({ error: "Trūksta kodo" }, 400);
        const org = await getOrg();
        if (!org?.stripe_subscription_id) return json({ error: "Ši darbo vieta neturi Stripe prenumeratos. Jei prieiga nemokama — išjunkite ją." }, 400);
        const immediately = !!body.immediately;
        const sk = stripe();
        if (immediately) await sk.subscriptions.cancel(org.stripe_subscription_id);
        else await sk.subscriptions.update(org.stripe_subscription_id, { cancel_at_period_end: true });
        await audit("cancel_subscription", code, { immediately });
        return json({ ok: true, immediately });
      }

      // ── Set the customer's manager (owner) password ───────────────────────
      case "set_owner_password": {
        if (!code) return json({ error: "Trūksta kodo" }, 400);
        const pw = String(body.password || "");
        if (pw.length < 6) return json({ error: "Slaptažodis turi būti bent 6 simbolių" }, 400);
        const org = await getOrg();
        if (!org?.owner_user_id) return json({ error: "Šiai darbo vietai nepriskirtas savininkas" }, 400);
        const { error } = await sb.auth.admin.updateUserById(org.owner_user_id, { password: pw });
        if (error) return json({ error: error.message }, 500);
        await audit("set_owner_password", code, {}); // never log the password
        return json({ ok: true });
      }

      // ── Deep links into Stripe for money matters (refunds, cards) ─────────
      case "stripe_link": {
        if (!code) return json({ error: "Trūksta kodo" }, 400);
        const org = await getOrg();
        if (!org?.stripe_customer_id) return json({ error: "Nėra Stripe kliento" }, 404);
        return json({
          live: `https://dashboard.stripe.com/customers/${org.stripe_customer_id}`,
          test: `https://dashboard.stripe.com/test/customers/${org.stripe_customer_id}`,
        });
      }

      // ── Remove a customer from the registry (DANGER) ──────────────────────
      case "delete_org": {
        if (!code) return json({ error: "Trūksta kodo" }, 400);
        if (String(body.confirm || "").toUpperCase() !== code) return json({ error: "Patvirtinimas neteisingas" }, 400);
        await sb.from("org_members").delete().eq("workspace_code", code);
        const { error } = await sb.from("fab_orgs").delete().eq("workspace_code", code);
        if (error) return json({ error: error.message }, 500);
        await audit("delete_org", code, {});
        return json({ ok: true });
      }

      default:
        return json({ error: "Nežinomas veiksmas: " + action }, 400);
    }
  } catch (e) {
    console.error("admin error:", (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});

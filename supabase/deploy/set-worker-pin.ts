// Supabase Edge Function: set-worker-pin
// ──────────────────────────────────────────────────────────────────────────
// Lets a logged-in ADMIN (manager) create or reset a worker's login PIN.
//
// Why this exists: changing another user's password needs the service-role key,
// which must NEVER live in the browser app. This function holds that key safely
// on Supabase's servers and only acts when the caller proves they are an admin.
//
// It maps name + PIN to the same account scheme both apps use:
//   email    = slug(name).<namespace>@<domain>
//              namespace = WORKSHOP_CODE (legacy) or the WORKSPACE CODE (product)
//   password = PIN + "_dedes"
//
// Deploy steps: see SET_PIN_FUNCTION_SETUP.md
// ──────────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Per-deployment via env: set FABSUITE_AUTH_DOMAIN (and optionally
// FABSUITE_WORKSHOP_CODE) on the commercial project so it matches its config.js.
// Fallbacks preserve the original single-tenant behaviour for your own company.
const AUTH_DOMAIN = Deno.env.get("FABSUITE_AUTH_DOMAIN") || "dedesbaldai.lt";
const WORKSHOP_CODE = Deno.env.get("FABSUITE_WORKSHOP_CODE") || "gvs";
const PIN_SALT = "_dedes";            // keep in sync with both apps

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Same slug as the apps: lowercase, Lithuanian letters → ASCII, spaces → "-".
function slug(s: string): string {
  const m: Record<string, string> = {
    "ą": "a", "č": "c", "ę": "e", "ė": "e", "į": "i",
    "š": "s", "ų": "u", "ū": "u", "ž": "z",
  };
  return (s || "").trim().toLowerCase()
    .replace(/[ąčęėįšųūž]/g, (c) => m[c] || c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically to
  // Edge Functions — you do NOT set them manually.
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) return json({ error: "Function not configured" }, 500);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  // 1) Validate the caller's token.
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Reikia prisijungti" }, 401);
  const { data: caller, error: cErr } = await admin.auth.getUser(token);
  if (cErr || !caller?.user) return json({ error: "Sesija negalioja" }, 401);

  // 2) Confirm the caller is an admin/manager (their admin-profile key must exist).
  const { data: prof } = await admin
    .from("fabflow").select("key,value").eq("key", "fab_admin_" + caller.user.id).limit(1);
  if (!prof || !prof.length) return json({ error: "Tik vadovas gali nustatyti PIN" }, 403);
  let callerWorkspace = "";
  try { callerWorkspace = String(JSON.parse(prof[0].value || "{}").workspaceCode || "").toUpperCase(); } catch { /* ignore */ }

  // 3) Validate input.
  let body: { name?: string; pin?: string; action?: string; workspace_code?: string; email_scope?: string };
  try { body = await req.json(); } catch { return json({ error: "Blogi duomenys" }, 400); }
  const action = (body.action || "set").toLowerCase();
  const name = (body.name || "").trim();
  if (!name) return json({ error: "Reikia vardo" }, 400);

  // Worker-email namespace. 'workshop' = legacy single-tenant (name.<gvs>@domain);
  // 'workspace' = multi-tenant product (name.<WORKSPACE_CODE>@domain), so the same
  // worker name in two different companies never maps to one shared account.
  const scope = (body.email_scope || "workshop").toLowerCase();
  const ws = String(body.workspace_code || "").toUpperCase();
  if (scope === "workspace") {
    if (!ws) return json({ error: "Reikia darbo vietos kodo" }, 400);
    // An admin may only manage workers in their OWN workspace.
    if (callerWorkspace && callerWorkspace !== ws) {
      return json({ error: "Negalite valdyti kitos darbo vietos darbuotojų" }, 403);
    }
  }
  const ns = scope === "workspace" ? ws : WORKSHOP_CODE;
  const email = slug(name) + "." + slug(ns) + "@" + AUTH_DOMAIN;

  // DELETE: remove the worker's login entirely (revokes both apps).
  if (action === "delete") {
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list?.users?.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
    if (!existing) return json({ ok: true, action: "none", email }); // already gone — idempotent
    const { error: delErr } = await admin.auth.admin.deleteUser(existing.id);
    if (delErr) return json({ error: "Nepavyko ištrinti: " + delErr.message }, 400);
    return json({ ok: true, action: "deleted", email });
  }

  // SET (default): create or reset the worker's PIN.
  const pin = (body.pin || "").trim();
  if (!/^\d{4,6}$/.test(pin)) return json({ error: "PIN turi būti 4–6 skaitmenys" }, 400);
  const password = pin + PIN_SALT;

  const { error: createErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { name },
  });
  if (!createErr) return json({ ok: true, action: "created", email });

  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list?.users?.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
  if (!existing) return json({ error: "Nepavyko sukurti: " + createErr.message }, 400);
  const { error: updErr } = await admin.auth.admin.updateUserById(existing.id, { password });
  if (updErr) return json({ error: "Nepavyko atnaujinti: " + updErr.message }, 400);
  return json({ ok: true, action: "updated", email });
});

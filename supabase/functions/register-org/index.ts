// Supabase Edge Function: register-org
// ──────────────────────────────────────────────────────────────────────────
// Provisions a new customer workspace right after sign-up on the storefront.
// Creates the billing registry row (owned by the caller) AND seeds the data
// the DB app expects so the new manager can log in immediately:
//   • fab_admin_<uid>      → the manager's admin profile (workspaceCode, role)
//   • fab_<CODE>_users     → initial team list containing just the manager
//   • org_members          → owner membership row
//
// Body: { workspace_code, name, email? }
// Auth: Authorization: Bearer <token> required (the just-signed-up user).
//
// Secrets required: (none beyond the auto-provided SUPABASE_URL / SERVICE_ROLE)
// ──────────────────────────────────────────────────────────────────────────
import { admin, json, cors, callerUser, normCode } from "../_shared/fabsuite.ts";

function initials(name: string): string {
  return (name || "?").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: { workspace_code?: string; name?: string; email?: string };
  try { body = await req.json(); } catch { return json({ error: "Bad JSON" }, 400); }

  const code = normCode(body.workspace_code || "");
  const name = (body.name || "").trim() || "Mano įmonė";
  if (!/^[A-Z0-9]{4,12}$/.test(code)) return json({ error: "Invalid workspace_code" }, 400);

  const sb = admin();
  const user = await callerUser(req, sb);
  if (!user) return json({ error: "Sign in required" }, 401);
  const email = body.email || user.email || "";

  // Don't let someone claim a workspace another account already owns.
  const { data: existing } = await sb.from("fab_orgs")
    .select("workspace_code, owner_user_id").eq("workspace_code", code).maybeSingle();
  if (existing && existing.owner_user_id && existing.owner_user_id !== user.id) {
    return json({ error: "Workspace code already taken", code: "taken" }, 409);
  }

  // 1) Billing registry row — owned by this user, no plan yet (status 'none').
  const { error: orgErr } = await sb.from("fab_orgs").upsert({
    workspace_code: code,
    name,
    owner_user_id: user.id,
    owner_email: email,
  }, { onConflict: "workspace_code" });
  if (orgErr) return json({ error: "Could not create workspace: " + orgErr.message }, 500);

  // 2) Owner membership.
  await sb.from("org_members").upsert({
    user_id: user.id, workspace_code: code, role: "owner",
  }, { onConflict: "user_id,workspace_code" });

  // 3) Seed the DB app's keys so manager login works out of the box.
  const adminProfile = JSON.stringify({
    name, email, workspaceCode: code, role: "manager", created: Date.now(),
  });
  const usersSeed = JSON.stringify([{
    id: "admin_" + user.id, name, email, role: "manager",
    color: "#6366f1", bg: "#eef2ff", initials: initials(name),
  }]);
  const now = new Date().toISOString();
  const { error: seedErr } = await sb.from("fabflow").upsert([
    { key: "fab_admin_" + user.id, value: adminProfile, updated_at: now },
    { key: "fab_" + code + "_users", value: usersSeed, updated_at: now },
  ], { onConflict: "key" });
  if (seedErr) console.warn("register-org seed warning:", seedErr.message);

  return json({ ok: true, workspace_code: code, user_id: user.id });
});

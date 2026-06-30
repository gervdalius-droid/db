// Supabase Edge Function: create-portal-session
// ──────────────────────────────────────────────────────────────────────────
// Returns a Stripe Billing Portal URL so a customer can update their card,
// switch plan, download invoices, or cancel. Used by fabsuite/account.html and
// the "Manage subscription" button inside the apps.
//
// Body: { workspace_code, return_url? }
// Auth: Authorization: Bearer <token> required — caller must own / belong to
//       the workspace.
//
// Secrets required: STRIPE_SECRET_KEY, FABSUITE_URL
// ──────────────────────────────────────────────────────────────────────────
import { admin, stripe, json, cors, callerUser, normCode, siteUrl } from "../_shared/fabsuite.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: { workspace_code?: string; return_url?: string };
  try { body = await req.json(); } catch { return json({ error: "Bad JSON" }, 400); }
  const code = normCode(body.workspace_code || "");
  if (!code) return json({ error: "Missing workspace_code" }, 400);

  const sb = admin();
  const user = await callerUser(req, sb);
  if (!user) return json({ error: "Sign in required" }, 401);

  const { data: org } = await sb.from("fab_orgs")
    .select("stripe_customer_id, owner_user_id").eq("workspace_code", code).maybeSingle();
  if (!org?.stripe_customer_id) return json({ error: "No subscription for this workspace yet" }, 404);

  // Authorize: owner, or a recorded member of the workspace.
  let allowed = org.owner_user_id === user.id;
  if (!allowed) {
    const { data: m } = await sb.from("org_members")
      .select("role").eq("user_id", user.id).eq("workspace_code", code).maybeSingle();
    allowed = !!m;
  }
  if (!allowed) return json({ error: "Not authorized for this workspace" }, 403);

  const portal = await stripe().billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: body.return_url || `${siteUrl()}/account.html?ws=${code}`,
  });

  return json({ url: portal.url });
});

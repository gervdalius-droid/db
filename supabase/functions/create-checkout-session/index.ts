// Supabase Edge Function: create-checkout-session
// ──────────────────────────────────────────────────────────────────────────
// Starts a Stripe Checkout for a Fabsuite plan and returns the redirect URL.
//
// Called by the storefront (fabsuite/signup.html) and from inside the apps'
// paywall. Ties the resulting subscription to a WORKSPACE CODE via
// client_reference_id + subscription metadata, so the webhook can grant access
// to the right tenant.
//
// Body: { plan: 'nesting'|'db'|'suite', interval: 'month'|'year',
//         workspace_code, email?, success_url?, cancel_url? }
// Auth: Authorization: Bearer <token> is OPTIONAL but recommended (links the
//       Stripe customer to the signed-in owner).
//
// Secrets required (Supabase → Edge Functions → Manage secrets):
//   STRIPE_SECRET_KEY, FABSUITE_URL,
//   PRICE_NESTING_MONTH, PRICE_NESTING_YEAR,
//   PRICE_DB_MONTH,      PRICE_DB_YEAR,
//   PRICE_SUITE_MONTH,   PRICE_SUITE_YEAR
// ──────────────────────────────────────────────────────────────────────────
import {
  admin, stripe, json, cors, callerUser, normCode, siteUrl,
  PLANS, INTERVALS, priceIdFor, type Plan,
} from "../_shared/fabsuite.ts";

const TRIAL_DAYS = Number(Deno.env.get("FABSUITE_TRIAL_DAYS") || "14");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: {
    plan?: string; interval?: string; workspace_code?: string;
    email?: string; success_url?: string; cancel_url?: string;
  };
  try { body = await req.json(); } catch { return json({ error: "Bad JSON" }, 400); }

  const plan = (body.plan || "").toLowerCase() as Plan;
  const interval = (body.interval || "month").toLowerCase();
  const code = normCode(body.workspace_code || "");
  if (!PLANS.includes(plan)) return json({ error: "Unknown plan" }, 400);
  if (!INTERVALS.includes(interval as any)) return json({ error: "Unknown interval" }, 400);
  if (!/^[A-Z0-9]{4,12}$/.test(code)) return json({ error: "Missing/invalid workspace_code" }, 400);

  const price = priceIdFor(plan, interval);
  if (!price) return json({ error: `Price not configured for ${plan}/${interval}` }, 500);

  const sb = admin();
  const sk = stripe();

  // Who's buying? (optional, but lets us attach the customer to the owner)
  const user = await callerUser(req, sb).catch(() => null);
  const email = body.email || user?.email || undefined;

  // Find or create the org row + its Stripe customer.
  const { data: org } = await sb.from("fab_orgs")
    .select("workspace_code, stripe_customer_id, name").eq("workspace_code", code).maybeSingle();

  let customerId = org?.stripe_customer_id || null;
  if (!customerId) {
    const customer = await sk.customers.create({
      email,
      name: org?.name || undefined,
      metadata: { workspace_code: code },
    });
    customerId = customer.id;
    // Don't clobber owner fields set by register-org when no token was passed.
    const patch: Record<string, unknown> = { workspace_code: code, stripe_customer_id: customerId };
    if (user?.id) patch.owner_user_id = user.id;
    if (email) patch.owner_email = email;
    await sb.from("fab_orgs").upsert(patch, { onConflict: "workspace_code" });
  }

  const base = siteUrl();
  const session = await sk.checkout.sessions.create({
    mode: "subscription",
    customer: customerId!,
    line_items: [{ price, quantity: 1 }],
    client_reference_id: code,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    subscription_data: {
      trial_period_days: TRIAL_DAYS > 0 ? TRIAL_DAYS : undefined,
      metadata: { workspace_code: code, plan },
    },
    metadata: { workspace_code: code, plan },
    success_url: body.success_url || `${base}/success.html?session_id={CHECKOUT_SESSION_ID}&ws=${code}`,
    cancel_url: body.cancel_url || `${base}/canceled.html?ws=${code}`,
  });

  return json({ url: session.url, id: session.id });
});

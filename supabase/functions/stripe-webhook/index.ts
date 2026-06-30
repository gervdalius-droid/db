// Supabase Edge Function: stripe-webhook
// ──────────────────────────────────────────────────────────────────────────
// The source of truth that keeps `fab_orgs` in sync with Stripe. Every
// subscription change flows through here and updates the workspace's status +
// unlocked apps, which is what the apps read via org_entitlement().
//
// Configure in Stripe → Developers → Webhooks → Add endpoint:
//   URL:  https://<project>.supabase.co/functions/v1/stripe-webhook
//   Events: checkout.session.completed, customer.subscription.created,
//           customer.subscription.updated, customer.subscription.deleted,
//           invoice.payment_failed
//
// IMPORTANT: deploy this function with JWT verification OFF (Stripe can't send
// a Supabase JWT). The Stripe signature check below is the real auth.
//   supabase functions deploy stripe-webhook --no-verify-jwt
//
// Secrets required: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
// ──────────────────────────────────────────────────────────────────────────
import { admin, stripe, Stripe, json, cors, PLAN_APPS } from "../_shared/fabsuite.ts";

const cryptoProvider = Stripe.createSubtleCryptoProvider();

// Map a Stripe subscription → the apps it unlocks + a plan label.
// Prefers product metadata (fabsuite_apps / fabsuite_plan), falls back to our
// static PLAN_APPS map keyed by the plan metadata on the subscription.
async function resolveApps(sk: Stripe, sub: Stripe.Subscription): Promise<{ apps: string[]; plan: string | null; interval: string | null }> {
  const apps = new Set<string>();
  let plan: string | null = (sub.metadata?.plan as string) || null;
  let interval: string | null = null;

  for (const item of sub.items.data) {
    interval = interval || item.price.recurring?.interval || null;
    let productMeta: Record<string, string> | undefined;
    const prod = item.price.product;
    if (typeof prod === "string") {
      try { const p = await sk.products.retrieve(prod); productMeta = p.metadata as any; } catch { /* ignore */ }
    } else if (prod && !("deleted" in prod)) {
      productMeta = (prod as Stripe.Product).metadata as any;
    }
    const metaApps = productMeta?.fabsuite_apps;
    if (metaApps) metaApps.split(",").forEach((a) => apps.add(a.trim()));
    if (!plan && productMeta?.fabsuite_plan) plan = productMeta.fabsuite_plan;
  }

  // Fallback: derive apps from the plan label if metadata was missing.
  if (apps.size === 0 && plan && PLAN_APPS[plan as keyof typeof PLAN_APPS]) {
    PLAN_APPS[plan as keyof typeof PLAN_APPS].forEach((a) => apps.add(a));
  }
  // Last-resort plan label from the resolved apps.
  if (!plan) {
    if (apps.has("nesting") && apps.has("db")) plan = "suite";
    else if (apps.has("nesting")) plan = "nesting";
    else if (apps.has("db")) plan = "db";
  }
  return { apps: [...apps], plan, interval };
}

async function syncSubscription(sk: Stripe, sub: Stripe.Subscription, codeHint?: string) {
  const sb = admin();

  // Resolve the workspace: subscription metadata → customer metadata → hint →
  // existing row matched by customer id.
  let code = (sub.metadata?.workspace_code as string) || codeHint || "";
  let customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

  if (!code && customerId) {
    try {
      const c = await sk.customers.retrieve(customerId);
      if (c && !("deleted" in c)) code = (c.metadata?.workspace_code as string) || "";
    } catch { /* ignore */ }
  }
  if (!code && customerId) {
    const { data } = await sb.from("fab_orgs").select("workspace_code").eq("stripe_customer_id", customerId).maybeSingle();
    code = data?.workspace_code || "";
  }
  if (!code) { console.warn("webhook: could not resolve workspace_code for sub", sub.id); return; }
  code = code.toUpperCase();

  const { apps, plan, interval } = await resolveApps(sk, sub);
  const canceled = sub.status === "canceled" || sub.status === "incomplete_expired";

  const row: Record<string, unknown> = {
    workspace_code: code,
    stripe_customer_id: customerId || null,
    stripe_subscription_id: sub.id,
    status: sub.status,                       // trialing|active|past_due|canceled|unpaid|incomplete…
    plan,
    billing_interval: interval,
    apps: canceled ? [] : apps,               // clear unlocked apps once fully canceled
    trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
  };

  const { error } = await sb.from("fab_orgs").upsert(row, { onConflict: "workspace_code" });
  if (error) console.error("webhook upsert failed:", error.message);
  else console.log(`webhook: ${code} → ${sub.status} [${apps.join(",")}]`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const sig = req.headers.get("stripe-signature");
  const whSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!sig || !whSecret) return json({ error: "Not configured" }, 400);

  const sk = stripe();
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await sk.webhooks.constructEventAsync(raw, sig, whSecret, undefined, cryptoProvider);
  } catch (e) {
    return json({ error: `Signature check failed: ${(e as Error).message}` }, 400);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const code = (s.client_reference_id as string) || (s.metadata?.workspace_code as string) || undefined;
        if (s.subscription) {
          const sub = await sk.subscriptions.retrieve(
            typeof s.subscription === "string" ? s.subscription : s.subscription.id,
            { expand: ["items.data.price.product"] },
          );
          await syncSubscription(sk, sub, code);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        // Re-retrieve expanded so product metadata is available.
        const full = await sk.subscriptions.retrieve(sub.id, { expand: ["items.data.price.product"] }).catch(() => sub);
        await syncSubscription(sk, full as Stripe.Subscription);
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        if (inv.subscription) {
          const sub = await sk.subscriptions.retrieve(
            typeof inv.subscription === "string" ? inv.subscription : inv.subscription.id,
            { expand: ["items.data.price.product"] },
          );
          await syncSubscription(sk, sub);
        }
        break;
      }
      default:
        // ignore other events
        break;
    }
  } catch (e) {
    console.error("webhook handler error:", (e as Error).message);
    return json({ error: "handler error" }, 500); // Stripe will retry
  }

  return json({ received: true });
});

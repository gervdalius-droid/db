// ════════════════════════════════════════════════════════════════════════════
// Shared helpers for the Fabsuite billing edge functions.
// Imported by create-checkout-session / create-portal-session / stripe-webhook /
// register-org. Deploy the whole `supabase/functions` folder so this file ships
// alongside them (the Supabase CLI bundles _shared automatically).
// ════════════════════════════════════════════════════════════════════════════
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno&deno-std=0.177.0";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// Valid product codes the storefront may ask to buy.
export const PLANS = ["nesting", "db", "suite"] as const;
export type Plan = (typeof PLANS)[number];
export const INTERVALS = ["month", "year"] as const;

// The full catalog of sellable apps (one source of truth). To add an app later,
// add its code here (or set FABSUITE_APPS="nesting,db,quote") — the suite then
// automatically includes it. Each app is also sold standalone.
export const ALL_APPS: string[] =
  (Deno.env.get("FABSUITE_APPS") || "nesting,db").split(",").map((s) => s.trim()).filter(Boolean);

// Which apps each plan unlocks. The webhook prefers product metadata, but falls
// back to this map. The "suite" always means every app in the catalog.
export const PLAN_APPS: Record<string, string[]> = {
  nesting: ["nesting"],
  db: ["db"],
  suite: ALL_APPS,
};

// price id is read from env: PRICE_<PLAN>_<INTERVAL>, e.g. PRICE_SUITE_MONTH.
export function priceIdFor(plan: string, interval: string): string | null {
  const key = `PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`;
  return Deno.env.get(key) || null;
}

export function admin(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function stripe(): Stripe {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key, {
    apiVersion: "2024-12-18.acacia",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export { Stripe };

// Verify a caller's access token → returns the auth user or null.
export async function callerUser(req: Request, sb: SupabaseClient) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export const normCode = (c: string) => (c || "").trim().toUpperCase();

// Public site base, used to build success/cancel/return URLs when the caller
// doesn't pass explicit ones. Override with FABSUITE_URL secret.
export function siteUrl(): string {
  return (Deno.env.get("FABSUITE_URL") || "https://fabsuite.app").replace(/\/+$/, "");
}

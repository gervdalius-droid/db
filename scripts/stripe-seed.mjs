#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
 * Fabsuite — create Stripe products & prices (idempotent).
 *
 * Creates 3 products (Nesting, DB, Fabsuite suite), each with a monthly and an
 * annual price, and tags each product with the metadata the webhook reads:
 *   fabsuite_plan = nesting | db | suite
 *   fabsuite_apps = comma list of unlocked apps
 *
 * The AMOUNTS below MUST match fabsuite/config.js (display) — keep them in sync.
 *
 * Run:
 *   npm i stripe
 *   STRIPE_SECRET_KEY=sk_test_xxx node scripts/stripe-seed.mjs
 *
 * Re-running is safe: existing products (matched by metadata) and prices
 * (matched by lookup_key) are reused, not duplicated. At the end it prints the
 * exact `supabase secrets set ...` block to paste.
 * ════════════════════════════════════════════════════════════════════════════ */
import Stripe from "stripe";

const KEY = process.env.STRIPE_SECRET_KEY;
if (!KEY) { console.error("✗ Set STRIPE_SECRET_KEY first."); process.exit(1); }
const stripe = new Stripe(KEY);

const CURRENCY = "eur";
// amount in MAJOR units (euros) → converted to cents below. Keep == config.js.
const PLANS = {
  nesting: { name: "Fabsuite Nesting", apps: "nesting",    month: 39, year: 390 },
  db:      { name: "Fabsuite DB",      apps: "db",         month: 49, year: 490 },
  // To add an app: add a standalone entry above. The suite auto-includes it.
  suite:   { name: "Fabsuite (whole suite)", apps: "",     month: 69, year: 690 },
};
// The suite always bundles every standalone app in the catalog.
PLANS.suite.apps = Object.keys(PLANS).filter((k) => k !== "suite").join(",");


async function findProduct(plan) {
  const res = await stripe.products.search({ query: `metadata['fabsuite_plan']:'${plan}'`, limit: 1 });
  return res.data[0] || null;
}

async function ensureProduct(plan, def) {
  let p = await findProduct(plan);
  if (p) {
    console.log(`  • product ${plan} exists (${p.id})`);
    // keep metadata fresh
    await stripe.products.update(p.id, { name: def.name, metadata: { fabsuite_plan: plan, fabsuite_apps: def.apps } });
    return p;
  }
  p = await stripe.products.create({
    name: def.name,
    metadata: { fabsuite_plan: plan, fabsuite_apps: def.apps },
  });
  console.log(`  ✓ created product ${plan} (${p.id})`);
  return p;
}

async function ensurePrice(product, plan, interval, euros) {
  const lookup = `fabsuite_${plan}_${interval}`;
  const existing = await stripe.prices.list({ lookup_keys: [lookup], limit: 1 });
  if (existing.data[0]) {
    console.log(`    • price ${lookup} exists (${existing.data[0].id})`);
    return existing.data[0];
  }
  const price = await stripe.prices.create({
    product: product.id,
    currency: CURRENCY,
    unit_amount: Math.round(euros * 100),
    recurring: { interval },
    lookup_key: lookup,
    metadata: { fabsuite_plan: plan },
  });
  console.log(`    ✓ created price ${lookup} (${price.id}) = ${euros} ${CURRENCY}/${interval}`);
  return price;
}

const ENV_NAME = { nesting: "NESTING", db: "DB", suite: "SUITE" };

async function main() {
  console.log("Seeding Stripe products & prices…\n");
  const secrets = {};
  for (const [plan, def] of Object.entries(PLANS)) {
    const product = await ensureProduct(plan, def);
    const m = await ensurePrice(product, plan, "month", def.month);
    const y = await ensurePrice(product, plan, "year", def.year);
    secrets[`PRICE_${ENV_NAME[plan]}_MONTH`] = m.id;
    secrets[`PRICE_${ENV_NAME[plan]}_YEAR`] = y.id;
  }

  console.log("\n──────────────────────────────────────────────────────────────");
  console.log("Done. Set these as Supabase Edge Function secrets:\n");
  const line = Object.entries(secrets).map(([k, v]) => `${k}=${v}`).join(" \\\n  ");
  console.log("supabase secrets set \\\n  " + line);
  console.log("\n(Or paste each in Supabase → Edge Functions → Manage secrets.)");
  console.log("Also set: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, FABSUITE_URL");
}

main().catch((e) => { console.error("✗", e.message); process.exit(1); });

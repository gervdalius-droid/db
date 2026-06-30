/* ════════════════════════════════════════════════════════════════════════════
 * COMMERCIAL config for the FabFlow product (the version you SELL).
 * ────────────────────────────────────────────────────────────────────────────
 * This becomes `config.js` in the `fabflow` repo (the build script does the
 * swap). It points at your NEW, customer-only Supabase project and turns the
 * paywall ON. Your private app keeps using the other config.js untouched.
 *
 * Fill in the two TODO values after creating the commercial Supabase project
 * (Settings → API).
 * ════════════════════════════════════════════════════════════════════════════ */
window.FAB_CONFIG = {
  // Backend — the NEW customer-only Supabase project (NOT your private one).
  SUPABASE_URL: "https://TODO-COMMERCIAL-REF.supabase.co",
  SUPABASE_ANON_KEY: "TODO_PASTE_COMMERCIAL_ANON_KEY",

  // Branding
  BRAND_NAME: "FabFlow",
  APP_TITLE: "FabFlow — Gamybos valdymas",

  // Selling / billing — ON for the product.
  PAYWALL_ENABLED: true,
  APP_CODE: "db",
  // Where the FabFlow storefront is hosted (update when it gets a custom domain).
  FABSUITE_URL: "https://gervdalius-droid.github.io/fabflow/fabsuite",

  // Worker name+PIN synthetic-email scheme. MUST match the set-worker-pin edge
  // function deployed in the commercial project (set FABSUITE_AUTH_DOMAIN there).
  AUTH_DOMAIN: "fabflow.app",
  WORKSHOP_CODE: "ff",
  // 'workspace' scopes worker logins per company so identical names never
  // collide across customers. REQUIRED for the multi-tenant product.
  WORKER_EMAIL_SCOPE: "workspace",
};

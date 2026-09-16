/* ════════════════════════════════════════════════════════════════════════════
 * CraftOS ShopFlow — COMMERCIAL config (becomes config.js in the fabflow-shop
 * repo). This is the app the `db` plan unlocks: customer-only Supabase project,
 * paywall ON, worker logins scoped per company. Read by craftos.js, which wraps
 * ShopFlow.
 * ════════════════════════════════════════════════════════════════════════════ */
window.FAB_CONFIG = {
  SUPABASE_URL: "https://yyamcwkbwptvrdbylqji.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_ODSJnx1sWO1KUjQEl0IRZQ_2_Iyz596",

  BRAND_NAME: "CraftOS",
  APP_CODE: "db",
  PAYWALL_ENABLED: true,
  FABSUITE_URL: "https://dbxfabflow.github.io/fabflow/fabsuite",
  SUPPORT_EMAIL: "gervdalius@gmail.com",

  // Must match FABSUITE_AUTH_DOMAIN on the commercial edge functions.
  AUTH_DOMAIN: "fabflow.app",
  WORKSHOP_CODE: "ff",
  WORKER_EMAIL_SCOPE: "workspace",

  CRM_URL:      "https://dbxfabflow.github.io/fabflow-crm/",
  OFFER_URL:    "https://dbxfabflow.github.io/fabflow-offer/",
  NESTING_URL:  "https://dbxfabflow.github.io/fabflow-nesting/",
  INVOICES_URL: "https://dbxfabflow.github.io/fabflow-invoices/",
};

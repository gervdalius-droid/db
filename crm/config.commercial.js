/* ════════════════════════════════════════════════════════════════════════════
 * CraftOS CRM — COMMERCIAL config (becomes config.js in the fabflow-crm repo).
 * Customer-only Supabase project, paywall ON, worker logins scoped per company.
 * ════════════════════════════════════════════════════════════════════════════ */
window.FAB_CONFIG = {
  SUPABASE_URL: "https://yyamcwkbwptvrdbylqji.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_ODSJnx1sWO1KUjQEl0IRZQ_2_Iyz596",

  BRAND_NAME: "CraftOS",
  APP_CODE: "crm",
  PAYWALL_ENABLED: true,
  FABSUITE_URL: "https://dbxfabflow.github.io/fabflow/fabsuite",
  SUPPORT_EMAIL: "gervdalius@gmail.com",

  // Must match FABSUITE_AUTH_DOMAIN on the commercial edge functions.
  AUTH_DOMAIN: "fabflow.app",
  WORKSHOP_CODE: "ff",
  WORKER_EMAIL_SCOPE: "workspace",

  DB_URL:    "https://dbxfabflow.github.io/fabflow/",
  OFFER_URL: "https://dbxfabflow.github.io/fabflow-offer/",
  INVOICES_URL: "https://dbxfabflow.github.io/fabflow-invoices/",
};

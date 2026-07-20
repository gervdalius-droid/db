/* ════════════════════════════════════════════════════════════════════════════
 * COMMERCIAL config for the FabFlow Nesting product (rename to config.js in the
 * fabflow-nesting repo). Paywall ON; worker logins scoped per company.
 * Fill the TODO values after creating the commercial projects.
 * ════════════════════════════════════════════════════════════════════════════ */
window.FAB_CONFIG = {
  // One commercial project holds everything for customers (nesting jobs +
  // warehouse + auth + fab_orgs), scoped per workspace. Both point at it.
  DATA_URL: "https://yyamcwkbwptvrdbylqji.supabase.co",
  DATA_ANON_KEY: "sb_publishable_ODSJnx1sWO1KUjQEl0IRZQ_2_Iyz596",

  // The warehouse/auth project = the SAME commercial project (fab_orgs + gate).
  WAREHOUSE_URL: "https://yyamcwkbwptvrdbylqji.supabase.co",
  WAREHOUSE_ANON_KEY: "sb_publishable_ODSJnx1sWO1KUjQEl0IRZQ_2_Iyz596",

  APP_TITLE: "FabFlow — Nesting",

  PAYWALL_ENABLED: true,
  APP_CODE: "nesting",
  FABSUITE_URL: "https://dbxfabflow.github.io/fabflow/fabsuite",

  // No fixed WORKSPACE_CODE — the worker types their company code at login.
  AUTH_DOMAIN: "fabflow.app",
  WORKSHOP_CODE: "ff",
  WORKER_EMAIL_SCOPE: "workspace",
};

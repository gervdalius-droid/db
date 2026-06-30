/* ════════════════════════════════════════════════════════════════════════════
 * COMMERCIAL config for the FabFlow Nesting product (rename to config.js in the
 * fabflow-nesting repo). Paywall ON; worker logins scoped per company.
 * Fill the TODO values after creating the commercial projects.
 * ════════════════════════════════════════════════════════════════════════════ */
window.FAB_CONFIG = {
  // Nesting's OWN data project for customers (a new project, or reuse one).
  DATA_URL: "https://TODO-COMMERCIAL-NESTING-REF.supabase.co",
  DATA_ANON_KEY: "TODO_PASTE_COMMERCIAL_NESTING_ANON_KEY",

  // The warehouse/auth project = the SAME commercial DB project the DB product
  // uses (this is where fab_orgs + the subscription gate live).
  WAREHOUSE_URL: "https://TODO-COMMERCIAL-REF.supabase.co",
  WAREHOUSE_ANON_KEY: "TODO_PASTE_COMMERCIAL_ANON_KEY",

  APP_TITLE: "FabFlow — Nesting",

  PAYWALL_ENABLED: true,
  APP_CODE: "nesting",
  FABSUITE_URL: "https://gervdalius-droid.github.io/fabflow/fabsuite",

  // No fixed WORKSPACE_CODE — the worker types their company code at login.
  AUTH_DOMAIN: "fabflow.app",
  WORKSHOP_CODE: "ff",
  WORKER_EMAIL_SCOPE: "workspace",
};

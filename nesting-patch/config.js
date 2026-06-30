/* ════════════════════════════════════════════════════════════════════════════
 * Per-deployment config for the NESTING app.
 * The only file that differs between your private app and the FabFlow product.
 *
 * This copy = YOUR PRIVATE NESTING APP:
 *   • your own data + warehouse projects
 *   • paywall OFF, fixed to your workspace (S4OQX)
 *   • worker logins unchanged (name.gvs@dedesbaldai.lt)
 * ════════════════════════════════════════════════════════════════════════════ */
window.FAB_CONFIG = {
  // Nesting's OWN data project (jobs / offcuts).
  DATA_URL: "https://qnnhvngjxrvqamikkocw.supabase.co",
  DATA_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFubmh2bmdqeHJ2cWFtaWtrb2N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MTkwNjYsImV4cCI6MjA5MTk5NTA2Nn0.5pOH_TSsOaMhcPF8ff45EFJT25PXoLbS2vtjKvZ7Mw0",

  // The warehouse/auth project = the DB app's project (auth + shared stock + fab_orgs).
  WAREHOUSE_URL: "https://byvtqycdgboqbmpoysyt.supabase.co",
  WAREHOUSE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5dnRxeWNkZ2JvcWJtcG95c3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3ODA0MzAsImV4cCI6MjA5MTM1NjQzMH0.IoQRxA4m45--5fQ9U40ChNVCwsBPmxTM4p8sM1-3AUo",

  // Branding
  APP_TITLE: "Dėdės Baldai — Nesting",

  // Selling / billing — OFF for your private app.
  PAYWALL_ENABLED: false,
  APP_CODE: "nesting",
  FABSUITE_URL: "https://gervdalius-droid.github.io/db/fabsuite",

  // Tenant + worker-login scheme. Fixed to your team; legacy email scope keeps
  // your existing worker logins working unchanged.
  WORKSPACE_CODE: "S4OQX",
  AUTH_DOMAIN: "dedesbaldai.lt",
  WORKSHOP_CODE: "gvs",
  WORKER_EMAIL_SCOPE: "workshop",
};

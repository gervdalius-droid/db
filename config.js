/* ════════════════════════════════════════════════════════════════════════════
 * Per-deployment configuration for the DB app.
 * ────────────────────────────────────────────────────────────────────────────
 * THIS is the only file that differs between your private app and the FabFlow
 * product. The app logic (index.html) is identical in both — it just reads the
 * values below. To make the sellable version, deploy the same index.html with a
 * different config.js (see config.commercial.js + TWO_VERSIONS.md).
 *
 * This copy = YOUR PRIVATE APP:
 *   • your own Supabase project
 *   • paywall OFF — you are never blocked
 *   • brand: Dėdės Baldai
 * ════════════════════════════════════════════════════════════════════════════ */
window.FAB_CONFIG = {
  // Backend
  SUPABASE_URL: "https://byvtqycdgboqbmpoysyt.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5dnRxeWNkZ2JvcWJtcG95c3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3ODA0MzAsImV4cCI6MjA5MTM1NjQzMH0.IoQRxA4m45--5fQ9U40ChNVCwsBPmxTM4p8sM1-3AUo",

  // Branding
  BRAND_NAME: "Dėdės Baldai",
  APP_TITLE: "Dėdės Baldai — Gamybos Valdymas",

  // Selling / billing
  PAYWALL_ENABLED: false, // private app → never gated
  APP_CODE: "db",
  FABSUITE_URL: "https://gervdalius-droid.github.io/db/fabsuite",

  // Worker name+PIN synthetic-email scheme. MUST match the set-worker-pin edge
  // function for this deployment.
  AUTH_DOMAIN: "dedesbaldai.lt",
  WORKSHOP_CODE: "gvs",
  // 'workshop' keeps your existing worker logins working unchanged.
  WORKER_EMAIL_SCOPE: "workshop",
};

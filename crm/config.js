/* ════════════════════════════════════════════════════════════════════════════
 * CraftOS CRM — PRIVATE deployment config (your own workshop).
 * Points at the private Supabase project, paywall OFF. The product build swaps
 * in config.commercial.js. See TWO_VERSIONS.md.
 * ════════════════════════════════════════════════════════════════════════════ */
window.FAB_CONFIG = {
  SUPABASE_URL: "https://byvtqycdgboqbmpoysyt.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5dnRxeWNkZ2JvcWJtcG95c3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3ODA0MzAsImV4cCI6MjA5MTM1NjQzMH0.IoQRxA4m45--5fQ9U40ChNVCwsBPmxTM4p8sM1-3AUo",

  BRAND_NAME: "Dėdės Baldai",
  APP_CODE: "crm",
  PAYWALL_ENABLED: false,

  // Worker name+PIN synthetic-email scheme — must match the DB app's config.
  AUTH_DOMAIN: "dedesbaldai.lt",
  WORKSHOP_CODE: "gvs",
  WORKER_EMAIL_SCOPE: "workshop",

  // Sibling apps, for the hand-off buttons on a deal.
  DB_URL:    "https://gervdalius-droid.github.io/db/",
  OFFER_URL: "https://gervdalius-droid.github.io/offer/",
  INVOICES_URL: "https://gervdalius-droid.github.io/invoices/",
};

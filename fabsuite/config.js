/* ════════════════════════════════════════════════════════════════════════════
 * Fabsuite storefront configuration.
 * Edit the prices/URLs here; they must match what you create in Stripe via
 * scripts/stripe-seed.mjs. The amounts below are DISPLAY ONLY — Stripe is the
 * source of truth for what's actually charged.
 * ════════════════════════════════════════════════════════════════════════════ */
window.FABSUITE = {
  // Same Supabase project + anon key the apps use.
  SUPABASE_URL: "https://byvtqycdgboqbmpoysyt.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5dnRxeWNkZ2JvcWJtcG95c3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3ODA0MzAsImV4cCI6MjA5MTM1NjQzMH0.IoQRxA4m45--5fQ9U40ChNVCwsBPmxTM4p8sM1-3AUo",

  // Where the apps are hosted (Launch buttons + post-signup redirect).
  APP_URLS: {
    db: "https://gervdalius-droid.github.io/db/",
    nesting: "https://gervdalius-droid.github.io/nesting/",
  },

  CURRENCY: "€",
  TRIAL_DAYS: 14,
  SUPPORT_EMAIL: "pagalba@fabsuite.app",

  // The three sellable plans. `apps` lists what each unlocks.
  PLANS: {
    nesting: {
      name: "Nesting",
      tagline: "Pjovimo planų optimizacija ir likučių sandėlis.",
      month: 39, year: 390,
      apps: ["nesting"],
      features: [
        "Automatinis lakštų išdėstymas (nesting)",
        "Likučių (offcut) sandėlis",
        "Medžiagų sąnaudų ataskaitos",
        "Neribotas pjovimo darbų skaičius",
      ],
      missing: ["Gamybos valdymas (DB)", "Užsakymai ir komanda"],
    },
    db: {
      name: "DB",
      tagline: "Visa gamybos eiga: projektai, žingsniai, komanda.",
      month: 49, year: 490,
      apps: ["db"],
      features: [
        "Cecho rodinys ir gamybos žingsniai",
        "Projektai, užsakymai, terminai",
        "Komanda, PIN prisijungimai, vaidmenys",
        "Sandėlis ir medžiagų poreikis",
      ],
      missing: ["Pjovimo optimizacija (Nesting)"],
    },
    suite: {
      name: "Fabsuite",
      tagline: "Viskas viename — Nesting + DB su nuolaida.",
      month: 69, year: 690,
      apps: ["nesting", "db"],
      featured: true,
      features: [
        "Viskas iš Nesting plano",
        "Viskas iš DB plano",
        "Bendras sandėlis tarp abiejų programų",
        "Prioritetinė pagalba",
      ],
      missing: [],
    },
  },
};

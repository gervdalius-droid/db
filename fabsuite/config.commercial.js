/* ════════════════════════════════════════════════════════════════════════════
 * COMMERCIAL storefront config (becomes fabsuite/config.js in the fabflow repo).
 * Points at the customer-only Supabase project and the CraftOS app URLs.
 * Keep prices in sync with scripts/stripe-seed.mjs.
 * ════════════════════════════════════════════════════════════════════════════ */
window.FABSUITE = {
  // The NEW customer-only Supabase project (same as config.commercial.js).
  SUPABASE_URL: "https://yyamcwkbwptvrdbylqji.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_ODSJnx1sWO1KUjQEl0IRZQ_2_Iyz596",

  // Where the apps live (Launch buttons + post-signup redirect).
  APP_URLS: {
    db: "https://dbxfabflow.github.io/fabflow/",
    nesting: "https://dbxfabflow.github.io/fabflow-nesting/",
  },

  BRAND: "CraftOS",
  CURRENCY: "€",
  TRIAL_DAYS: 14,
  // ⚠ TEST MODE: every new signup is activated free (comp) and Stripe is skipped.
  // To require payment at go-live: set false AND remove the FABSUITE_FREE_SIGNUP secret.
  FREE_SIGNUP: true,
  SUPPORT_EMAIL: "pagalba@craftos.app",

  PLANS: {
    nesting: {
      name: "Nesting",
      tagline: "Pjovimo planų optimizacija ir likučių sandėlis.",
      month: 39, year: 390, apps: ["nesting"],
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
      month: 49, year: 490, apps: ["db"],
      features: [
        "Cecho rodinys ir gamybos žingsniai",
        "Projektai, užsakymai, terminai",
        "Komanda, PIN prisijungimai, vaidmenys",
        "Sandėlis ir medžiagų poreikis",
      ],
      missing: ["Pjovimo optimizacija (Nesting)"],
    },
    suite: {
      name: "CraftOS",
      tagline: "Viskas viename — Nesting + DB su nuolaida.",
      month: 69, year: 690, apps: ["nesting", "db"], featured: true,
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

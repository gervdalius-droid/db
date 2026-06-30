/* ════════════════════════════════════════════════════════════════════════════
 * COMMERCIAL storefront config (becomes fabsuite/config.js in the fabflow repo).
 * Points at the customer-only Supabase project and the FabFlow app URLs.
 * Keep prices in sync with scripts/stripe-seed.mjs.
 * ════════════════════════════════════════════════════════════════════════════ */
window.FABSUITE = {
  // The NEW customer-only Supabase project (same as config.commercial.js).
  SUPABASE_URL: "https://TODO-COMMERCIAL-REF.supabase.co",
  SUPABASE_ANON_KEY: "TODO_PASTE_COMMERCIAL_ANON_KEY",

  // Where the apps live (Launch buttons + post-signup redirect).
  APP_URLS: {
    db: "https://gervdalius-droid.github.io/fabflow/",
    nesting: "https://gervdalius-droid.github.io/fabflow-nesting/",
  },

  CURRENCY: "€",
  TRIAL_DAYS: 14,
  SUPPORT_EMAIL: "pagalba@fabflow.app",

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
      name: "FabFlow",
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

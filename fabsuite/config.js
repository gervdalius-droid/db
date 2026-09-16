/* ════════════════════════════════════════════════════════════════════════════
 * Fabsuite storefront configuration — LOCAL / PREVIEW version.
 * Points at the private Supabase project and the private app URLs, so you can
 * click through the storefront without touching the commercial project.
 * The product build swaps in config.commercial.js. Prices are DISPLAY ONLY —
 * Stripe is the source of truth for what is actually charged.
 * ════════════════════════════════════════════════════════════════════════════ */
window.FABSUITE = {
  // Same Supabase project + anon key the private apps use.
  SUPABASE_URL: "https://byvtqycdgboqbmpoysyt.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5dnRxeWNkZ2JvcWJtcG95c3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3ODA0MzAsImV4cCI6MjA5MTM1NjQzMH0.IoQRxA4m45--5fQ9U40ChNVCwsBPmxTM4p8sM1-3AUo",

  // Where the apps live (Launch buttons + post-signup redirect).
  APP_URLS: {
    db: "https://gervdalius-droid.github.io/db/",
    nesting: "https://gervdalius-droid.github.io/nesting/",
    crm: "https://gervdalius-droid.github.io/db/crm/",
    offer: "https://gervdalius-droid.github.io/offer/",
    invoices: "https://gervdalius-droid.github.io/invoices/",
  },

  BRAND: "CraftOS",
  CURRENCY: "€",
  // Open beta: a long free trial, but the card is collected at signup through
  // Stripe Checkout so the subscription converts on its own. Keep this equal to
  // the FABSUITE_TRIAL_DAYS secret on the Supabase project.
  TRIAL_DAYS: 60,
  // false = real Stripe Checkout (card on file). Setting this true skips Stripe
  // entirely and comps every signup — only for testing, and it also needs the
  // FABSUITE_FREE_SIGNUP secret set on the edge functions.
  FREE_SIGNUP: false,
  SUPPORT_EMAIL: "gervdalius@gmail.com",


  // ── Legal entity behind the service ──────────────────────────────────────
  // Fill these in before taking real payments: Stripe requires identifiable
  // terms + a refund/cancellation policy on the site, and the GDPR requires a
  // named controller with a contact address. Anything left blank shows up as a
  // visible "TO BE COMPLETED" marker on terms.html / privacy.html.
  LEGAL: {
    company: "",          // e.g. "UAB Pavyzdys"
    reg_no: "",           // company registration number
    vat_no: "",           // VAT number, if registered
    address: "",          // full registered address
    email: "",            // legal / privacy contact (defaults to SUPPORT_EMAIL)
    country: "Lietuva",   // governing law
    effective: "",        // e.g. "2026-09-01" — defaults to today
  },

  PLANS: {
    crm: {
      name: "CRM",
      tagline: "Klientai, užklausos ir sandorių eiga vienoje lentoje.",
      month: 29, year: 290, apps: ["crm"],
      features: [
        "Klientų ir kontaktų registras",
        "Užklausa → matavimai → pasiūlymas → laimėta",
        "Priminimai ir sekantys žingsniai",
        "Laimėtą sandorį perduokite tiesiai į pasiūlymą",
      ],
      missing: ["Pasiūlymų skaičiuoklė (Offer)", "Gamybos valdymas (DB)"],
    },
    offer: {
      name: "Offer",
      tagline: "Baldų savikaina ir klientui paruošti pasiūlymai.",
      month: 29, year: 290, apps: ["offer"],
      features: [
        "Savikaina kiekvienam korpusui",
        "Medžiagos, briaunos, furnitūra, darbas",
        "PDF pasiūlymas su jūsų logotipu",
        "Antkainio ir nuolaidų valdymas",
      ],
      missing: ["Klientų eiga (CRM)", "Gamybos valdymas (DB)"],
    },
    invoices: {
      name: "Invoices",
      tagline: "Sąskaitos faktūros, važtaraščiai ir apmokėjimų sekimas.",
      month: 19, year: 190, apps: ["invoices"],
      features: [
        "PVM ir paprastos sąskaitos faktūros",
        "Važtaraščiai su maršrutu ir vairuotojais",
        "Apmokėjimai, skolos ir vėluojantys mokėjimai",
        "PDF, CSV ir e. sąskaitos XML eksportas",
      ],
      missing: ["Pasiūlymų skaičiuoklė (Offer)", "Gamybos valdymas (DB)"],
    },
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
      tagline: "Visas cechas: maršrutai, postai, vienetai, komanda.",
      month: 49, year: 490, apps: ["db"],
      features: [
        "Postų lenta su gyvais laikmačiais",
        "Lygiagretūs maršrutai ir vienetų sekimas",
        "Sąrašas, lenta, Gantas, kalendorius, apkrova",
        "Skenavimo postas, sandėlis, PIN prisijungimai",
      ],
      missing: ["Pjovimo optimizacija (Nesting)"],
    },
    suite: {
      name: "CraftOS",
      tagline: "Viskas viename — visos penkios programos su nuolaida.",
      month: 89, year: 890, apps: ["crm", "offer", "invoices", "nesting", "db"], featured: true,
      features: [
        "Viskas iš CRM, Offer, Invoices, Nesting ir DB",
        "Klientas → pasiūlymas → projektas → pjovimas",
        "Bendras sandėlis visose programose",
        "Prioritetinė pagalba",
      ],
      missing: [],
    },
  },
};

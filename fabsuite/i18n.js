/* ════════════════════════════════════════════════════════════════════════════
 * CraftOS storefront — internationalization (EN / LT / DE / ES).
 * Drives every visible string via [data-i18n] attributes + a language switcher.
 * Usage: include AFTER config.js. Call I18N.apply() on DOMContentLoaded.
 *   <span data-i18n="nav.features"></span>        → textContent
 *   <span data-i18n-html="hero.h1"></span>        → innerHTML (allows <br>,<b>)
 *   <input data-i18n-ph="signup.company_ph">      → placeholder
 * The token {brand} is replaced with FABSUITE.BRAND everywhere.
 * ════════════════════════════════════════════════════════════════════════════ */
(function (g) {
  "use strict";
  var BRAND = (g.FABSUITE && g.FABSUITE.BRAND) || "CraftOS";
  var LANGS = [
    { code: "en", label: "English",  flag: "🇬🇧" },
    { code: "lt", label: "Lietuvių", flag: "🇱🇹" },
    { code: "de", label: "Deutsch",  flag: "🇩🇪" },
    { code: "es", label: "Español",  flag: "🇪🇸" },
  ];

  var DICT = {
    /* ─────────────────────────── ENGLISH ─────────────────────────── */
    en: {
      "meta.title.home": "{brand} — production software for furniture workshops",
      "meta.title.signup": "Create your workspace — {brand}",
      "meta.title.success": "You're all set — {brand}",
      "meta.title.canceled": "Checkout canceled — {brand}",
      "meta.title.account": "My account — {brand}",
      "meta.desc": "Nesting & production management for furniture makers. Cut smarter, run the whole shop floor, start in minutes.",

      "nav.features": "Features",
      "nav.demo": "Live demo",
      "nav.pricing": "Pricing",
      "nav.account": "My account",
      "nav.start": "Get started",

      "hero.eyebrow": "Furniture manufacturing software",
      "hero.h1": "From cutting plan<br>to delivered order.",
      "hero.lead": "{brand} joins two tools built for a real workshop: <b>Nesting</b> optimizes cutting and offcuts, <b>DB</b> runs the whole production flow — projects, steps and your team.",
      "hero.cta1": "Start free trial →",
      "hero.cta2": "See it work",
      "hero.note": "14-day free trial · cancel anytime · no installation",
      "hero.trybadge": "Interactive demo — no signup",

      "stats.workshops": "workshops onboard in minutes",
      "stats.uptime": "uptime, data synced to the cloud",
      "stats.waste": "less offcut waste on average",
      "stats.setup": "to set up — no IT, no install",

      "features.h2": "Two tools. One workspace.",
      "features.sub": "Same logins, same warehouse, same team — across both apps.",
      "features.nesting.h3": "Nesting — cutting optimization",
      "features.nesting.p": "Automatic part layout on sheets, an offcut warehouse and material-cost reporting. Less waste, more reused offcuts.",
      "features.db.h3": "DB — production management",
      "features.db.p": "Shop-floor view, production steps, projects and orders, team roles with PIN login, deadline tracking and reports.",
      "features.logins.h3": "One set of logins",
      "features.logins.p": "A worker signs in with a name and PIN — works in both apps instantly.",
      "features.warehouse.h3": "Shared warehouse",
      "features.warehouse.p": "Offcuts and sheets are visible in both Nesting and DB in real time.",
      "features.cloud.h3": "In the cloud",
      "features.cloud.p": "Nothing to install. Open it in a browser; data syncs automatically.",

      "demo.h2": "See how it looks",
      "demo.sub": "Live, in your browser — no screenshots. Sample projects, real behavior.",

      "demo.nesting.tag": "Nesting",
      "demo.nesting.h3": "Cutting optimization that saves material",
      "demo.nesting.p": "Drop in your parts — the app lays them out on sheets with the least waste, prices the job and prepares files for the saw.",
      "demo.nesting.b1": "Automatic layout · efficiency & offcuts in real time",
      "demo.nesting.b2": "DXF / cut files for CNC and beam saws",
      "demo.nesting.b3": "Pricing and a customer quote in one click",
      "demo.nesting.eff": "Sheet efficiency",
      "demo.nesting.sheets": "Sheets",
      "demo.nesting.offcuts": "Offcuts saved",
      "demo.nesting.parts": "Parts nested",
      "demo.nesting.replay": "Replay",

      "demo.board.tag": "DB · Production",
      "demo.board.h3": "The whole shop floor on one screen",
      "demo.board.p": "The floor view shows every project and production step — what's running, what's stuck, what's done.",
      "demo.board.b1": "Live status: in progress · done · delayed",
      "demo.board.b2": "Projects grouped by step and deadline",
      "demo.board.b3": "Spot the bottleneck before it stops the shop",
      "demo.board.live": "Live",
      "demo.board.col.cutting": "Cutting",
      "demo.board.col.edging": "Edgebanding",
      "demo.board.col.assembly": "Assembly",
      "demo.board.col.delivery": "Delivery",
      "demo.board.st.progress": "In progress",
      "demo.board.st.done": "Done",
      "demo.board.st.delayed": "Delayed",
      "demo.board.st.queued": "Queued",
      "demo.board.due": "due",

      "demo.report.tag": "DB · Daily report",
      "demo.report.h3": "Know today's output at a glance",
      "demo.report.p": "Square meters cut, edgeband meters, pieces finished — per step, per worker, with a two-week trend.",
      "demo.report.b1": "m² cut is the headline for the saw",
      "demo.report.b2": "By-worker breakdown and a 14-day chart",
      "demo.report.b3": "Export or share with one tap",
      "demo.report.cut": "Cut today",
      "demo.report.edge": "Edgebanded",
      "demo.report.pieces": "Pieces done",
      "demo.report.trend": "14-day trend",

      "how.h2": "Ordering takes three minutes",
      "how.sub": "No sales call, no installation. Pick a plan and your team is working today.",
      "how.s1.t": "Pick a plan",
      "how.s1.p": "Nesting, DB, or the full suite. Monthly or yearly — switch anytime.",
      "how.s2.t": "Create your workspace",
      "how.s2.p": "Company name, email, password. Your 14-day free trial starts instantly.",
      "how.s3.t": "Invite your team",
      "how.s3.p": "Share the workspace code; workers log in with a name and PIN.",
      "how.s4.t": "Pay only after the trial",
      "how.s4.p": "Card is charged when the trial ends — cancel before and you pay nothing.",
      "how.cta": "Try the ordering flow →",

      "quote.text": "“We stopped guessing offcuts and the floor finally runs on one screen. It feels like software we couldn't afford — at a price we didn't expect.”",
      "quote.name": "Workshop owner",
      "quote.role": "12-person cabinet shop",

      "pricing.h2": "Simple pricing for your needs",
      "pricing.sub": "Buy one tool or both at a discount. Every plan — 14 days free.",
      "pricing.monthly": "Monthly",
      "pricing.yearly": "Yearly",
      "pricing.save": "–2 months",
      "pricing.per_month": "per month",
      "pricing.per_year": "per year",
      "pricing.mo": "mo",
      "pricing.yr": "yr",
      "pricing.trial_short": "14 days free",
      "pricing.popular": "Most popular",
      "pricing.start": "Start →",
      "pricing.vat": "Prices exclude VAT. Payments securely processed by Stripe.",

      "final.h2": "Ready to start?",
      "final.sub": "Set up a workspace in minutes and invite your team.",
      "final.cta": "Choose a plan →",

      "footer.tagline": "Production software for furniture workshops",
      "footer.account": "My account",
      "footer.pricing": "Pricing",
      "footer.help": "Help",
      "footer.terms": "Terms",

      "plan.nesting.name": "Nesting",
      "plan.nesting.tag": "Cutting-plan optimization and an offcut warehouse.",
      "plan.nesting.f": ["Automatic sheet layout (nesting)", "Offcut warehouse", "Material-cost reports", "Unlimited cutting jobs"],
      "plan.nesting.miss": ["Production management (DB)", "Orders and team"],
      "plan.db.name": "DB",
      "plan.db.tag": "The whole production flow: projects, steps, team.",
      "plan.db.f": ["Shop-floor view & production steps", "Projects, orders, deadlines", "Team, PIN logins, roles", "Warehouse & material needs"],
      "plan.db.miss": ["Cutting optimization (Nesting)"],
      "plan.suite.name": "{brand}",
      "plan.suite.tag": "Everything in one — Nesting + DB at a discount.",
      "plan.suite.f": ["Everything in Nesting", "Everything in DB", "Shared warehouse across both apps", "Priority support"],
      "plan.suite.miss": [],

      "signup.title": "Create your workspace",
      "signup.sub_none": "Pick a plan on the home page.",
      "signup.sub_plan": "Plan: {name} — you start with a 14-day free trial.",
      "signup.trial_note": "✓ 14-day free trial — your card is charged only after the trial.",
      "signup.change_plan": "← Change plan",
      "signup.company": "Company / workshop name",
      "signup.company_ph": "e.g. Northwind Furniture",
      "signup.email": "Email (manager login)",
      "signup.email_ph": "manager@company.com",
      "signup.password": "Password",
      "signup.password_ph": "at least 6 characters",
      "signup.submit": "Continue to payment →",
      "signup.creating": "Creating…",
      "signup.terms": "By creating an account you agree to the terms of service.",
      "signup.have": "Have an account?",
      "signup.err_company": "Enter a company name.",
      "signup.err_email": "Enter a valid email.",
      "signup.err_password": "Password must be at least 6 characters.",
      "signup.err_generic": "Something went wrong.",
      "signup.err_checkout": "Couldn't start payment. Please try again.",
      "signup.err_account": "Couldn't create the account",
      "signup.err_workspace": "Couldn't create the workspace",
      "signup.demo_badge": "Demo mode — no real charge",

      "success.h2": "Your workspace is ready!",
      "success.sub": "Your 14-day free trial has started.",
      "success.code_label": "Workspace code",
      "success.share": "Share this code with your team — workers need it to log in.",
      "success.open_db": "Open DB →",
      "success.open_nesting": "Open Nesting →",
      "success.account": "My account & billing",
      "success.signin_note": "Sign in with the email and password you just created.",
      "success.demo_note": "This is a demo — no account or charge was created.",

      "canceled.h2": "Checkout not completed",
      "canceled.sub": "Nothing was charged. You can try again anytime.",
      "canceled.back": "Back to plans →",
      "canceled.account": "My account",
      "canceled.help": "Need help?",
      "canceled.contact": "Contact us",

      "account.signin_h2": "Sign in",
      "account.signin_sub": "Manage your subscription and billing.",
      "account.email": "Email",
      "account.password": "Password",
      "account.signin_btn": "Sign in →",
      "account.signing": "Signing in…",
      "account.no_account": "No account?",
      "account.choose_plan": "Choose a plan",
      "account.err_creds": "Wrong email or password.",
      "account.greeting": "Welcome 👋",
      "account.logout": "Log out",
      "account.no_orgs": "You don't have an active workspace yet.",
      "account.code": "Code",
      "account.manage": "Manage billing",
      "account.next_payment": "Next payment:",
      "account.trial_until": "Trial until:",
      "account.st.none": "No subscription",
      "account.st.free": "Active (free)",
      "account.st.trialing": "Trial",
      "account.st.active": "Active",
      "account.st.past_due": "Payment overdue",
      "account.st.unpaid": "Unpaid",
      "account.st.canceled": "Canceled",
      "account.st.inactive": "Inactive",
      "account.portal_err": "Couldn't open the billing portal.",
    },

    /* ─────────────────────────── LIETUVIŲ ─────────────────────────── */
    lt: {
      "meta.title.home": "{brand} — gamybos programinė įranga baldų cechams",
      "meta.title.signup": "Sukurti darbo vietą — {brand}",
      "meta.title.success": "Pavyko! — {brand}",
      "meta.title.canceled": "Apmokėjimas atšauktas — {brand}",
      "meta.title.account": "Mano paskyra — {brand}",
      "meta.desc": "Nesting ir gamybos valdymas baldų gamintojams. Pjauk taupiau, valdyk visą cechą, pradėk per kelias minutes.",

      "nav.features": "Galimybės",
      "nav.demo": "Demonstracija",
      "nav.pricing": "Kainos",
      "nav.account": "Mano paskyra",
      "nav.start": "Pradėti",

      "hero.eyebrow": "Baldų gamybos programinė įranga",
      "hero.h1": "Nuo pjovimo plano<br>iki pristatyto užsakymo.",
      "hero.lead": "{brand} jungia du įrankius, sukurtus realiam baldų cechui: <b>Nesting</b> optimizuoja pjovimą ir likučius, <b>DB</b> valdo visą gamybos eigą — projektus, žingsnius ir komandą.",
      "hero.cta1": "Išbandyti nemokamai →",
      "hero.cta2": "Kaip tai veikia",
      "hero.note": "14 dienų nemokamas bandymas · atšauk bet kada · be įdiegimo",
      "hero.trybadge": "Interaktyvi demonstracija — be registracijos",

      "stats.workshops": "cechai pradeda per kelias minutes",
      "stats.uptime": "prieinamumas, duomenys debesyje",
      "stats.waste": "mažiau likučių atliekų vidutiniškai",
      "stats.setup": "įsidiegimui — be IT, be install",

      "features.h2": "Du įrankiai. Viena darbo vieta.",
      "features.sub": "Tie patys prisijungimai, tas pats sandėlis, ta pati komanda — abiejose programose.",
      "features.nesting.h3": "Nesting — pjovimo optimizacija",
      "features.nesting.p": "Automatinis detalių išdėstymas lakštuose, likučių sandėlis ir medžiagų sąnaudų skaičiavimas. Mažiau atliekų, daugiau panaudotų likučių.",
      "features.db.h3": "DB — gamybos valdymas",
      "features.db.p": "Cecho rodinys, gamybos žingsniai, projektai ir užsakymai, komandos vaidmenys su PIN prisijungimu, terminų sekimas ir ataskaitos.",
      "features.logins.h3": "Vieni prisijungimai",
      "features.logins.p": "Darbuotojas prisijungia vardu ir PIN — veikia abiejose programose iš karto.",
      "features.warehouse.h3": "Bendras sandėlis",
      "features.warehouse.p": "Pjovimo likučiai ir lakštai matomi tiek Nesting, tiek DB programoje realiu laiku.",
      "features.cloud.h3": "Debesyje",
      "features.cloud.p": "Nieko įdiegti nereikia. Atsidaryk naršyklėje, duomenys sinchronizuojami automatiškai.",

      "demo.h2": "Pažiūrėkite, kaip tai atrodo",
      "demo.sub": "Gyvai, jūsų naršyklėje — jokių nuotraukų. Pavyzdiniai projektai, tikras veikimas.",

      "demo.nesting.tag": "Nesting",
      "demo.nesting.h3": "Pjovimo optimizacija, kuri taupo medžiagą",
      "demo.nesting.p": "Įkelkite detales — programa automatiškai išdėsto jas lakštuose su mažiausiai atliekų, paskaičiuoja kainą ir paruošia failus staklėms.",
      "demo.nesting.b1": "Automatinis išdėstymas · efektyvumas ir likučiai realiu laiku",
      "demo.nesting.b2": "DXF / pjovimo failai CNC ir formatinėms staklėms",
      "demo.nesting.b3": "Kainodara ir pasiūlymas klientui vienu paspaudimu",
      "demo.nesting.eff": "Lakšto efektyvumas",
      "demo.nesting.sheets": "Lakštai",
      "demo.nesting.offcuts": "Sutaupyta likučių",
      "demo.nesting.parts": "Išdėstyta detalių",
      "demo.nesting.replay": "Pakartoti",

      "demo.board.tag": "DB · Gamyba",
      "demo.board.h3": "Visa gamyba viename ekrane",
      "demo.board.p": "Cecho rodinys parodo kiekvieną projektą ir gamybos žingsnį — kas vyksta, kas užstrigo, kas atlikta.",
      "demo.board.b1": "Gyvos būsenos: vykdoma · atlikta · vėluoja",
      "demo.board.b2": "Projektai suskirstyti pagal etapą ir terminą",
      "demo.board.b3": "Pastebėkite butelio kaklelį anksčiau nei jis sustabdo cechą",
      "demo.board.live": "Gyvai",
      "demo.board.col.cutting": "Pjovimas",
      "demo.board.col.edging": "Briaunavimas",
      "demo.board.col.assembly": "Surinkimas",
      "demo.board.col.delivery": "Pristatymas",
      "demo.board.st.progress": "Vykdoma",
      "demo.board.st.done": "Atlikta",
      "demo.board.st.delayed": "Vėluoja",
      "demo.board.st.queued": "Eilėje",
      "demo.board.due": "iki",

      "demo.report.tag": "DB · Dienos ataskaita",
      "demo.report.h3": "Šiandienos rezultatas iš pirmo žvilgsnio",
      "demo.report.p": "Supjauti kvadratiniai metrai, briaunavimo metrai, pagamintos detalės — pagal žingsnį, darbuotoją, su dviejų savaičių tendencija.",
      "demo.report.b1": "m² pjovimas — pagrindinis pjūklo rodiklis",
      "demo.report.b2": "Suskirstymas pagal darbuotoją ir 14 dienų grafikas",
      "demo.report.b3": "Eksportuok arba dalinkis vienu paspaudimu",
      "demo.report.cut": "Supjauta šiandien",
      "demo.report.edge": "Briaunuota",
      "demo.report.pieces": "Detalių baigta",
      "demo.report.trend": "14 dienų tendencija",

      "how.h2": "Užsisakyti — trys minutės",
      "how.sub": "Jokių skambučių, jokio diegimo. Pasirink planą ir komanda dirba jau šiandien.",
      "how.s1.t": "Pasirink planą",
      "how.s1.p": "Nesting, DB ar visas rinkinys. Mėnesinis ar metinis — keisk bet kada.",
      "how.s2.t": "Sukurk darbo vietą",
      "how.s2.p": "Įmonės pavadinimas, el. paštas, slaptažodis. 14 d. nemokamas bandymas prasideda iškart.",
      "how.s3.t": "Pakviesk komandą",
      "how.s3.p": "Pasidalink darbo vietos kodu; darbuotojai jungiasi vardu ir PIN.",
      "how.s4.t": "Mokėk tik po bandymo",
      "how.s4.p": "Kortelė nuskaitoma pasibaigus bandymui — atšauk anksčiau ir nemokėsi nieko.",
      "how.cta": "Išbandyti užsakymo eigą →",

      "quote.text": "„Nustojome spėlioti likučius, o cechas pagaliau valdomas viename ekrane. Jaučiasi kaip programa, kurios negalėtume sau leisti — už netikėtai mažą kainą.“",
      "quote.name": "Cecho savininkas",
      "quote.role": "12 žmonių baldų cechas",

      "pricing.h2": "Paprasta kaina pagal poreikį",
      "pricing.sub": "Pirk vieną įrankį arba abu su nuolaida. Visi planai — 14 dienų nemokamai.",
      "pricing.monthly": "Mėnesinis",
      "pricing.yearly": "Metinis",
      "pricing.save": "–2 mėn.",
      "pricing.per_month": "per mėnesį",
      "pricing.per_year": "per metus",
      "pricing.mo": "mėn.",
      "pricing.yr": "m.",
      "pricing.trial_short": "14 d. nemokamai",
      "pricing.popular": "Populiariausia",
      "pricing.start": "Pradėti →",
      "pricing.vat": "Kainos be PVM. Mokėjimai saugiai apdorojami per Stripe.",

      "final.h2": "Pasiruošę pradėti?",
      "final.sub": "Susikurk darbo vietą per kelias minutes ir pakviesk komandą.",
      "final.cta": "Pasirinkti planą →",

      "footer.tagline": "Gamybos programinė įranga baldų cechams",
      "footer.account": "Mano paskyra",
      "footer.pricing": "Kainos",
      "footer.help": "Pagalba",
      "footer.terms": "Sąlygos",

      "plan.nesting.name": "Nesting",
      "plan.nesting.tag": "Pjovimo planų optimizacija ir likučių sandėlis.",
      "plan.nesting.f": ["Automatinis lakštų išdėstymas (nesting)", "Likučių (offcut) sandėlis", "Medžiagų sąnaudų ataskaitos", "Neribotas pjovimo darbų skaičius"],
      "plan.nesting.miss": ["Gamybos valdymas (DB)", "Užsakymai ir komanda"],
      "plan.db.name": "DB",
      "plan.db.tag": "Visa gamybos eiga: projektai, žingsniai, komanda.",
      "plan.db.f": ["Cecho rodinys ir gamybos žingsniai", "Projektai, užsakymai, terminai", "Komanda, PIN prisijungimai, vaidmenys", "Sandėlis ir medžiagų poreikis"],
      "plan.db.miss": ["Pjovimo optimizacija (Nesting)"],
      "plan.suite.name": "{brand}",
      "plan.suite.tag": "Viskas viename — Nesting + DB su nuolaida.",
      "plan.suite.f": ["Viskas iš Nesting plano", "Viskas iš DB plano", "Bendras sandėlis tarp abiejų programų", "Prioritetinė pagalba"],
      "plan.suite.miss": [],

      "signup.title": "Sukurti darbo vietą",
      "signup.sub_none": "Pasirink planą pradžios puslapyje.",
      "signup.sub_plan": "Planas: {name} — pradedi 14 d. nemokamu bandymu.",
      "signup.trial_note": "✓ 14 dienų nemokamas bandymas — kortelė nuskaitoma tik po bandymo.",
      "signup.change_plan": "← Keisti planą",
      "signup.company": "Įmonės / dirbtuvės pavadinimas",
      "signup.company_ph": "pvz., UAB Baltijos baldai",
      "signup.email": "El. paštas (vadovo prisijungimas)",
      "signup.email_ph": "vadovas@imone.lt",
      "signup.password": "Slaptažodis",
      "signup.password_ph": "bent 6 simboliai",
      "signup.submit": "Tęsti į apmokėjimą →",
      "signup.creating": "Kuriama…",
      "signup.terms": "Sukurdami paskyrą sutinkate su paslaugų teikimo sąlygomis.",
      "signup.have": "Turite paskyrą?",
      "signup.err_company": "Įveskite įmonės pavadinimą.",
      "signup.err_email": "Įveskite teisingą el. paštą.",
      "signup.err_password": "Slaptažodis turi būti bent 6 simbolių.",
      "signup.err_generic": "Įvyko klaida.",
      "signup.err_checkout": "Nepavyko pradėti apmokėjimo. Bandykite dar kartą.",
      "signup.err_account": "Nepavyko sukurti paskyros",
      "signup.err_workspace": "Nepavyko sukurti darbo vietos",
      "signup.demo_badge": "Demonstracija — realus mokėjimas nevyksta",

      "success.h2": "Darbo vieta paruošta!",
      "success.sub": "Jūsų 14 dienų nemokamas bandymas prasidėjo.",
      "success.code_label": "Darbo vietos kodas",
      "success.share": "Pasidalinkite šiuo kodu su komanda — jis reikalingas darbuotojų prisijungimui.",
      "success.open_db": "Atidaryti DB →",
      "success.open_nesting": "Atidaryti Nesting →",
      "success.account": "Mano paskyra ir atsiskaitymai",
      "success.signin_note": "Prisijunkite el. paštu ir slaptažodžiu, kuriuos ką tik sukūrėte.",
      "success.demo_note": "Tai demonstracija — jokia paskyra ar mokėjimas nesukurtas.",

      "canceled.h2": "Apmokėjimas neužbaigtas",
      "canceled.sub": "Niekas nenuskaityta. Galite pabandyti dar kartą bet kada.",
      "canceled.back": "Grįžti prie planų →",
      "canceled.account": "Mano paskyra",
      "canceled.help": "Reikia pagalbos?",
      "canceled.contact": "Susisiekite",

      "account.signin_h2": "Prisijungti",
      "account.signin_sub": "Tvarkykite prenumeratą ir atsiskaitymus.",
      "account.email": "El. paštas",
      "account.password": "Slaptažodis",
      "account.signin_btn": "Prisijungti →",
      "account.signing": "Jungiamasi…",
      "account.no_account": "Neturite paskyros?",
      "account.choose_plan": "Pasirinkti planą",
      "account.err_creds": "Neteisingas el. paštas arba slaptažodis.",
      "account.greeting": "Sveiki 👋",
      "account.logout": "Atsijungti",
      "account.no_orgs": "Dar neturite aktyvios darbo vietos.",
      "account.code": "Kodas",
      "account.manage": "Valdyti atsiskaitymus",
      "account.next_payment": "Kitas mokėjimas:",
      "account.trial_until": "Bandymas iki:",
      "account.st.none": "Nėra prenumeratos",
      "account.st.free": "Aktyvi (nemokama)",
      "account.st.trialing": "Bandymas",
      "account.st.active": "Aktyvi",
      "account.st.past_due": "Vėluoja mokėjimas",
      "account.st.unpaid": "Neapmokėta",
      "account.st.canceled": "Atšaukta",
      "account.st.inactive": "Neaktyvi",
      "account.portal_err": "Nepavyko atidaryti portalo.",
    },

    /* ─────────────────────────── DEUTSCH ─────────────────────────── */
    de: {
      "meta.title.home": "{brand} — Produktionssoftware für Möbelwerkstätten",
      "meta.title.signup": "Arbeitsbereich erstellen — {brand}",
      "meta.title.success": "Alles bereit — {brand}",
      "meta.title.canceled": "Zahlung abgebrochen — {brand}",
      "meta.title.account": "Mein Konto — {brand}",
      "meta.desc": "Nesting & Produktionsverwaltung für Möbelhersteller. Cleverer zuschneiden, die ganze Werkstatt steuern, in Minuten starten.",

      "nav.features": "Funktionen",
      "nav.demo": "Live-Demo",
      "nav.pricing": "Preise",
      "nav.account": "Mein Konto",
      "nav.start": "Loslegen",

      "hero.eyebrow": "Software für die Möbelfertigung",
      "hero.h1": "Vom Schnittplan<br>zum ausgelieferten Auftrag.",
      "hero.lead": "{brand} vereint zwei Werkzeuge für die echte Werkstatt: <b>Nesting</b> optimiert Zuschnitt und Reststücke, <b>DB</b> steuert den gesamten Produktionsablauf — Projekte, Schritte und Ihr Team.",
      "hero.cta1": "Kostenlos testen →",
      "hero.cta2": "So funktioniert's",
      "hero.note": "14 Tage kostenlos · jederzeit kündbar · keine Installation",
      "hero.trybadge": "Interaktive Demo — ohne Anmeldung",

      "stats.workshops": "Werkstätten starten in Minuten",
      "stats.uptime": "Verfügbarkeit, Daten in der Cloud",
      "stats.waste": "weniger Verschnitt im Schnitt",
      "stats.setup": "zur Einrichtung — keine IT, keine Installation",

      "features.h2": "Zwei Werkzeuge. Ein Arbeitsbereich.",
      "features.sub": "Gleiche Logins, gleiches Lager, gleiches Team — in beiden Apps.",
      "features.nesting.h3": "Nesting — Zuschnittoptimierung",
      "features.nesting.p": "Automatische Teileanordnung auf Platten, ein Reststück-Lager und Materialkostenberichte. Weniger Abfall, mehr genutzte Reststücke.",
      "features.db.h3": "DB — Produktionsverwaltung",
      "features.db.p": "Werkstattansicht, Produktionsschritte, Projekte und Aufträge, Teamrollen mit PIN-Login, Terminverfolgung und Berichte.",
      "features.logins.h3": "Ein Login-Satz",
      "features.logins.p": "Ein Mitarbeiter meldet sich mit Name und PIN an — sofort in beiden Apps.",
      "features.warehouse.h3": "Gemeinsames Lager",
      "features.warehouse.p": "Reststücke und Platten sind in Nesting und DB in Echtzeit sichtbar.",
      "features.cloud.h3": "In der Cloud",
      "features.cloud.p": "Nichts zu installieren. Im Browser öffnen; Daten synchronisieren automatisch.",

      "demo.h2": "So sieht es aus",
      "demo.sub": "Live, in Ihrem Browser — keine Screenshots. Beispielprojekte, echtes Verhalten.",

      "demo.nesting.tag": "Nesting",
      "demo.nesting.h3": "Zuschnittoptimierung, die Material spart",
      "demo.nesting.p": "Teile einfügen — die App ordnet sie mit dem geringsten Verschnitt auf Platten an, kalkuliert den Auftrag und erstellt Dateien für die Säge.",
      "demo.nesting.b1": "Automatische Anordnung · Effizienz & Reststücke in Echtzeit",
      "demo.nesting.b2": "DXF / Schnittdateien für CNC und Plattensägen",
      "demo.nesting.b3": "Kalkulation und Kundenangebot mit einem Klick",
      "demo.nesting.eff": "Platteneffizienz",
      "demo.nesting.sheets": "Platten",
      "demo.nesting.offcuts": "Reststücke gespart",
      "demo.nesting.parts": "Teile platziert",
      "demo.nesting.replay": "Wiederholen",

      "demo.board.tag": "DB · Produktion",
      "demo.board.h3": "Die ganze Werkstatt auf einem Bildschirm",
      "demo.board.p": "Die Werkstattansicht zeigt jedes Projekt und jeden Schritt — was läuft, was hängt, was fertig ist.",
      "demo.board.b1": "Live-Status: in Arbeit · fertig · verspätet",
      "demo.board.b2": "Projekte nach Schritt und Termin gruppiert",
      "demo.board.b3": "Den Engpass erkennen, bevor er die Werkstatt stoppt",
      "demo.board.live": "Live",
      "demo.board.col.cutting": "Zuschnitt",
      "demo.board.col.edging": "Kantenanleimen",
      "demo.board.col.assembly": "Montage",
      "demo.board.col.delivery": "Lieferung",
      "demo.board.st.progress": "In Arbeit",
      "demo.board.st.done": "Fertig",
      "demo.board.st.delayed": "Verspätet",
      "demo.board.st.queued": "In Warteschlange",
      "demo.board.due": "bis",

      "demo.report.tag": "DB · Tagesbericht",
      "demo.report.h3": "Die heutige Leistung auf einen Blick",
      "demo.report.p": "Geschnittene Quadratmeter, Kantenmeter, fertige Teile — pro Schritt, pro Mitarbeiter, mit Zwei-Wochen-Trend.",
      "demo.report.b1": "m² Zuschnitt ist die Kennzahl der Säge",
      "demo.report.b2": "Aufschlüsselung pro Mitarbeiter und 14-Tage-Diagramm",
      "demo.report.b3": "Mit einem Tipp exportieren oder teilen",
      "demo.report.cut": "Heute geschnitten",
      "demo.report.edge": "Bekantet",
      "demo.report.pieces": "Teile fertig",
      "demo.report.trend": "14-Tage-Trend",

      "how.h2": "Bestellen dauert drei Minuten",
      "how.sub": "Kein Verkaufsgespräch, keine Installation. Plan wählen und Ihr Team arbeitet noch heute.",
      "how.s1.t": "Plan wählen",
      "how.s1.p": "Nesting, DB oder die ganze Suite. Monatlich oder jährlich — jederzeit wechselbar.",
      "how.s2.t": "Arbeitsbereich erstellen",
      "how.s2.p": "Firmenname, E-Mail, Passwort. Ihre 14-tägige Testphase startet sofort.",
      "how.s3.t": "Team einladen",
      "how.s3.p": "Teilen Sie den Arbeitsbereich-Code; Mitarbeiter melden sich mit Name und PIN an.",
      "how.s4.t": "Erst nach dem Test zahlen",
      "how.s4.p": "Die Karte wird nach Ende des Tests belastet — vorher kündigen und Sie zahlen nichts.",
      "how.cta": "Bestellablauf ausprobieren →",

      "quote.text": "„Wir raten nicht mehr bei Reststücken, und die Werkstatt läuft endlich auf einem Bildschirm. Es fühlt sich an wie Software, die wir uns nicht leisten könnten — zu einem unerwarteten Preis.“",
      "quote.name": "Werkstattinhaber",
      "quote.role": "Tischlerei mit 12 Personen",

      "pricing.h2": "Einfache Preise nach Bedarf",
      "pricing.sub": "Ein Werkzeug kaufen oder beide mit Rabatt. Jeder Plan — 14 Tage kostenlos.",
      "pricing.monthly": "Monatlich",
      "pricing.yearly": "Jährlich",
      "pricing.save": "–2 Monate",
      "pricing.per_month": "pro Monat",
      "pricing.per_year": "pro Jahr",
      "pricing.mo": "Mon.",
      "pricing.yr": "J.",
      "pricing.trial_short": "14 Tage gratis",
      "pricing.popular": "Am beliebtesten",
      "pricing.start": "Starten →",
      "pricing.vat": "Preise zzgl. MwSt. Zahlungen sicher über Stripe abgewickelt.",

      "final.h2": "Bereit loszulegen?",
      "final.sub": "Richten Sie in Minuten einen Arbeitsbereich ein und laden Sie Ihr Team ein.",
      "final.cta": "Plan wählen →",

      "footer.tagline": "Produktionssoftware für Möbelwerkstätten",
      "footer.account": "Mein Konto",
      "footer.pricing": "Preise",
      "footer.help": "Hilfe",
      "footer.terms": "AGB",

      "plan.nesting.name": "Nesting",
      "plan.nesting.tag": "Optimierung von Schnittplänen und ein Reststück-Lager.",
      "plan.nesting.f": ["Automatische Plattenbelegung (Nesting)", "Reststück-Lager", "Materialkostenberichte", "Unbegrenzte Zuschnittaufträge"],
      "plan.nesting.miss": ["Produktionsverwaltung (DB)", "Aufträge und Team"],
      "plan.db.name": "DB",
      "plan.db.tag": "Der ganze Produktionsablauf: Projekte, Schritte, Team.",
      "plan.db.f": ["Werkstattansicht & Produktionsschritte", "Projekte, Aufträge, Termine", "Team, PIN-Logins, Rollen", "Lager & Materialbedarf"],
      "plan.db.miss": ["Zuschnittoptimierung (Nesting)"],
      "plan.suite.name": "{brand}",
      "plan.suite.tag": "Alles in einem — Nesting + DB mit Rabatt.",
      "plan.suite.f": ["Alles aus Nesting", "Alles aus DB", "Gemeinsames Lager über beide Apps", "Priorisierter Support"],
      "plan.suite.miss": [],

      "signup.title": "Arbeitsbereich erstellen",
      "signup.sub_none": "Wählen Sie einen Plan auf der Startseite.",
      "signup.sub_plan": "Plan: {name} — Sie starten mit 14 Tagen kostenlos.",
      "signup.trial_note": "✓ 14 Tage kostenlos — Ihre Karte wird erst nach dem Test belastet.",
      "signup.change_plan": "← Plan ändern",
      "signup.company": "Firmen- / Werkstattname",
      "signup.company_ph": "z. B. Nordwind Möbel",
      "signup.email": "E-Mail (Manager-Login)",
      "signup.email_ph": "manager@firma.de",
      "signup.password": "Passwort",
      "signup.password_ph": "mindestens 6 Zeichen",
      "signup.submit": "Weiter zur Zahlung →",
      "signup.creating": "Wird erstellt…",
      "signup.terms": "Mit der Kontoerstellung stimmen Sie den Nutzungsbedingungen zu.",
      "signup.have": "Konto vorhanden?",
      "signup.err_company": "Geben Sie einen Firmennamen ein.",
      "signup.err_email": "Geben Sie eine gültige E-Mail ein.",
      "signup.err_password": "Das Passwort muss mindestens 6 Zeichen haben.",
      "signup.err_generic": "Etwas ist schiefgelaufen.",
      "signup.err_checkout": "Zahlung konnte nicht gestartet werden. Bitte erneut versuchen.",
      "signup.err_account": "Konto konnte nicht erstellt werden",
      "signup.err_workspace": "Arbeitsbereich konnte nicht erstellt werden",
      "signup.demo_badge": "Demo-Modus — keine echte Abbuchung",

      "success.h2": "Ihr Arbeitsbereich ist bereit!",
      "success.sub": "Ihre 14-tägige kostenlose Testphase hat begonnen.",
      "success.code_label": "Arbeitsbereich-Code",
      "success.share": "Teilen Sie diesen Code mit Ihrem Team — Mitarbeiter brauchen ihn zum Anmelden.",
      "success.open_db": "DB öffnen →",
      "success.open_nesting": "Nesting öffnen →",
      "success.account": "Konto & Abrechnung",
      "success.signin_note": "Melden Sie sich mit der soeben erstellten E-Mail und dem Passwort an.",
      "success.demo_note": "Dies ist eine Demo — es wurde kein Konto und keine Abbuchung erstellt.",

      "canceled.h2": "Zahlung nicht abgeschlossen",
      "canceled.sub": "Es wurde nichts abgebucht. Sie können es jederzeit erneut versuchen.",
      "canceled.back": "Zurück zu den Plänen →",
      "canceled.account": "Mein Konto",
      "canceled.help": "Brauchen Sie Hilfe?",
      "canceled.contact": "Kontakt",

      "account.signin_h2": "Anmelden",
      "account.signin_sub": "Verwalten Sie Ihr Abo und Ihre Abrechnung.",
      "account.email": "E-Mail",
      "account.password": "Passwort",
      "account.signin_btn": "Anmelden →",
      "account.signing": "Anmeldung…",
      "account.no_account": "Kein Konto?",
      "account.choose_plan": "Plan wählen",
      "account.err_creds": "Falsche E-Mail oder Passwort.",
      "account.greeting": "Willkommen 👋",
      "account.logout": "Abmelden",
      "account.no_orgs": "Sie haben noch keinen aktiven Arbeitsbereich.",
      "account.code": "Code",
      "account.manage": "Abrechnung verwalten",
      "account.next_payment": "Nächste Zahlung:",
      "account.trial_until": "Test bis:",
      "account.st.none": "Kein Abo",
      "account.st.free": "Aktiv (gratis)",
      "account.st.trialing": "Testphase",
      "account.st.active": "Aktiv",
      "account.st.past_due": "Zahlung überfällig",
      "account.st.unpaid": "Unbezahlt",
      "account.st.canceled": "Gekündigt",
      "account.st.inactive": "Inaktiv",
      "account.portal_err": "Abrechnungsportal konnte nicht geöffnet werden.",
    },

    /* ─────────────────────────── ESPAÑOL ─────────────────────────── */
    es: {
      "meta.title.home": "{brand} — software de producción para talleres de muebles",
      "meta.title.signup": "Crea tu espacio de trabajo — {brand}",
      "meta.title.success": "¡Todo listo! — {brand}",
      "meta.title.canceled": "Pago cancelado — {brand}",
      "meta.title.account": "Mi cuenta — {brand}",
      "meta.desc": "Nesting y gestión de producción para fabricantes de muebles. Corta mejor, gestiona todo el taller, empieza en minutos.",

      "nav.features": "Funciones",
      "nav.demo": "Demo en vivo",
      "nav.pricing": "Precios",
      "nav.account": "Mi cuenta",
      "nav.start": "Empezar",

      "hero.eyebrow": "Software para la fabricación de muebles",
      "hero.h1": "Del plan de corte<br>al pedido entregado.",
      "hero.lead": "{brand} une dos herramientas creadas para un taller real: <b>Nesting</b> optimiza el corte y los retales, <b>DB</b> gestiona todo el flujo de producción — proyectos, pasos y tu equipo.",
      "hero.cta1": "Prueba gratis →",
      "hero.cta2": "Cómo funciona",
      "hero.note": "14 días de prueba gratis · cancela cuando quieras · sin instalación",
      "hero.trybadge": "Demo interactiva — sin registro",

      "stats.workshops": "talleres empiezan en minutos",
      "stats.uptime": "disponibilidad, datos en la nube",
      "stats.waste": "menos desperdicio de retales de media",
      "stats.setup": "para configurar — sin IT, sin instalación",

      "features.h2": "Dos herramientas. Un espacio.",
      "features.sub": "Mismos accesos, mismo almacén, mismo equipo — en ambas apps.",
      "features.nesting.h3": "Nesting — optimización de corte",
      "features.nesting.p": "Distribución automática de piezas en tableros, almacén de retales e informes de coste de material. Menos desperdicio, más retales reutilizados.",
      "features.db.h3": "DB — gestión de producción",
      "features.db.p": "Vista de taller, pasos de producción, proyectos y pedidos, roles de equipo con acceso por PIN, seguimiento de plazos e informes.",
      "features.logins.h3": "Un solo acceso",
      "features.logins.p": "El operario entra con nombre y PIN — funciona al instante en ambas apps.",
      "features.warehouse.h3": "Almacén compartido",
      "features.warehouse.p": "Retales y tableros visibles en Nesting y DB en tiempo real.",
      "features.cloud.h3": "En la nube",
      "features.cloud.p": "Nada que instalar. Ábrelo en el navegador; los datos se sincronizan solos.",

      "demo.h2": "Mira cómo funciona",
      "demo.sub": "En vivo, en tu navegador — sin capturas. Proyectos de ejemplo, comportamiento real.",

      "demo.nesting.tag": "Nesting",
      "demo.nesting.h3": "Optimización de corte que ahorra material",
      "demo.nesting.p": "Añade tus piezas — la app las coloca en tableros con el menor desperdicio, calcula el precio y prepara los archivos para la sierra.",
      "demo.nesting.b1": "Distribución automática · eficiencia y retales en tiempo real",
      "demo.nesting.b2": "Archivos DXF / de corte para CNC y seccionadoras",
      "demo.nesting.b3": "Precio y presupuesto al cliente con un clic",
      "demo.nesting.eff": "Eficiencia del tablero",
      "demo.nesting.sheets": "Tableros",
      "demo.nesting.offcuts": "Retales ahorrados",
      "demo.nesting.parts": "Piezas colocadas",
      "demo.nesting.replay": "Repetir",

      "demo.board.tag": "DB · Producción",
      "demo.board.h3": "Todo el taller en una pantalla",
      "demo.board.p": "La vista de taller muestra cada proyecto y paso de producción — qué avanza, qué está atascado, qué está hecho.",
      "demo.board.b1": "Estado en vivo: en curso · hecho · retrasado",
      "demo.board.b2": "Proyectos agrupados por paso y plazo",
      "demo.board.b3": "Detecta el cuello de botella antes de que pare el taller",
      "demo.board.live": "En vivo",
      "demo.board.col.cutting": "Corte",
      "demo.board.col.edging": "Canteado",
      "demo.board.col.assembly": "Montaje",
      "demo.board.col.delivery": "Entrega",
      "demo.board.st.progress": "En curso",
      "demo.board.st.done": "Hecho",
      "demo.board.st.delayed": "Retrasado",
      "demo.board.st.queued": "En cola",
      "demo.board.due": "para",

      "demo.report.tag": "DB · Informe diario",
      "demo.report.h3": "La producción de hoy de un vistazo",
      "demo.report.p": "Metros cuadrados cortados, metros de canto, piezas terminadas — por paso, por operario, con tendencia de dos semanas.",
      "demo.report.b1": "Los m² cortados son el dato clave de la sierra",
      "demo.report.b2": "Desglose por operario y gráfico de 14 días",
      "demo.report.b3": "Exporta o comparte con un toque",
      "demo.report.cut": "Cortado hoy",
      "demo.report.edge": "Canteado",
      "demo.report.pieces": "Piezas hechas",
      "demo.report.trend": "Tendencia 14 días",

      "how.h2": "Contratar lleva tres minutos",
      "how.sub": "Sin llamada comercial, sin instalación. Elige un plan y tu equipo trabaja hoy mismo.",
      "how.s1.t": "Elige un plan",
      "how.s1.p": "Nesting, DB o la suite completa. Mensual o anual — cambia cuando quieras.",
      "how.s2.t": "Crea tu espacio",
      "how.s2.p": "Nombre de empresa, email, contraseña. Tu prueba de 14 días empieza al instante.",
      "how.s3.t": "Invita a tu equipo",
      "how.s3.p": "Comparte el código del espacio; los operarios entran con nombre y PIN.",
      "how.s4.t": "Paga solo tras la prueba",
      "how.s4.p": "La tarjeta se cobra al terminar la prueba — cancela antes y no pagas nada.",
      "how.cta": "Prueba el proceso de pedido →",

      "quote.text": "«Dejamos de adivinar retales y el taller por fin va en una sola pantalla. Parece software que no podríamos permitirnos — a un precio inesperado.»",
      "quote.name": "Dueño de taller",
      "quote.role": "Carpintería de 12 personas",

      "pricing.h2": "Precios simples según tu necesidad",
      "pricing.sub": "Compra una herramienta o ambas con descuento. Todos los planes — 14 días gratis.",
      "pricing.monthly": "Mensual",
      "pricing.yearly": "Anual",
      "pricing.save": "–2 meses",
      "pricing.per_month": "al mes",
      "pricing.per_year": "al año",
      "pricing.mo": "mes",
      "pricing.yr": "año",
      "pricing.trial_short": "14 días gratis",
      "pricing.popular": "Más popular",
      "pricing.start": "Empezar →",
      "pricing.vat": "Precios sin IVA. Pagos procesados de forma segura por Stripe.",

      "final.h2": "¿Listo para empezar?",
      "final.sub": "Crea un espacio de trabajo en minutos e invita a tu equipo.",
      "final.cta": "Elegir un plan →",

      "footer.tagline": "Software de producción para talleres de muebles",
      "footer.account": "Mi cuenta",
      "footer.pricing": "Precios",
      "footer.help": "Ayuda",
      "footer.terms": "Términos",

      "plan.nesting.name": "Nesting",
      "plan.nesting.tag": "Optimización de planes de corte y almacén de retales.",
      "plan.nesting.f": ["Distribución automática en tableros (nesting)", "Almacén de retales", "Informes de coste de material", "Trabajos de corte ilimitados"],
      "plan.nesting.miss": ["Gestión de producción (DB)", "Pedidos y equipo"],
      "plan.db.name": "DB",
      "plan.db.tag": "Todo el flujo de producción: proyectos, pasos, equipo.",
      "plan.db.f": ["Vista de taller y pasos de producción", "Proyectos, pedidos, plazos", "Equipo, accesos por PIN, roles", "Almacén y necesidades de material"],
      "plan.db.miss": ["Optimización de corte (Nesting)"],
      "plan.suite.name": "{brand}",
      "plan.suite.tag": "Todo en uno — Nesting + DB con descuento.",
      "plan.suite.f": ["Todo lo de Nesting", "Todo lo de DB", "Almacén compartido entre ambas apps", "Soporte prioritario"],
      "plan.suite.miss": [],

      "signup.title": "Crea tu espacio de trabajo",
      "signup.sub_none": "Elige un plan en la página de inicio.",
      "signup.sub_plan": "Plan: {name} — empiezas con 14 días de prueba gratis.",
      "signup.trial_note": "✓ 14 días de prueba gratis — tu tarjeta se cobra solo tras la prueba.",
      "signup.change_plan": "← Cambiar plan",
      "signup.company": "Nombre de empresa / taller",
      "signup.company_ph": "p. ej. Muebles Nortia",
      "signup.email": "Email (acceso del responsable)",
      "signup.email_ph": "responsable@empresa.com",
      "signup.password": "Contraseña",
      "signup.password_ph": "al menos 6 caracteres",
      "signup.submit": "Continuar al pago →",
      "signup.creating": "Creando…",
      "signup.terms": "Al crear una cuenta aceptas las condiciones del servicio.",
      "signup.have": "¿Ya tienes cuenta?",
      "signup.err_company": "Introduce un nombre de empresa.",
      "signup.err_email": "Introduce un email válido.",
      "signup.err_password": "La contraseña debe tener al menos 6 caracteres.",
      "signup.err_generic": "Algo salió mal.",
      "signup.err_checkout": "No se pudo iniciar el pago. Inténtalo de nuevo.",
      "signup.err_account": "No se pudo crear la cuenta",
      "signup.err_workspace": "No se pudo crear el espacio de trabajo",
      "signup.demo_badge": "Modo demo — sin cargo real",

      "success.h2": "¡Tu espacio está listo!",
      "success.sub": "Tu prueba gratuita de 14 días ha comenzado.",
      "success.code_label": "Código del espacio",
      "success.share": "Comparte este código con tu equipo — los operarios lo necesitan para entrar.",
      "success.open_db": "Abrir DB →",
      "success.open_nesting": "Abrir Nesting →",
      "success.account": "Mi cuenta y facturación",
      "success.signin_note": "Entra con el email y la contraseña que acabas de crear.",
      "success.demo_note": "Esto es una demo — no se creó ninguna cuenta ni cargo.",

      "canceled.h2": "Pago no completado",
      "canceled.sub": "No se cobró nada. Puedes intentarlo de nuevo cuando quieras.",
      "canceled.back": "Volver a los planes →",
      "canceled.account": "Mi cuenta",
      "canceled.help": "¿Necesitas ayuda?",
      "canceled.contact": "Contáctanos",

      "account.signin_h2": "Iniciar sesión",
      "account.signin_sub": "Gestiona tu suscripción y facturación.",
      "account.email": "Email",
      "account.password": "Contraseña",
      "account.signin_btn": "Entrar →",
      "account.signing": "Entrando…",
      "account.no_account": "¿Sin cuenta?",
      "account.choose_plan": "Elegir un plan",
      "account.err_creds": "Email o contraseña incorrectos.",
      "account.greeting": "Bienvenido 👋",
      "account.logout": "Cerrar sesión",
      "account.no_orgs": "Aún no tienes un espacio de trabajo activo.",
      "account.code": "Código",
      "account.manage": "Gestionar facturación",
      "account.next_payment": "Próximo pago:",
      "account.trial_until": "Prueba hasta:",
      "account.st.none": "Sin suscripción",
      "account.st.free": "Activa (gratis)",
      "account.st.trialing": "Prueba",
      "account.st.active": "Activa",
      "account.st.past_due": "Pago pendiente",
      "account.st.unpaid": "Sin pagar",
      "account.st.canceled": "Cancelada",
      "account.st.inactive": "Inactiva",
      "account.portal_err": "No se pudo abrir el portal de facturación.",
    },
  };

  /* ── competitor comparison (added separately to keep the blocks above tidy) ── */
  Object.assign(DICT.en, {
    "compare.h2": "Why workshops switch to {brand}",
    "compare.sub": "How {brand} stacks up against the usual alternatives.",
    "compare.col.you": "{brand}", "compare.col.sheets": "Spreadsheets & chat",
    "compare.col.nesting": "Nesting-only tools", "compare.col.erp": "Generic ERP / MRP",
    "compare.r.nesting": "Cutting optimization (nesting)",
    "compare.r.floor": "Shop-floor & production tracking",
    "compare.r.pin": "Worker name + PIN login",
    "compare.r.furniture": "Built for furniture makers",
    "compare.r.cloud": "Cloud — nothing to install",
    "compare.r.setup": "Time to get running", "compare.r.price": "Typical cost",
    "compare.v.setup.you": "Minutes", "compare.v.setup.sheets": "Instant",
    "compare.v.setup.nesting": "Days", "compare.v.setup.erp": "Weeks–months",
    "compare.v.price.you": "€39–69/mo", "compare.v.price.sheets": "Low",
    "compare.v.price.nesting": "€€", "compare.v.price.erp": "€€€€",
    "compare.foot": "Compared as market categories, not specific products.",
    "compare.legend": "✓ Full · ~ Partial · ✕ None",
  });
  Object.assign(DICT.lt, {
    "compare.h2": "Kodėl cechai renkasi {brand}",
    "compare.sub": "Kaip {brand} atrodo šalia įprastų alternatyvų.",
    "compare.col.you": "{brand}", "compare.col.sheets": "Skaičiuoklės ir žinutės",
    "compare.col.nesting": "Tik pjovimo programos", "compare.col.erp": "Bendra ERP / MRP",
    "compare.r.nesting": "Pjovimo optimizacija (nesting)",
    "compare.r.floor": "Cecho ir gamybos valdymas",
    "compare.r.pin": "Darbuotojo vardas + PIN",
    "compare.r.furniture": "Sukurta baldų gamintojams",
    "compare.r.cloud": "Debesyje — nieko diegti",
    "compare.r.setup": "Paleidimo laikas", "compare.r.price": "Įprasta kaina",
    "compare.v.setup.you": "Minutės", "compare.v.setup.sheets": "Iš karto",
    "compare.v.setup.nesting": "Dienos", "compare.v.setup.erp": "Savaitės–mėnesiai",
    "compare.v.price.you": "€39–69/mėn.", "compare.v.price.sheets": "Maža",
    "compare.v.price.nesting": "€€", "compare.v.price.erp": "€€€€",
    "compare.foot": "Lyginama pagal rinkos kategorijas, ne konkrečius produktus.",
    "compare.legend": "✓ Pilnai · ~ Iš dalies · ✕ Nėra",
  });
  Object.assign(DICT.de, {
    "compare.h2": "Warum Werkstätten zu {brand} wechseln",
    "compare.sub": "Wie sich {brand} gegen die üblichen Alternativen schlägt.",
    "compare.col.you": "{brand}", "compare.col.sheets": "Tabellen & Chat",
    "compare.col.nesting": "Reine Nesting-Tools", "compare.col.erp": "Generisches ERP / MRP",
    "compare.r.nesting": "Zuschnittoptimierung (Nesting)",
    "compare.r.floor": "Werkstatt- & Produktionssteuerung",
    "compare.r.pin": "Mitarbeiter: Name + PIN",
    "compare.r.furniture": "Für Möbelhersteller gemacht",
    "compare.r.cloud": "Cloud — nichts zu installieren",
    "compare.r.setup": "Startzeit", "compare.r.price": "Typische Kosten",
    "compare.v.setup.you": "Minuten", "compare.v.setup.sheets": "Sofort",
    "compare.v.setup.nesting": "Tage", "compare.v.setup.erp": "Wochen–Monate",
    "compare.v.price.you": "39–69 €/Mon.", "compare.v.price.sheets": "Gering",
    "compare.v.price.nesting": "€€", "compare.v.price.erp": "€€€€",
    "compare.foot": "Verglichen als Marktkategorien, nicht als konkrete Produkte.",
    "compare.legend": "✓ Voll · ~ Teilweise · ✕ Nein",
  });
  Object.assign(DICT.es, {
    "compare.h2": "Por qué los talleres eligen {brand}",
    "compare.sub": "Cómo se compara {brand} con las alternativas habituales.",
    "compare.col.you": "{brand}", "compare.col.sheets": "Hojas de cálculo y chat",
    "compare.col.nesting": "Solo software de corte", "compare.col.erp": "ERP / MRP genérico",
    "compare.r.nesting": "Optimización de corte (nesting)",
    "compare.r.floor": "Gestión de taller y producción",
    "compare.r.pin": "Operario: nombre + PIN",
    "compare.r.furniture": "Hecho para fabricantes de muebles",
    "compare.r.cloud": "En la nube — sin instalar",
    "compare.r.setup": "Tiempo de puesta en marcha", "compare.r.price": "Coste típico",
    "compare.v.setup.you": "Minutos", "compare.v.setup.sheets": "Al instante",
    "compare.v.setup.nesting": "Días", "compare.v.setup.erp": "Semanas–meses",
    "compare.v.price.you": "39–69 €/mes", "compare.v.price.sheets": "Bajo",
    "compare.v.price.nesting": "€€", "compare.v.price.erp": "€€€€",
    "compare.foot": "Comparado por categorías de mercado, no productos concretos.",
    "compare.legend": "✓ Completo · ~ Parcial · ✕ No",
  });

  var STORE_KEY = "fabsuite_lang";
  function detect() {
    try {
      var saved = localStorage.getItem(STORE_KEY);
      if (saved && DICT[saved]) return saved;
    } catch (e) {}
    var nav = (g.navigator.languages || [g.navigator.language || "en"]);
    for (var i = 0; i < nav.length; i++) {
      var code = String(nav[i]).slice(0, 2).toLowerCase();
      if (DICT[code]) return code;
    }
    return "en";
  }

  var current = detect();

  function fill(str) {
    return typeof str === "string" ? str.replace(/\{brand\}/g, BRAND) : str;
  }
  function t(key, vars) {
    var d = DICT[current] || DICT.en;
    var s = d[key];
    if (s == null) s = DICT.en[key];
    if (s == null) return key;
    s = fill(s);
    if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return s;
  }
  function tList(key) {
    var d = DICT[current] || DICT.en;
    var a = d[key] || DICT.en[key] || [];
    return a.map(fill);
  }

  function apply(root) {
    root = root || g.document;
    root.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    root.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      el.innerHTML = t(el.getAttribute("data-i18n-html"));
    });
    root.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph")));
    });
    var titleEl = g.document.querySelector("title[data-i18n-title]");
    if (titleEl) g.document.title = t(titleEl.getAttribute("data-i18n-title"));
    var descEl = g.document.querySelector('meta[name="description"]');
    if (descEl && descEl.hasAttribute("data-i18n-content")) descEl.setAttribute("content", t(descEl.getAttribute("data-i18n-content")));
    g.document.documentElement.setAttribute("lang", current);
    // let page-specific code re-render (plans, dashboards…)
    g.document.dispatchEvent(new CustomEvent("i18n:changed", { detail: { lang: current } }));
  }

  function setLang(code) {
    if (!DICT[code]) return;
    current = code;
    try { localStorage.setItem(STORE_KEY, code); } catch (e) {}
    apply();
    syncSwitcher();
  }

  /* Language switcher — a compact dropdown injected into any [data-lang-switch]. */
  function syncSwitcher() {
    g.document.querySelectorAll("[data-lang-current]").forEach(function (el) {
      var l = LANGS.filter(function (x) { return x.code === current; })[0] || LANGS[0];
      el.textContent = l.code.toUpperCase();
    });
    g.document.querySelectorAll("[data-lang-opt]").forEach(function (el) {
      el.setAttribute("aria-selected", el.getAttribute("data-lang-opt") === current ? "true" : "false");
    });
  }
  function mountSwitchers() {
    g.document.querySelectorAll("[data-lang-switch]").forEach(function (host) {
      if (host.__mounted) return; host.__mounted = true;
      var opts = LANGS.map(function (l) {
        return '<button role="option" data-lang-opt="' + l.code + '">' + l.flag + " " + l.label + "</button>";
      }).join("");
      host.innerHTML =
        '<button class="lang-btn" type="button" aria-haspopup="listbox">🌐 <span data-lang-current></span> ▾</button>' +
        '<div class="lang-menu" role="listbox">' + opts + "</div>";
      var btn = host.querySelector(".lang-btn");
      var menu = host.querySelector(".lang-menu");
      btn.addEventListener("click", function (e) { e.stopPropagation(); host.classList.toggle("open"); });
      menu.querySelectorAll("[data-lang-opt]").forEach(function (b) {
        b.addEventListener("click", function () { host.classList.remove("open"); setLang(b.getAttribute("data-lang-opt")); });
      });
      g.document.addEventListener("click", function () { host.classList.remove("open"); });
    });
    syncSwitcher();
  }

  g.I18N = {
    langs: LANGS, t: t, tList: tList, apply: apply, setLang: setLang,
    get lang() { return current; }, mountSwitchers: mountSwitchers,
  };

  g.document.addEventListener("DOMContentLoaded", function () {
    mountSwitchers();
    apply();
  });
})(window);

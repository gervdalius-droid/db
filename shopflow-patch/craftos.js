/* ════════════════════════════════════════════════════════════════════════════
 * CraftOS productizer for ShopFlow — the suite's DB (production) app.
 * ────────────────────────────────────────────────────────────────────────────
 * ShopFlow (repo `shopflow`) is a complete production-management app that keeps
 * its whole state in localStorage, with an optional cloud sync configured by
 * hand: one Supabase account per shop, one `workspaces` row, a shared shop
 * password typed into a gate. To sell it as the CraftOS DB app it needs five
 * things it does not have on its own:
 *
 *   1. a CraftOS login, so each customer's workshop is a separate workspace;
 *   2. the subscription gate (app code 'db');
 *   3. cloud storage namespaced by workspace instead of hand-configured;
 *   4. a clean workshop on first run — not the demo shop's fake team and
 *      fake orders, with PINs anyone can read in the README;
 *   5. the hand-offs: in from CRM and Offer, out to Nesting and Invoices,
 *      and the shared warehouse Nesting reads.
 *
 * This file adds all five WITHOUT editing the app. ShopFlow already renders a
 * cloud gate before its own profile picker — `Sync.needsGate()` → `gateHtml()`
 * → `bindGate()` — so the CraftOS login lands in that slot and looks native.
 * The seams it overrides:
 *
 *   Sync.needsGate()  no shop password yet   →  no CraftOS session yet
 *   Sync.gateHtml()   shop-password field    →  manager / team member / local
 *   Sync.push/pull()  `workspaces` row       →  fabflow row fab_<WS>_shopflow
 *   Sync.login()      shared shop account    →  the signed-in user's own account
 *
 * The whole state stays ONE document per workspace, exactly as upstream, so
 * 0005's row-level security already covers it: the key carries the workspace
 * code and a customer can only touch keys for workspaces they belong to.
 *
 * Who signs in, and why it is two layers:
 *   • the DEVICE is signed in to the workspace once (manager email+password, or
 *     a worker's own CraftOS login) — that is the tenant boundary, enforced by
 *     RLS on the row key;
 *   • WHO IS AT THE MACHINE is ShopFlow's own profile picker + 4-digit PIN —
 *     unchanged, because that is the right UX for a shared shopfloor tablet.
 *
 * A trap worth naming: ShopFlow declares `App`, `Store`, `Sync`, `D`, `M`,
 * `Toast` and `Drawer` with `const`. Those are lexical globals — real bindings
 * in the script realm, but NOT properties of `window` — so they are referenced
 * here by bare name. `window.App` is undefined.
 *
 * Load order in the product build (see scripts/build-product.sh):
 *   <script src="config.js">        → window.FAB_CONFIG
 *   … the whole ShopFlow app …
 *   <script src="shared/fabsuite-license.js">
 *   <script src="craftos.js">       → this file
 * ════════════════════════════════════════════════════════════════════════════ */
(function (global) {
  "use strict";

  var CFG = global.FAB_CONFIG || {};
  var SB_URL = (CFG.SUPABASE_URL || "").replace(/\/+$/, "");
  var SB_KEY = CFG.SUPABASE_ANON_KEY || "";
  var BRAND = CFG.BRAND_NAME || "CraftOS";
  var APP_CODE = CFG.APP_CODE || "db";
  var PAYWALL = !!CFG.PAYWALL_ENABLED;
  var FABSUITE_URL = (CFG.FABSUITE_URL || "").replace(/\/+$/, "");
  var SUPPORT_EMAIL = CFG.SUPPORT_EMAIL || "";
  var AUTH_DOMAIN = CFG.AUTH_DOMAIN || "dedesbaldai.lt";
  var WORKSHOP_CODE = CFG.WORKSHOP_CODE || "gvs";
  var WORKER_SCOPE = CFG.WORKER_EMAIL_SCOPE || "workshop";
  var CRM_URL = (CFG.CRM_URL || "").replace(/\/+$/, "");
  var OFFER_URL = (CFG.OFFER_URL || "").replace(/\/+$/, "");
  var NESTING_URL = (CFG.NESTING_URL || "").replace(/\/+$/, "");
  var INVOICES_URL = (CFG.INVOICES_URL || "").replace(/\/+$/, "");
  var PIN_LEN = 4, PIN_SALT = "_dedes";
  var LS_TOK = "craftos_shop_tok";
  var LS_WS = "craftos_shop_ws";        // which workspace this browser last held
  var SF_KEY = "shopflow.v1";           // the app's own localStorage key

  var WS = "", TOKEN = null, REFRESH = null, TOK_EXP = 0, ME = "", LOCAL_ONLY = false;
  var POLL = null, LAST_SEEN = null, PUSHING = false;

  // No backend configured → leave ShopFlow exactly as it is.
  if (!SB_URL || !SB_KEY) { brand(); return; }

  /* ── i18n — the four languages the suite ships ─────────────────────────── */
  function lang() {
    var v = "";
    try { v = localStorage.getItem("fab_lang") || localStorage.getItem("shopflow.lang") || ""; } catch (e) {}
    if (TX[v]) return v;
    var b = String((navigator.language || "")).toLowerCase();
    if (b.indexOf("lt") === 0) return "lt";
    if (b.indexOf("de") === 0) return "de";
    if (b.indexOf("es") === 0) return "es";
    return "en";
  }
  var TX = {
    lt: { signIn: "Prisijunkite prie darbo vietos", ws: "Darbo vietos kodas", name: "Vardas",
          pin: "PIN", email: "El. paštas", pw: "Slaptažodis", go: "Prisijungti",
          tabMgr: "Vadovas", tabWork: "Darbuotojas", tabLocal: "Tik ši naršyklė",
          localNote: "Dirbkite be prisijungimo — duomenys liks tik šioje naršyklėje.",
          localGo: "Tęsti be prisijungimo",
          bad: "Neteisingas el. paštas arba slaptažodis.", badPin: "Neteisingas vardas arba PIN.",
          needPin: "Įveskite 4 skaitmenų PIN.", needWs: "Įveskite darbo vietos kodą.",
          noWs: "Šiai paskyrai nepriskirta darbo vieta.",
          out: "Atsijungti", localMode: "Lokalus režimas",
          setupTitle: "Paruoškime jūsų cechą", setupSub: "Sukurkite vadovo profilį — juo prisijungsite prie ShopFlow.",
          setupName: "Jūsų vardas", setupPin: "4 skaitmenų PIN", setupGo: "Sukurti cechą",
          setupPinHint: "Šiuo PIN prisijungsite prie savo cecho. Komandą pridėsite skiltyje „Komanda“.",
          fromCrm: "Perimta iš CRM", fromOffer: "Perimta iš Offer",
          toNesting: "Į pjovimą", toInvoice: "Išrašyti sąskaitą",
          onlyManager: "Užsakymą sukurti gali vadovas.",
          otherWs: "Duomenys priklauso kitai darbo vietai" },
    en: { signIn: "Sign in to your workspace", ws: "Workspace code", name: "Name",
          pin: "PIN", email: "Email", pw: "Password", go: "Sign in",
          tabMgr: "Manager", tabWork: "Team member", tabLocal: "This browser only",
          localNote: "Work without signing in — data stays in this browser.",
          localGo: "Continue without signing in",
          bad: "Wrong email or password.", badPin: "Wrong name or PIN.",
          needPin: "Enter your 4-digit PIN.", needWs: "Enter your workspace code.",
          noWs: "This account has no workspace yet.",
          out: "Sign out", localMode: "Local mode",
          setupTitle: "Let's set up your workshop", setupSub: "Create your manager profile — you'll sign in to ShopFlow with it.",
          setupName: "Your name", setupPin: "4-digit PIN", setupGo: "Create workshop",
          setupPinHint: "This PIN signs you in to your workshop. Add the rest of your team under Team.",
          fromCrm: "Handed over from CRM", fromOffer: "Handed over from Offer",
          toNesting: "To cutting", toInvoice: "Invoice this",
          onlyManager: "Only a manager can create an order.",
          otherWs: "That data belongs to another workspace" },
    de: { signIn: "Bei Ihrem Arbeitsbereich anmelden", ws: "Arbeitsbereich-Code", name: "Name",
          pin: "PIN", email: "E-Mail", pw: "Passwort", go: "Anmelden",
          tabMgr: "Leitung", tabWork: "Mitarbeiter", tabLocal: "Nur dieser Browser",
          localNote: "Ohne Anmeldung arbeiten — Daten bleiben in diesem Browser.",
          localGo: "Ohne Anmeldung fortfahren",
          bad: "Falsche E-Mail oder falsches Passwort.", badPin: "Falscher Name oder falsche PIN.",
          needPin: "Geben Sie Ihre 4-stellige PIN ein.", needWs: "Geben Sie Ihren Arbeitsbereich-Code ein.",
          noWs: "Dieses Konto hat noch keinen Arbeitsbereich.",
          out: "Abmelden", localMode: "Lokaler Modus",
          setupTitle: "Richten wir Ihre Werkstatt ein", setupSub: "Legen Sie Ihr Leitungsprofil an — damit melden Sie sich in ShopFlow an.",
          setupName: "Ihr Name", setupPin: "4-stellige PIN", setupGo: "Werkstatt anlegen",
          setupPinHint: "Mit dieser PIN melden Sie sich in Ihrer Werkstatt an. Das Team fügen Sie unter Team hinzu.",
          fromCrm: "Übernommen aus CRM", fromOffer: "Übernommen aus Offer",
          toNesting: "Zum Zuschnitt", toInvoice: "Rechnung schreiben",
          onlyManager: "Nur die Leitung kann einen Auftrag anlegen.",
          otherWs: "Diese Daten gehören zu einem anderen Arbeitsbereich" },
    es: { signIn: "Entra en tu espacio de trabajo", ws: "Código del espacio", name: "Nombre",
          pin: "PIN", email: "Email", pw: "Contraseña", go: "Entrar",
          tabMgr: "Responsable", tabWork: "Miembro del equipo", tabLocal: "Solo este navegador",
          localNote: "Trabaja sin iniciar sesión — los datos se quedan en este navegador.",
          localGo: "Continuar sin iniciar sesión",
          bad: "Email o contraseña incorrectos.", badPin: "Nombre o PIN incorrectos.",
          needPin: "Introduce tu PIN de 4 dígitos.", needWs: "Introduce el código del espacio.",
          noWs: "Esta cuenta aún no tiene espacio de trabajo.",
          out: "Salir", localMode: "Modo local",
          setupTitle: "Vamos a configurar tu taller", setupSub: "Crea tu perfil de responsable — con él entrarás en ShopFlow.",
          setupName: "Tu nombre", setupPin: "PIN de 4 dígitos", setupGo: "Crear taller",
          setupPinHint: "Con este PIN entrarás en tu taller. Añade al resto del equipo en Equipo.",
          fromCrm: "Recibido de CRM", fromOffer: "Recibido de Offer",
          toNesting: "A corte", toInvoice: "Facturar",
          onlyManager: "Solo un responsable puede crear un pedido.",
          otherWs: "Esos datos pertenecen a otro espacio de trabajo" }
  };
  function t(k) { return (TX[lang()] || TX.en)[k] || TX.en[k] || k; }
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function slug(s) {
    var m = { "ą": "a", "č": "c", "ę": "e", "ė": "e", "į": "i", "š": "s", "ų": "u", "ū": "u", "ž": "z" };
    return String(s || "").trim().toLowerCase().replace(/[ąčęėįšųūž]/g, function (c) { return m[c] || c; })
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  /* ── auth ──────────────────────────────────────────────────────────────── */
  function headers() {
    return { apikey: SB_KEY, Authorization: "Bearer " + (TOKEN || SB_KEY),
             "Content-Type": "application/json" };
  }
  async function password(email, pw) {
    var r = await fetch(SB_URL + "/auth/v1/token?grant_type=password", {
      method: "POST", headers: { apikey: SB_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: pw }) });
    return r.json();
  }
  async function refreshTok(rt) {
    var r = await fetch(SB_URL + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST", headers: { apikey: SB_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: rt }) });
    return r.json();
  }
  function saveTok() {
    try { localStorage.setItem(LS_TOK, JSON.stringify(
      { a: TOKEN, r: REFRESH, e: TOK_EXP, ws: WS, n: ME })); } catch (e) {}
  }
  function clearTok() { try { localStorage.removeItem(LS_TOK); } catch (e) {} }
  async function ensureFresh() {
    if (LOCAL_ONLY || !REFRESH) return;
    if (!TOK_EXP || TOK_EXP > Date.now() + 60000) return;
    var d = await refreshTok(REFRESH).catch(function () { return {}; });
    if (d.access_token) {
      TOKEN = d.access_token; REFRESH = d.refresh_token || REFRESH;
      TOK_EXP = Date.now() + ((d.expires_in || 3600) * 1000); saveTok();
    }
  }
  async function workspaceOfUser(uid) {
    try {
      var r = await fetch(SB_URL + "/rest/v1/fabflow?key=eq.fab_admin_" + encodeURIComponent(uid) +
        "&select=value", { headers: headers() });
      if (!r.ok) return null;
      var rows = await r.json();
      if (!rows.length) return null;
      var p = JSON.parse(rows[0].value || "null");
      return p && p.workspaceCode
        ? { code: String(p.workspaceCode).toUpperCase(), name: p.name || "" } : null;
    } catch (e) { return null; }
  }
  setInterval(function () { ensureFresh(); }, 60000);

  /* ── workspace-scoped storage over the shared `fabflow` table ────────────
   * Upstream keeps the whole shop as one row; so do we. The row's KEY carries
   * the workspace code, which is what the RLS policy reads.
   * ──────────────────────────────────────────────────────────────────────── */
  function rowKey() { return "fab_" + WS + "_shopflow"; }

  async function fetchRow() {
    await ensureFresh();
    var r = await fetch(SB_URL + "/rest/v1/fabflow?key=eq." + encodeURIComponent(rowKey()) +
                        "&select=key,value,updated_at", { headers: headers() });
    if (!r.ok) throw new Error("HTTP " + r.status + " " + (await r.text()).slice(0, 160));
    var rows = await r.json();
    if (!rows.length) return null;
    var data = null;
    try { data = JSON.parse(rows[0].value || "null"); } catch (e) { data = null; }
    // A row we cannot parse is worse than no row: adopting {} would wipe the
    // shop. Refuse, and let the sync badge show the error.
    if (!data) throw new Error("stored workshop document is unreadable");
    return { data: data, updated_at: rows[0].updated_at };
  }
  async function putRow() {
    await ensureFresh();
    var now = new Date().toISOString();
    var r = await fetch(SB_URL + "/rest/v1/fabflow?on_conflict=key", {
      method: "POST",
      headers: Object.assign(headers(), { Prefer: "resolution=merge-duplicates,return=representation" }),
      body: JSON.stringify({ key: rowKey(), value: JSON.stringify(Store.state), updated_at: now })
    });
    if (!r.ok) throw new Error("HTTP " + r.status + " " + (await r.text()).slice(0, 160));
    var rows = await r.json().catch(function () { return []; });
    LAST_SEEN = (rows && rows[0] && rows[0].updated_at) || now;
  }

  function installSyncOverrides() {
    var S = Sync;
    if (!S) { console.warn("[CraftOS] ShopFlow exposes no Sync object"); return false; }

    S.configured = function () { return true; };
    S.needsGate = function () { return !LOCAL_ONLY && !(WS && TOKEN); };
    S.gateHtml = gateHtml;
    S.bindGate = bindGate;
    S.login = async function () { return false; };   // the gate owns sign-in now
    S.logout = function () { clearTok(); location.reload(); };

    S.push = async function () {
      if (LOCAL_ONLY || !WS || !TOKEN || PUSHING) return;
      PUSHING = true;
      try { await putRow(); S.status = "live"; S.msg = ""; }
      catch (e) { S.status = "error"; console.warn("[CraftOS] push:", e && e.message); }
      finally { PUSHING = false; S.paint && S.paint(); }
    };
    S.pull = async function () {
      if (LOCAL_ONLY || !WS || !TOKEN) return;
      try {
        var row = await fetchRow();
        if (row && row.updated_at !== LAST_SEEN) {
          LAST_SEEN = row.updated_at;
          S._applyRemote(row.data);
        }
      } catch (e) { S.status = "error"; console.warn("[CraftOS] pull:", e && e.message); S.paint && S.paint(); }
    };
    // No Supabase SDK here, so no realtime channel: poll while the tab is
    // visible. A workshop board is watched, not read once, so this is the
    // difference between "live" and "stale" on the shopfloor screen.
    S.startPolling = function () {
      clearInterval(POLL);
      POLL = setInterval(function () {
        if (document.hidden || PUSHING) return;
        S.pull();
      }, 15000);
    };
    return true;
  }

  /* ── the gate: CraftOS login, rendered in ShopFlow's own login styles ──── */
  var tab = "mgr", pinBuf = "";
  function gateHtml() {
    function pane(id, body) {
      return '<div class="cos-pane' + (tab === id ? " on" : "") + '" data-pane="' + id + '">' + body + "</div>";
    }
    return '<div class="login-screen"><div class="pin-stage" style="gap:4px">' +
      '<div class="login-logo">' +
        '<img src="shared/craftos-icon.png" alt="" style="height:54px;border-radius:14px;background:#fff;padding:5px;box-sizing:border-box">' +
        "<h1>" + esc(BRAND) + "</h1>" +
        "<p>" + esc(t("signIn")) + "</p></div>" +
      '<div class="cos-tabs">' +
        '<button data-tab="mgr" class="' + (tab === "mgr" ? "on" : "") + '">' + esc(t("tabMgr")) + "</button>" +
        '<button data-tab="work" class="' + (tab === "work" ? "on" : "") + '">' + esc(t("tabWork")) + "</button>" +
        '<button data-tab="local" class="' + (tab === "local" ? "on" : "") + '">' + esc(t("tabLocal")) + "</button>" +
      "</div>" +
      pane("mgr",
        '<div class="field"><input class="input" id="cos-email" type="email" autocomplete="username" placeholder="' + esc(t("email")) + '"></div>' +
        '<div class="field"><input class="input" id="cos-pw" type="password" autocomplete="current-password" placeholder="' + esc(t("pw")) + '"></div>' +
        '<button class="btn primary xl cos-go" id="cos-go-mgr">' + esc(t("go")) + "</button>") +
      pane("work",
        '<div class="field"><input class="input" id="cos-ws" placeholder="' + esc(t("ws")) + '" style="text-transform:uppercase;letter-spacing:.08em"></div>' +
        '<div class="field"><input class="input" id="cos-name" autocomplete="name" placeholder="' + esc(t("name")) + '"></div>' +
        '<div class="field"><input class="input" id="cos-pin" type="password" inputmode="numeric" maxlength="' + PIN_LEN + '" placeholder="' + esc(t("pin")) + '"></div>' +
        '<button class="btn primary xl cos-go" id="cos-go-work">' + esc(t("go")) + "</button>") +
      pane("local",
        '<p class="t-caption" style="max-width:300px;text-align:center;line-height:1.6">' + esc(t("localNote")) + "</p>" +
        '<button class="btn xl cos-go" id="cos-go-local">' + esc(t("localGo")) + "</button>") +
      '<div class="t-caption" id="cos-err" style="color:var(--red);min-height:18px;margin-top:10px;max-width:300px;text-align:center"></div>' +
      (FABSUITE_URL
        ? '<div class="t-caption" style="margin-top:14px"><a href="' + esc(FABSUITE_URL) +
          '/index.html#pricing" style="color:var(--accent)">' + esc(BRAND) + "</a></div>"
        : "") +
      "</div></div>";
  }
  function gateStyle() {
    if (document.getElementById("cos-style")) return;
    var s = document.createElement("style");
    s.id = "cos-style";
    s.textContent = [
      ".cos-tabs{display:flex;gap:4px;background:var(--surface-2,rgba(128,128,128,.12));padding:4px;",
      "border-radius:10px;margin:14px 0 10px;width:300px}",
      ".cos-tabs button{flex:1;padding:8px 6px;border:0;border-radius:7px;background:none;color:var(--text-2,#888);",
      "font:inherit;font-size:12.5px;font-weight:600;cursor:pointer}",
      ".cos-tabs button.on{background:var(--accent,#0071e3);color:#fff}",
      ".cos-pane{display:none;width:300px}.cos-pane.on{display:block}",
      ".cos-pane .field{width:300px;margin-bottom:8px}",
      ".cos-go{width:300px;margin-top:6px}",
      "#cos-bar{display:inline-flex;align-items:center;gap:10px;font-size:11.5px;color:var(--text-2,#888)}",
      "#cos-bar b{color:var(--text,#eee);font-family:ui-monospace,Menlo,Consolas,monospace}",
      "#cos-bar a{color:var(--text-2,#888);text-decoration:none;white-space:nowrap}",
      "#cos-bar a:hover{color:var(--accent,#0071e3)}"
    ].join("");
    document.head.appendChild(s);
  }
  function gateErr(msg) {
    var e = document.getElementById("cos-err"); if (e) e.textContent = msg || "";
  }
  function bindGate(root) {
    gateStyle();
    var $ = function (sel) { return (root || document).querySelector(sel); };
    (root || document).querySelectorAll(".cos-tabs button").forEach(function (b) {
      b.onclick = function () { tab = b.getAttribute("data-tab"); App.render(); };
    });
    var mgr = $("#cos-go-mgr"); if (mgr) mgr.onclick = loginManager;
    var wrk = $("#cos-go-work"); if (wrk) wrk.onclick = loginWorker;
    var loc = $("#cos-go-local");
    if (loc) loc.onclick = function () {
      LOCAL_ONLY = true; WS = ""; ME = "";
      if (Sync) Sync.status = "off";
      App.render();
      afterSignIn();
    };
    ["#cos-email", "#cos-pw"].forEach(function (sel) {
      var e = $(sel); if (e) e.onkeydown = function (ev) { if (ev.key === "Enter") loginManager(); };
    });
    ["#cos-ws", "#cos-name", "#cos-pin"].forEach(function (sel) {
      var e = $(sel); if (e) e.onkeydown = function (ev) { if (ev.key === "Enter") loginWorker(); };
    });
    setTimeout(function () { var f = $(tab === "work" ? "#cos-ws" : "#cos-email"); if (f) f.focus(); }, 60);
  }

  async function loginManager() {
    var btn = document.getElementById("cos-go-mgr");
    var email = (document.getElementById("cos-email").value || "").trim();
    var pw = document.getElementById("cos-pw").value || "";
    if (!email || !pw) return;
    btn.disabled = true; gateErr("");
    try {
      var d = await password(email, pw);
      if (!d.access_token) { gateErr(t("bad")); btn.disabled = false; return; }
      TOKEN = d.access_token; REFRESH = d.refresh_token;
      TOK_EXP = Date.now() + ((d.expires_in || 3600) * 1000);
      var prof = await workspaceOfUser((d.user && d.user.id) || "");
      if (!prof) { TOKEN = null; gateErr(t("noWs")); btn.disabled = false; return; }
      WS = prof.code; ME = prof.name || email.split("@")[0];
      saveTok();
      if (!(await runGate())) return;
      await afterSignIn();
    } catch (e) { gateErr(String((e && e.message) || e)); btn.disabled = false; }
  }
  async function loginWorker() {
    var btn = document.getElementById("cos-go-work");
    var ws = (document.getElementById("cos-ws").value || "").trim().toUpperCase();
    var name = (document.getElementById("cos-name").value || "").trim();
    var pin = (document.getElementById("cos-pin").value || "").trim();
    if (!ws) { gateErr(t("needWs")); return; }
    if (pin.length < PIN_LEN) { gateErr(t("needPin")); return; }
    btn.disabled = true; gateErr("");
    var ns = (WORKER_SCOPE === "workspace") ? ws : WORKSHOP_CODE;
    try {
      var d = await password(slug(name) + "." + slug(ns) + "@" + AUTH_DOMAIN, String(pin) + PIN_SALT);
      if (!d.access_token) { gateErr(t("badPin")); btn.disabled = false; return; }
      TOKEN = d.access_token; REFRESH = d.refresh_token;
      TOK_EXP = Date.now() + ((d.expires_in || 3600) * 1000);
      WS = ws; ME = name;
      saveTok();
      if (!(await runGate())) return;
      await afterSignIn();
    } catch (e) { gateErr(String((e && e.message) || e)); btn.disabled = false; }
  }

  /* ── subscription gate ─────────────────────────────────────────────────── */
  async function runGate() {
    if (!PAYWALL || LOCAL_ONLY || !WS || !global.FabsuiteLicense) return true;
    try {
      global.FabsuiteLicense.config({ supabaseUrl: SB_URL, anonKey: SB_KEY,
        fabsuiteUrl: FABSUITE_URL, app: APP_CODE, brand: BRAND,
        supportEmail: SUPPORT_EMAIL, lang: lang() });
      return await global.FabsuiteLicense.gate({ workspaceCode: WS, token: TOKEN,
        onSignOut: function () { clearTok(); location.reload(); } });
    } catch (e) { console.warn("gate (non-fatal):", e && e.message); return true; }
  }

  /* ── a clean workshop on first run ──────────────────────────────────────
   * A paying customer must never open their workspace onto the demo shop's
   * invented team, orders and materials — least of all its PINs, which are
   * printed in a public README. Keep what is domain knowledge (the station
   * workflow, permissions, shift) and empty what is somebody else's shop.
   * ──────────────────────────────────────────────────────────────────────── */
  function isFreshWorkspace() {
    try { return !localStorage.getItem(LS_WS + "_seeded_" + WS); } catch (e) { return false; }
  }
  function markSeeded() {
    try { localStorage.setItem(LS_WS + "_seeded_" + WS, "1"); } catch (e) {}
  }
  function blankWorkshop(name) {
    var s = Store.state;
    s.shopName = name || s.shopName || "";
    s.orders = []; s.activity = []; s.materials = []; s.stockMoves = [];
    s.members = []; s.articles = []; s.portfolios = []; s.todos = [];
    s.gprojects = []; s.boards = []; s.notifications = []; s.prefs = {};
    s.suppliers = []; s.purchases = []; s.scanLog = [];
    s.orderSeq = 1001; s.engSeq = 2001; s.poSeq = 1001;
    if (s.oneDrive) s.oneDrive.baseUrl = "";
    Store.save();
  }
  function setupHtml() {
    return '<div class="login-screen"><div class="pin-stage" style="gap:4px">' +
      '<div class="login-logo">' +
        '<img src="shared/craftos-icon.png" alt="" style="height:54px;border-radius:14px;background:#fff;padding:5px;box-sizing:border-box">' +
        "<h1>" + esc(t("setupTitle")) + "</h1>" +
        "<p>" + esc(t("setupSub")) + "</p></div>" +
      '<div class="field" style="width:300px;margin-top:10px">' +
        '<input class="input" id="cos-su-name" autocomplete="name" placeholder="' + esc(t("setupName")) + '" value="' + esc(ME) + '"></div>' +
      '<div class="field" style="width:300px">' +
        '<input class="input" id="cos-su-pin" type="password" inputmode="numeric" maxlength="' + PIN_LEN + '" placeholder="' + esc(t("setupPin")) + '"></div>' +
      '<button class="btn primary xl" id="cos-su-go" style="width:300px;margin-top:6px">' + esc(t("setupGo")) + "</button>" +
      '<div class="t-caption" id="cos-err" style="color:var(--red);min-height:18px;margin-top:10px"></div>' +
      '<p class="t-caption" style="max-width:300px;text-align:center;line-height:1.6;opacity:.7">' +
        esc(t("setupPinHint")) + "</p>" +
      "</div></div>";
  }
  var NEEDS_SETUP = false;
  function showSetup() {
    NEEDS_SETUP = true;
    gateStyle();
    var root = document.getElementById("app");
    root.innerHTML = setupHtml();
    document.getElementById("cos-su-go").onclick = function () {
      var name = (document.getElementById("cos-su-name").value || "").trim();
      var pin = (document.getElementById("cos-su-pin").value || "").trim();
      if (!name) { gateErr(t("setupName")); return; }
      if (pin.length < PIN_LEN) { gateErr(t("needPin")); return; }
      var m = M.addMember({ name: name, trade: "", role: "manager", pin: pin }, null);
      NEEDS_SETUP = false;
      markSeeded();
      App.me = m;
      try { sessionStorage.setItem("shopflow.session", m.id); } catch (e) {}
      App._html = null;
      App.render();
      afterReady();
    };
    var pinEl = document.getElementById("cos-su-pin");
    pinEl.onkeydown = function (e) { if (e.key === "Enter") document.getElementById("cos-su-go").click(); };
  }

  /* ── after a successful sign-in ────────────────────────────────────────── */
  async function afterSignIn() {
    var S = Sync;
    if (LOCAL_ONLY) { brand(); headerChip(); App.render(); afterReady(); return; }

    // A different workspace in the same browser must never inherit the
    // previous company's shop.
    var marker = null;
    try { marker = localStorage.getItem(LS_WS); } catch (e) {}
    if (marker && marker !== WS) {
      try { localStorage.removeItem(SF_KEY); localStorage.setItem(LS_WS, WS); } catch (e) {}
      location.reload();
      return;
    }
    try { localStorage.setItem(LS_WS, WS); } catch (e) {}

    S.authed = true; S.status = "connecting"; S.msg = "";
    var row = null, failed = false;
    try { row = await fetchRow(); }
    catch (e) { failed = true; S.status = "error"; console.warn("[CraftOS] first pull:", e && e.message); }

    if (row) {
      LAST_SEEN = row.updated_at;
      S._applying = true;
      try { Store.state = row.data; Store.save(); } finally { S._applying = false; }
      markSeeded();
    } else if (!failed) {
      // Nobody has ever saved this workspace: start it clean and push.
      blankWorkshop(ME ? "" : "");
      await putRow().catch(function () {});
    }

    // Cloud writes from here on.
    Store._onSave = function () { if (!S._applying) S.schedulePush(); };
    S.status = failed ? "error" : "live";
    S.startPolling();

    brand();
    App._html = null;
    App.render();

    if (!LOCAL_ONLY && !(Store.state.members || []).length) { showSetup(); return; }
    afterReady();
  }

  // Everything that needs the app actually on screen.
  function afterReady() {
    headerChip();
    mountOutboundActions();
    handoffIn();
    publishWarehouse();
  }

  /* ── branding ──────────────────────────────────────────────────────────── */
  function brand() {
    document.title = BRAND + " — ShopFlow";
    var fav = document.querySelector('link[rel="icon"]');
    if (!fav) { fav = document.createElement("link"); fav.rel = "icon"; document.head.appendChild(fav); }
    fav.href = "shared/craftos-favicon.png";
    var atouch = document.querySelector('link[rel="apple-touch-icon"]');
    if (atouch) atouch.href = "shared/craftos-icon.png";
  }

  /* ── workspace chip + cross-links, in ShopFlow's own top bar ───────────── */
  function headerChip() {
    if (document.getElementById("cos-bar")) return;
    gateStyle();
    var host = document.querySelector(".topbar .grow");
    if (!host) return;
    var bar = document.createElement("span");
    bar.id = "cos-bar";
    bar.innerHTML =
      (LOCAL_ONLY ? "<span>" + esc(t("localMode")) + "</span>"
                  : "<span><b>" + esc(WS) + "</b></span>") +
      [["CRM", CRM_URL], ["Offer", OFFER_URL], ["Nesting", NESTING_URL], ["Invoices", INVOICES_URL]]
        .map(function (p) {
          return p[1] ? '<a href="' + esc(p[1]) + '" target="_blank" rel="noopener">' + p[0] + "&nbsp;&#8599;</a>" : "";
        }).join("");
    host.parentNode.insertBefore(bar, host.nextSibling);
  }
  // The shell is re-rendered wholesale, which drops the chip; put it back.
  function watchHeader() {
    if (!global.MutationObserver) return;
    new MutationObserver(function () {
      if (!WS && !LOCAL_ONLY) return;
      if (!document.getElementById("cos-bar") && document.querySelector(".topbar .grow")) headerChip();
    }).observe(document.getElementById("app"), { childList: true, subtree: true });
  }

  /* ══ HAND-OFFS ═══════════════════════════════════════════════════════════
   * The chain the suite sells: CRM → Offer → ShopFlow → Nesting → Invoices.
   * In, on the same query contract the DB app used, so CRM and Offer need no
   * change:  ?from=crm|offer&project=…&client=…&value=…&deal=…&ws=…
   * ════════════════════════════════════════════════════════════════════════ */
  var INBOUND = null;
  (function readInbound() {
    try {
      var q = new URLSearchParams(location.search);
      var from = q.get("from");
      if (from !== "crm" && from !== "offer") return;
      INBOUND = {
        from: from,
        project: (q.get("project") || "").trim(),
        client: (q.get("client") || "").trim(),
        value: (q.get("value") || "").trim(),
        dealId: (q.get("deal") || "").trim(),
        ws: (q.get("ws") || "").trim().toUpperCase()
      };
    } catch (e) {}
  })();

  function toast(msg, emoji) {
    try { Toast.show(msg, { emoji: emoji || "check", ms: 5000 }); }
    catch (e) { console.log("[CraftOS]", msg); }
  }

  function handoffIn() {
    if (!INBOUND) return;
    var h = INBOUND; INBOUND = null;
    // Only now — the app has booted and read its own params — is it safe to
    // drop the query, so a refresh cannot raise the same order twice.
    try { history.replaceState(null, "", location.pathname + location.hash); } catch (e) {}
    var label = h.from === "offer" ? t("fromOffer") : t("fromCrm");
    if (h.ws && WS && h.ws !== WS) { toast(t("otherWs") + " (" + h.ws + ")", "alert"); return; }
    var me = App.me;
    if (!me || !D.roleCan(me.role, "orders.create")) { toast(t("onlyManager"), "alert"); return; }
    try {
      // Every station in the shop's own workflow, so the order is immediately
      // routable; the manager trims it in the drawer's routing editor.
      var route = (Store.state.stations || [])
        .filter(function (st) { return st.kind !== "eng"; })
        .map(function (st) { return { stationId: st.id, estMins: st.estMins || 30 }; });
      var o = M.createOrder({
        type: "prod",
        product: h.project || h.client || "—",
        client: h.client || "",
        qty: 1, unit: "vnt", priority: "normal",
        due: null,
        notes: label + (h.value ? " · " + h.value : "") + (h.dealId ? " · " + h.dealId : ""),
        route: route
      }, me.id);
      App.render();
      try { Drawer.open(o.id); } catch (e) {}
      toast(label + ": " + (h.project || h.client || ""), "check");
    } catch (e) { console.warn("[CraftOS] handoff in:", e && e.message); }
  }

  /* ── out: an order becomes a cutting plan, or an invoice ───────────────── */
  function orderValue(o) {
    // ShopFlow prices nothing, so carry the quantity and let Invoices price it.
    return "";
  }
  function toNesting(o) {
    if (!NESTING_URL) return;
    var u = NESTING_URL + "/?project=" + encodeURIComponent(o.product || o.num || "") +
            "&gvs=" + encodeURIComponent(o.id) + "&ws=" + encodeURIComponent(WS);
    global.open(u, "_blank", "noopener");
  }
  function toInvoice(o) {
    if (!INVOICES_URL) return;
    var u = INVOICES_URL + "/?from=shopflow&ws=" + encodeURIComponent(WS) +
            "&client=" + encodeURIComponent(o.client || "") +
            "&project=" + encodeURIComponent(o.product || "") +
            "&qty=" + encodeURIComponent(o.items && o.items[0] ? (o.items[0].qty || 1) : 1) +
            "&ref=" + encodeURIComponent(o.num || "");
    global.open(u, "_blank", "noopener");
  }
  // The drawer is rebuilt on every open; add the two buttons when it appears.
  function mountOutboundActions() {
    var root = document.getElementById("drawer-root");
    if (!root) return;
    if (!root.__cosWatch && global.MutationObserver) {
      root.__cosWatch = true;
      // The drawer is rebuilt on every open and on most state changes.
      new MutationObserver(mountOnce).observe(root, { childList: true, subtree: true });
    }
    mountOnce();

    function mountOnce() {
      var head = root.querySelector(".drawer-actions");
      if (!head || head.querySelector(".cos-out")) return;
      var o = null;
      try {
        var id = Drawer.orderId;
        o = id ? Store.state.orders.find(function (x) { return x.id === id; }) : null;
      } catch (e) {}
      if (!o) return;
      if (NESTING_URL) head.appendChild(btn(t("toNesting"), function () { toNesting(o); }));
      if (INVOICES_URL) head.appendChild(btn(t("toInvoice"), function () { toInvoice(o); }));
    }
    function btn(label, fn) {
      var b = document.createElement("button");
      b.className = "btn cos-out";
      b.style.marginLeft = "6px";
      b.textContent = label + " ↗";
      b.onclick = fn;
      return b;
    }
  }

  /* ── the shared warehouse Nesting reads ────────────────────────────────── */
  async function publishWarehouse() {
    if (LOCAL_ONLY || !WS || !TOKEN) return;
    try {
      await ensureFresh();
      var now = new Date().toISOString();
      var rows = (Store.state.materials || []).map(function (m) {
        var qty = +m.qty || 0;
        return { workspace_code: WS, sku: m.sku || m.id, material: m.name || null,
                 thickness: null, unit: m.unit || "vnt", qty: qty, reserved: 0,
                 available: qty, sheet_w: null, sheet_h: null,
                 kind: "sheet", archived: false, updated_at: now };
      }).filter(function (r) { return r.sku; });
      if (!rows.length) return;
      await fetch(SB_URL + "/rest/v1/fabflow_stock?on_conflict=workspace_code,sku", {
        method: "POST",
        headers: Object.assign(headers(), { Prefer: "resolution=merge-duplicates,return=minimal" }),
        body: JSON.stringify(rows)
      });
    } catch (e) { console.warn("[CraftOS] publishWarehouse (non-fatal):", e && e.message); }
  }

  /* ── boot ──────────────────────────────────────────────────────────────── */
  installSyncOverrides();
  brand();

  function start() {
    watchHeader();
    // ShopFlow's own dev auto-login (?as=… , honoured only on localhost) skips
    // its cloud gate entirely. Follow it rather than fight it: run the wrapper
    // in local mode so the chip, the hand-offs and the drawer actions are all
    // exercisable without a workspace — which is also how the suite tests it.
    if (App._localOnly) {
      LOCAL_ONLY = true;
      if (Sync) Sync.status = "off";
      brand();
      afterReady();
      return;
    }
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(LS_TOK) || "null"); } catch (e) {}
    if (!(saved && saved.a && saved.ws)) { App.render(); return; }

    TOKEN = saved.a; REFRESH = saved.r; TOK_EXP = saved.e || 0; WS = saved.ws; ME = saved.n || "";
    (async function () {
      if (TOK_EXP && TOK_EXP < Date.now() + 30000 && REFRESH) {
        var d = await refreshTok(REFRESH).catch(function () { return {}; });
        if (d.access_token) {
          TOKEN = d.access_token; REFRESH = d.refresh_token || REFRESH;
          TOK_EXP = Date.now() + ((d.expires_in || 3600) * 1000); saveTok();
        } else { TOKEN = null; WS = ""; clearTok(); App.render(); return; }
      }
      if (!(await runGate())) return;
      await afterSignIn();
    })();
  }
  // The build injects this file BEFORE the inline `App.boot()`, so the Sync
  // overrides are in place for the very first render and the demo shop's PIN
  // picker never flashes past. Wrap boot rather than racing it.
  if (App && typeof App.boot === "function" && !App._cosBooted) {
    var _boot = App.boot.bind(App);
    App._cosBooted = true;
    App.boot = function () { _boot(); start(); };
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else { start(); }

  global.CraftOS = { ws: function () { return WS; }, localOnly: function () { return LOCAL_ONLY; },
                     publishWarehouse: publishWarehouse, signOut: function () { clearTok(); location.reload(); } };
})(typeof window !== "undefined" ? window : this);

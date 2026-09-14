/* ════════════════════════════════════════════════════════════════════════════
 * CraftOS productizer for the Invoices app.
 * ────────────────────────────────────────────────────────────────────────────
 * The invoicing app (repo `invoices`) is a single self-contained file that
 * keeps its whole state in localStorage, with an optional cloud sync the user
 * configures by hand — URL, key, email, password, workspace, table. To sell it
 * as part of CraftOS it needs four things it does not have on its own:
 *
 *   1. a login, so each company's books are separate;
 *   2. the subscription gate (app code 'invoices');
 *   3. cloud storage namespaced by workspace instead of hand-configured;
 *   4. CraftOS branding and the cross-links to the sibling apps.
 *
 * This file adds all four WITHOUT editing the app. It loads after the app's own
 * script and overrides the seams on its `Cloud` object — which the app exposes
 * on `window` — so an upstream change to the invoicing logic needs no
 * re-patching. Only these seams matter:
 *
 *   Cloud.on()          hand-configured connection  →  a signed-in workspace
 *   Cloud.token()       its own refresh token       →  the CraftOS session
 *   Cloud.fetchRemote() invoice_workspaces row      →  fabflow row fab_<WS>_invoices
 *   Cloud.put()         ditto                       →  ditto
 *   Cloud.signOut()     forget the connection       →  sign out of CraftOS
 *
 * The whole state stays ONE document per workspace, exactly as upstream, so
 * 0005's row-level security already covers it: the key carries the workspace
 * code, and a customer can only touch keys for workspaces they belong to.
 *
 * Load order in the product build (see scripts/build-product.sh):
 *   <script src="config.js">        → window.FAB_CONFIG
 *   … the whole Invoices app …
 *   <script src="shared/fabsuite-license.js">
 *   <script src="craftos.js">       → this file
 * ════════════════════════════════════════════════════════════════════════════ */
(function (global) {
  "use strict";

  var CFG = window.FAB_CONFIG || {};
  var SB_URL = (CFG.SUPABASE_URL || CFG.DATA_URL || "").replace(/\/+$/, "");
  var SB_KEY = CFG.SUPABASE_ANON_KEY || CFG.DATA_ANON_KEY || "";
  var BRAND = CFG.BRAND_NAME || "CraftOS";
  var APP_CODE = CFG.APP_CODE || "invoices";
  var PAYWALL = !!CFG.PAYWALL_ENABLED;
  var FABSUITE_URL = (CFG.FABSUITE_URL || "").replace(/\/+$/, "");
  var SUPPORT_EMAIL = CFG.SUPPORT_EMAIL || "";
  var AUTH_DOMAIN = CFG.AUTH_DOMAIN || "dedesbaldai.lt";
  var WORKSHOP_CODE = CFG.WORKSHOP_CODE || "gvs";
  var WORKER_SCOPE = CFG.WORKER_EMAIL_SCOPE || "workshop";
  var CRM_URL = (CFG.CRM_URL || "").replace(/\/+$/, "");
  var OFFER_URL = (CFG.OFFER_URL || "").replace(/\/+$/, "");
  var DB_URL = (CFG.DB_URL || "").replace(/\/+$/, "");
  var PIN_LEN = 4, PIN_SALT = "_dedes";
  var LS_TOK = "craftos_invoices_tok";
  var LS_WS = "craftos_invoices_ws";     // which workspace this browser last held
  var INV_KEY = "inv_state_v1";          // the app's own localStorage key

  var WS = "", TOKEN = null, REFRESH = null, TOK_EXP = 0, ME = "", LOCAL_ONLY = false;

  // If this deployment has no backend at all, leave the app exactly as it is.
  if (!SB_URL || !SB_KEY) { brand(); return; }

  /* ── i18n — the four languages the suite ships ─────────────────────────── */
  function lang() {
    var v = global.LANG;
    if (TX[v]) return v;
    try { v = localStorage.getItem("fab_lang"); if (TX[v]) return v; } catch (e) {}
    var b = String((navigator.language || "")).toLowerCase();
    if (b.indexOf("lt") === 0) return "lt";
    if (b.indexOf("de") === 0) return "de";
    if (b.indexOf("es") === 0) return "es";
    return "en";
  }
  var TX = {
    lt: { title: "Prisijunkite", ws: "Darbo vietos kodas", name: "Vardas", pin: "PIN",
          email: "El. paštas", pw: "Slaptažodis", signin: "Prisijungti",
          tabMgr: "Vadovas", tabWork: "Darbuotojas", tabLocal: "Tik ši naršyklė",
          localNote: "Dirbkite be prisijungimo — sąskaitos saugomos tik šioje naršyklėje.",
          localGo: "Tęsti be prisijungimo", bad: "Neteisingas el. paštas arba slaptažodis.",
          badPin: "Neteisingas vardas arba PIN.", needPin: "Įveskite 4 skaitmenų PIN.",
          needWs: "Įveskite darbo vietos kodą.",
          noWs: "Šiai paskyrai nepriskirta darbo vieta. Prisijunkite prie DB programos ir susikurkite ją.",
          out: "Atsijungti", localMode: "Lokalus režimas",
          firstSync: "Debesyje jau yra šios darbo vietos sąskaitos.\n\nGERAI — paimti duomenis iš debesies (šios naršyklės duomenys bus pakeisti).\nATŠAUKTI — įkelti šios naršyklės duomenis į debesį." },
    en: { title: "Sign in", ws: "Workspace code", name: "Name", pin: "PIN",
          email: "Email", pw: "Password", signin: "Sign in",
          tabMgr: "Manager", tabWork: "Team member", tabLocal: "This browser only",
          localNote: "Work without signing in — invoices stay in this browser.",
          localGo: "Continue without signing in", bad: "Wrong email or password.",
          badPin: "Wrong name or PIN.", needPin: "Enter your 4-digit PIN.",
          needWs: "Enter your workspace code.",
          noWs: "This account has no workspace yet. Sign in to the DB app to create one.",
          out: "Sign out", localMode: "Local mode",
          firstSync: "This workspace already has invoices in the cloud.\n\nOK — take the cloud copy (this browser's data is replaced).\nCancel — upload this browser's data instead." },
    de: { title: "Anmelden", ws: "Arbeitsbereich-Code", name: "Name", pin: "PIN",
          email: "E-Mail", pw: "Passwort", signin: "Anmelden",
          tabMgr: "Leitung", tabWork: "Mitarbeiter", tabLocal: "Nur dieser Browser",
          localNote: "Ohne Anmeldung arbeiten — Rechnungen bleiben in diesem Browser.",
          localGo: "Ohne Anmeldung fortfahren", bad: "Falsche E-Mail oder falsches Passwort.",
          badPin: "Falscher Name oder falsche PIN.", needPin: "Geben Sie Ihre 4-stellige PIN ein.",
          needWs: "Geben Sie Ihren Arbeitsbereich-Code ein.",
          noWs: "Dieses Konto hat noch keinen Arbeitsbereich. Melden Sie sich in der DB-App an, um einen zu erstellen.",
          out: "Abmelden", localMode: "Lokaler Modus",
          firstSync: "Für diesen Arbeitsbereich liegen bereits Rechnungen in der Cloud.\n\nOK — die Cloud-Fassung übernehmen (die Daten dieses Browsers werden ersetzt).\nAbbrechen — stattdessen die Daten dieses Browsers hochladen." },
    es: { title: "Entrar", ws: "Código del espacio", name: "Nombre", pin: "PIN",
          email: "Email", pw: "Contraseña", signin: "Entrar",
          tabMgr: "Responsable", tabWork: "Miembro del equipo", tabLocal: "Solo este navegador",
          localNote: "Trabaja sin iniciar sesión — las facturas se quedan en este navegador.",
          localGo: "Continuar sin iniciar sesión", bad: "Email o contraseña incorrectos.",
          badPin: "Nombre o PIN incorrectos.", needPin: "Introduce tu PIN de 4 dígitos.",
          needWs: "Introduce el código del espacio.",
          noWs: "Esta cuenta aún no tiene espacio de trabajo. Entra en la app DB para crear uno.",
          out: "Salir", localMode: "Modo local",
          firstSync: "Este espacio ya tiene facturas en la nube.\n\nAceptar — usar la copia de la nube (se reemplazan los datos de este navegador).\nCancelar — subir los datos de este navegador." }
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

  /* ── workspace-scoped cloud storage over the shared `fabflow` table ──────
   * Upstream keeps the whole state as one row; so do we. The row's KEY carries
   * the workspace code, which is what the RLS policy reads.
   * ──────────────────────────────────────────────────────────────────────── */
  function rowKey() { return "fab_" + WS + "_invoices"; }
  function headers() {
    return { apikey: SB_KEY, Authorization: "Bearer " + (TOKEN || SB_KEY),
             "Content-Type": "application/json" };
  }
  async function ensureFresh() {
    if (LOCAL_ONLY || !REFRESH) return;
    if (!TOK_EXP || TOK_EXP > Date.now() + 60000) return;
    var d = await refreshTok(REFRESH).catch(function () { return {}; });
    if (d.access_token) {
      TOKEN = d.access_token; REFRESH = d.refresh_token || REFRESH;
      TOK_EXP = Date.now() + ((d.expires_in || 3600) * 1000); saveTok();
    }
  }
  function installCloudOverrides() {
    var C = global.Cloud;
    if (!C) { console.warn("[CraftOS] Invoices app exposes no Cloud object"); return false; }

    C.defaults = function () {
      return { url: SB_URL, key: SB_KEY, email: ME, workspace: WS || "", table: "fabflow" };
    };
    C.preset = function () { return true; };
    // The wrapper owns the connection: nothing to read from or write to
    // localStorage, and nothing for the user to configure by hand.
    C.load = function () { return C.cfg; };
    C.save = function () {};
    C.on = function () { return !LOCAL_ONLY && !!(WS && TOKEN && SB_URL && SB_KEY); };
    C.base = function () { return SB_URL; };
    C.table = function () { return "fabflow"; };
    C.row = function () { return "fabflow?key=eq." + encodeURIComponent(rowKey()); };
    C.token = async function () { await ensureFresh(); return TOKEN; };
    C.signIn = async function () { throw new Error("CraftOS"); };
    C.signOut = function () { clearTok(); location.reload(); };

    C.fetchRemote = async function () {
      await ensureFresh();
      var r = await fetch(SB_URL + "/rest/v1/fabflow?key=eq." + encodeURIComponent(rowKey()) +
                          "&select=key,value,updated_at", { headers: headers() });
      if (!r.ok) throw new Error("HTTP " + r.status + " " + (await r.text()).slice(0, 180));
      var rows = await r.json();
      if (!rows.length) return null;
      var data = null;
      try { data = JSON.parse(rows[0].value || "null"); } catch (e) { data = null; }
      // A row we cannot parse is worse than no row: adopting {} would wipe the
      // books. Refuse instead, and let the status chip show the error.
      if (!data) throw new Error("stored invoice document is unreadable");
      return { id: rowKey(), data: data, updated_at: rows[0].updated_at, updated_by: "" };
    };
    C.put = async function () {
      await ensureFresh();
      var now = new Date().toISOString();
      var r = await fetch(SB_URL + "/rest/v1/fabflow?on_conflict=key", {
        method: "POST",
        headers: Object.assign(headers(), { Prefer: "resolution=merge-duplicates,return=representation" }),
        body: JSON.stringify({ key: rowKey(), value: JSON.stringify(global.S), updated_at: now })
      });
      if (!r.ok) throw new Error("HTTP " + r.status + " " + (await r.text()).slice(0, 180));
      var rows = await r.json().catch(function () { return []; });
      C.seen = (rows && rows[0] && rows[0].updated_at) || now;
      C.dirty = false;
    };
    return true;
  }

  /* ── auth ──────────────────────────────────────────────────────────────── */
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

  /* ── login overlay ─────────────────────────────────────────────────────── */
  var pin = "";
  function style() {
    if (document.getElementById("cos-style")) return;
    var s = document.createElement("style");
    s.id = "cos-style";
    s.textContent = [
      "#cos-login{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;",
      "justify-content:center;padding:20px;background:#12141a;",
      "font-family:'Inter',-apple-system,Segoe UI,Roboto,Arial,sans-serif}",
      "#cos-login .box{width:100%;max-width:392px;background:#1b1e26;border:1px solid #2c3340;",
      "border-radius:16px;padding:28px 26px;color:#e8ebf0;box-shadow:0 24px 60px rgba(0,0,0,.5)}",
      "#cos-login .lg{display:flex;justify-content:center;margin-bottom:4px}",
      "#cos-login .lg img{height:28px;filter:brightness(0) invert(1)}",
      "#cos-login .kick{text-align:center;font-size:11px;font-weight:700;letter-spacing:.14em;",
      "text-transform:uppercase;color:#8b93a5;margin-bottom:20px}",
      "#cos-login .tabs{display:flex;gap:4px;background:#232a36;padding:4px;border-radius:9px;margin-bottom:18px}",
      "#cos-login .tabs button{flex:1;padding:8px;border:0;border-radius:6px;background:none;color:#8b93a5;",
      "font:inherit;font-size:12.5px;font-weight:600;cursor:pointer}",
      "#cos-login .tabs button.on{background:#2f54eb;color:#fff}",
      "#cos-login .pane{display:none}#cos-login .pane.on{display:block}",
      "#cos-login label{display:block;font-size:12px;font-weight:600;color:#8b93a5;margin:12px 0 5px}",
      "#cos-login input{width:100%;background:#232a36;border:1px solid #2c3340;color:#e8ebf0;",
      "border-radius:8px;padding:10px 12px;font:inherit;outline:none;box-sizing:border-box}",
      "#cos-login input:focus{border-color:#2f54eb}",
      "#cos-login .go{width:100%;margin-top:16px;background:#2f54eb;color:#fff;border:0;border-radius:9px;",
      "padding:12px;font:inherit;font-weight:650;cursor:pointer}",
      "#cos-login .go:disabled{opacity:.55;cursor:default}",
      "#cos-login .msg{display:none;margin-top:13px;font-size:12.5px;background:#3a1d1d;color:#ffb4b4;",
      "padding:9px 11px;border-radius:8px;line-height:1.45}#cos-login .msg.on{display:block}",
      "#cos-login .dots{display:flex;gap:8px;justify-content:center;margin:12px 0}",
      "#cos-login .dots span{width:12px;height:12px;border-radius:50%;background:#232a36;border:1px solid #2c3340}",
      "#cos-login .dots span.on{background:#2f54eb;border-color:#2f54eb}",
      "#cos-login .pad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}",
      "#cos-login .pad button{padding:13px 0;border-radius:8px;background:#232a36;border:1px solid #2c3340;",
      "color:#e8ebf0;font:inherit;font-size:18px;font-weight:600;cursor:pointer}",
      "#cos-login .note{font-size:12.5px;color:#8b93a5;line-height:1.6;margin-bottom:4px}",
      "#cos-login .foot{text-align:center;font-size:12px;color:#6b7385;margin-top:16px;line-height:1.7}",
      "#cos-login .foot a{color:#8fa8ff}",
      "#cos-bar{display:inline-flex;align-items:center;gap:8px;font-size:11.5px;color:#8b93a5}",
      "#cos-bar b{color:#e8ebf0;font-family:ui-monospace,Menlo,Consolas,monospace}",
      "#cos-bar a{color:#8b93a5;text-decoration:none}",
      "#cos-bar button{background:#232a36;border:1px solid #2c3340;color:#8b93a5;border-radius:7px;",
      "padding:5px 9px;font:inherit;font-size:11.5px;cursor:pointer}"
    ].join("");
    document.head.appendChild(s);
  }
  function dots() {
    var d = document.getElementById("cos-dots"); if (!d) return;
    var h = ""; for (var i = 0; i < PIN_LEN; i++) h += '<span class="' + (i < pin.length ? "on" : "") + '"></span>';
    d.innerHTML = h;
  }
  function msg(text) {
    var m = document.getElementById("cos-msg"); if (!m) return;
    m.textContent = text || ""; m.className = "msg" + (text ? " on" : "");
  }
  function tab(which) {
    ["mgr", "work", "local"].forEach(function (x) {
      var b = document.getElementById("cos-tab-" + x), p = document.getElementById("cos-pane-" + x);
      if (b) b.className = x === which ? "on" : "";
      if (p) p.className = "pane" + (x === which ? " on" : "");
    });
    msg("");
  }
  function showLogin() {
    if (document.getElementById("cos-login")) return;
    style();
    var w = document.createElement("div");
    w.id = "cos-login";
    w.setAttribute("role", "dialog");
    w.setAttribute("aria-modal", "true");
    w.innerHTML = ''
      + '<div class="box">'
      +   '<div class="lg"><img src="shared/craftos-logo.png" alt="' + esc(BRAND) + '"></div>'
      +   '<div class="kick">Invoices</div>'
      +   '<div class="tabs">'
      +     '<button id="cos-tab-mgr" class="on">' + esc(t("tabMgr")) + '</button>'
      +     '<button id="cos-tab-work">' + esc(t("tabWork")) + '</button>'
      +     '<button id="cos-tab-local">' + esc(t("tabLocal")) + '</button>'
      +   '</div>'
      +   '<div id="cos-pane-mgr" class="pane on">'
      +     '<label for="cos-email">' + esc(t("email")) + '</label>'
      +     '<input id="cos-email" type="email" autocomplete="username">'
      +     '<label for="cos-pw">' + esc(t("pw")) + '</label>'
      +     '<input id="cos-pw" type="password" autocomplete="current-password">'
      +     '<button class="go" id="cos-go-mgr">' + esc(t("signin")) + '</button>'
      +   '</div>'
      +   '<div id="cos-pane-work" class="pane">'
      +     '<label for="cos-ws">' + esc(t("ws")) + '</label>'
      +     '<input id="cos-ws" style="text-transform:uppercase;letter-spacing:.1em;font-weight:600">'
      +     '<label for="cos-name">' + esc(t("name")) + '</label>'
      +     '<input id="cos-name" autocomplete="name">'
      +     '<label>' + esc(t("pin")) + '</label>'
      +     '<div class="dots" id="cos-dots"></div>'
      +     '<div class="pad" id="cos-pad">'
      +       [1,2,3,4,5,6,7,8,9].map(function (n) { return '<button data-n="' + n + '">' + n + '</button>'; }).join("")
      +       '<button data-n="back">&larr;</button><button data-n="0">0</button>'
      +       '<button data-n="go" style="background:#2f54eb;border-color:#2f54eb;color:#fff">&rarr;</button>'
      +     '</div>'
      +   '</div>'
      +   '<div id="cos-pane-local" class="pane">'
      +     '<p class="note">' + esc(t("localNote")) + '</p>'
      +     '<button class="go" id="cos-go-local">' + esc(t("localGo")) + '</button>'
      +   '</div>'
      +   '<div id="cos-msg" class="msg" role="alert"></div>'
      +   (FABSUITE_URL ? '<div class="foot"><a href="' + esc(FABSUITE_URL) + '/index.html#pricing">'
          + esc(BRAND) + '</a></div>' : '')
      + '</div>';
    document.body.appendChild(w);
    dots();
    document.getElementById("cos-tab-mgr").onclick = function () { tab("mgr"); };
    document.getElementById("cos-tab-work").onclick = function () { tab("work"); };
    document.getElementById("cos-tab-local").onclick = function () { tab("local"); };
    document.getElementById("cos-go-mgr").onclick = loginManager;
    document.getElementById("cos-go-local").onclick = function () {
      LOCAL_ONLY = true; WS = ""; ME = ""; hideLogin(); afterLogin();
    };
    document.getElementById("cos-pad").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-n]"); if (!b) return;
      var n = b.getAttribute("data-n");
      if (n === "back") { pin = pin.slice(0, -1); dots(); }
      else if (n === "go") { loginWorker(); }
      else if (pin.length < PIN_LEN) { pin += n; dots(); }
    });
    ["cos-email", "cos-pw"].forEach(function (id) {
      document.getElementById(id).addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); loginManager(); }
      });
    });
    document.addEventListener("keydown", function (e) {
      if (!document.getElementById("cos-login")) return;
      if (!document.getElementById("cos-pane-work").classList.contains("on")) return;
      if (e.key >= "0" && e.key <= "9" && pin.length < PIN_LEN) { pin += e.key; dots(); }
      else if (e.key === "Backspace" && document.activeElement &&
               document.activeElement.tagName !== "INPUT") { e.preventDefault(); pin = pin.slice(0, -1); dots(); }
      else if (e.key === "Enter") { e.preventDefault(); loginWorker(); }
    });
    setTimeout(function () { var f = document.getElementById("cos-email"); if (f) f.focus(); }, 60);
  }
  function hideLogin() { var w = document.getElementById("cos-login"); if (w) w.remove(); }

  async function loginManager() {
    var btn = document.getElementById("cos-go-mgr");
    btn.disabled = true; msg("");
    try {
      var email = (document.getElementById("cos-email").value || "").trim();
      var pw = document.getElementById("cos-pw").value || "";
      var d = await password(email, pw);
      if (!d.access_token) { msg(t("bad")); return; }
      TOKEN = d.access_token; REFRESH = d.refresh_token;
      TOK_EXP = Date.now() + ((d.expires_in || 3600) * 1000);
      var prof = await workspaceOfUser((d.user && d.user.id) || "");
      if (!prof) { TOKEN = null; msg(t("noWs")); return; }
      WS = prof.code; ME = prof.name || email.split("@")[0];
      saveTok();
      if (!(await runGate())) return;
      hideLogin(); afterLogin();
    } catch (e) { msg(String((e && e.message) || e)); }
    finally { btn.disabled = false; }
  }
  async function loginWorker() {
    var ws = (document.getElementById("cos-ws").value || "").trim().toUpperCase();
    var name = (document.getElementById("cos-name").value || "").trim();
    if (!ws) { msg(t("needWs")); return; }
    if (pin.length < PIN_LEN) { msg(t("needPin")); return; }
    msg("");
    var ns = (WORKER_SCOPE === "workspace") ? ws : WORKSHOP_CODE;
    try {
      var d = await password(slug(name) + "." + slug(ns) + "@" + AUTH_DOMAIN, String(pin) + PIN_SALT);
      if (!d.access_token) { msg(t("badPin")); pin = ""; dots(); return; }
      TOKEN = d.access_token; REFRESH = d.refresh_token;
      TOK_EXP = Date.now() + ((d.expires_in || 3600) * 1000);
      WS = ws; ME = name; pin = ""; dots();
      saveTok();
      if (!(await runGate())) return;
      hideLogin(); afterLogin();
    } catch (e) { msg(String((e && e.message) || e)); }
  }
  function signOut() {
    if (!confirm(t("out") + "?")) return;
    clearTok(); location.reload();
  }

  /* ── subscription gate ─────────────────────────────────────────────────── */
  async function runGate() {
    if (!PAYWALL || LOCAL_ONLY || !WS || !global.FabsuiteLicense) return true;
    try {
      global.FabsuiteLicense.config({ supabaseUrl: SB_URL, anonKey: SB_KEY,
        fabsuiteUrl: FABSUITE_URL, app: APP_CODE, brand: BRAND,
        supportEmail: SUPPORT_EMAIL, lang: lang() });
      var ok = await global.FabsuiteLicense.gate({ workspaceCode: WS, token: TOKEN,
        onSignOut: function () { clearTok(); location.reload(); } });
      if (!ok) hideLogin();     // the paywall replaces the login box
      return ok;
    } catch (e) { console.warn("gate (non-fatal):", e && e.message); return true; }
  }

  /* ── brand + workspace chip in the app header ──────────────────────────── */
  function paintSub() {
    var sub = document.getElementById("brandSub"); if (!sub) return;
    var want = BRAND + " · invoices";
    if (sub.textContent !== want) sub.textContent = want;
  }
  function brand() {
    document.title = BRAND + " — Invoices";
    var fav = document.querySelector('link[rel="icon"]');
    if (!fav) { fav = document.createElement("link"); fav.rel = "icon"; document.head.appendChild(fav); }
    fav.href = "shared/craftos-favicon.png";
    paintSub();
    // The app rewrites this line from its own i18n on every render; put the
    // brand back whenever it does, rather than racing it.
    var sub = document.getElementById("brandSub");
    if (sub && !sub.__cosWatch && global.MutationObserver) {
      sub.__cosWatch = true;
      new MutationObserver(paintSub).observe(sub, { childList: true, characterData: true, subtree: true });
    }
  }
  function headerChip() {
    if (document.getElementById("cos-bar")) return;
    var langBox = document.querySelector("header .hbtns .lang");
    var host = langBox ? langBox.parentElement : document.querySelector("header .hbtns");
    if (!host) return;
    var bar = document.createElement("span");
    bar.id = "cos-bar";
    // The cross-app links work in local mode too — they are URLs, not database
    // writes — so only the identity and sign-out are conditional.
    bar.innerHTML =
      (LOCAL_ONLY
        ? '<span>' + esc(t("localMode")) + '</span>'
        : '<span>' + esc(ME || "") + ' · <b>' + esc(WS) + '</b></span>')
      + [["DB", DB_URL], ["Offer", OFFER_URL], ["CRM", CRM_URL]].map(function (p) {
          return p[1] ? '<a href="' + esc(p[1]) + '" target="_blank" rel="noopener">'
            + p[0] + '&nbsp;&#8599;</a>' : "";
        }).join("")
      + (LOCAL_ONLY ? '' : '<button id="cos-out">' + esc(t("out")) + '</button>');
    if (langBox) host.insertBefore(bar, langBox); else host.appendChild(bar);
    var out = document.getElementById("cos-out");
    if (out) out.onclick = signOut;
  }

  /* ── first sync after a login ──────────────────────────────────────────
   * Two hazards this closes:
   *   • signing into a DIFFERENT workspace on a browser that still holds the
   *     previous company's books — they must never be pushed into the new one;
   *   • a first sign-in where BOTH sides hold data — upstream asks the user
   *     which side wins, and so do we, rather than silently picking.
   * ──────────────────────────────────────────────────────────────────────── */
  async function firstSync() {
    var C = global.Cloud;
    if (!C || !C.on()) { if (global.paintCloud) global.paintCloud(); return; }

    var marker = null;
    try { marker = localStorage.getItem(LS_WS); } catch (e) {}
    if (marker && marker !== WS) {
      try { localStorage.removeItem(INV_KEY); localStorage.setItem(LS_WS, WS); } catch (e) {}
      location.reload();
      return;
    }
    try { localStorage.setItem(LS_WS, WS); } catch (e) {}

    C.status = "idle"; C.msg = "";
    if (!marker) {
      var S = global.S || {};
      var localCount = ((S.invoices || []).length) + ((S.customers || []).length) +
                       ((S.waybills || []).length);
      if (localCount) {
        var row = null;
        try { row = await C.fetchRemote(); }
        catch (e) { C.status = "error"; C.msg = String((e && e.message) || e); }
        if (row && !confirm(t("firstSync"))) {
          try { await C.put(); } catch (e) { C.status = "error"; C.msg = String((e && e.message) || e); }
          C.start(); return;
        }
      }
    }
    C.start();
  }

  /* ── after a successful login ──────────────────────────────────────────── */
  function afterLogin() {
    brand();
    headerChip();
    var C = global.Cloud;
    if (C) {
      C.cfg = LOCAL_ONLY ? null
        : { url: SB_URL, key: SB_KEY, email: ME, workspace: WS, table: "fabflow" };
      C.seen = null; C.dirty = false;
    }
    firstSync();
    if (global.paintCloud) { try { global.paintCloud(); } catch (e) {} }
  }

  /* ── boot ──────────────────────────────────────────────────────────────── */
  installCloudOverrides();
  brand();

  function start() {
    brand();
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(LS_TOK) || "null"); } catch (e) {}
    if (saved && saved.a && saved.ws) {
      TOKEN = saved.a; REFRESH = saved.r; TOK_EXP = saved.e || 0; WS = saved.ws; ME = saved.n || "";
      (async function () {
        if (TOK_EXP && TOK_EXP < Date.now() + 30000 && REFRESH) {
          var d = await refreshTok(REFRESH).catch(function () { return {}; });
          if (d.access_token) {
            TOKEN = d.access_token; REFRESH = d.refresh_token || REFRESH;
            TOK_EXP = Date.now() + ((d.expires_in || 3600) * 1000); saveTok();
          } else { clearTok(); showLogin(); return; }
        }
        if (!(await runGate())) return;
        afterLogin();
      })();
      return;
    }
    showLogin();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})(typeof window !== "undefined" ? window : this);

/* ════════════════════════════════════════════════════════════════════════════
 * CraftOS productizer for the Offer app.
 * ────────────────────────────────────────────────────────────────────────────
 * The Offer app (repo `offer`) is a single self-contained file that saves to
 * localStorage, with an optional cloud sync the user configures by hand. To
 * sell it as part of CraftOS it needs four things it does not have on its own:
 *
 *   1. a login, so each company's quotes are separate;
 *   2. the subscription gate (app code 'offer');
 *   3. cloud storage that is namespaced by workspace instead of hand-configured;
 *   4. CraftOS branding.
 *
 * This file adds all four WITHOUT editing the app: it loads after the app's own
 * script and overrides the four `cloud*` seams plus the brand. Upstream changes
 * to the calculator therefore need no re-patching — only these seams matter.
 *
 * Load order in the product build (see scripts/build-product.sh):
 *   <script src="config.js">        → window.FAB_CONFIG
 *   … the whole Offer app …
 *   <script src="shared/fabsuite-license.js">
 *   <script src="craftos.js">       → this file
 * ════════════════════════════════════════════════════════════════════════════ */
(function (global) {
  "use strict";

  var CFG = window.FAB_CONFIG || {};
  var SB_URL = (CFG.SUPABASE_URL || CFG.DATA_URL || "").replace(/\/+$/, "");
  var SB_KEY = CFG.SUPABASE_ANON_KEY || CFG.DATA_ANON_KEY || "";
  var BRAND = CFG.BRAND_NAME || "CraftOS";
  var APP_CODE = CFG.APP_CODE || "offer";
  var PAYWALL = !!CFG.PAYWALL_ENABLED;
  var FABSUITE_URL = (CFG.FABSUITE_URL || "").replace(/\/+$/, "");
  var SUPPORT_EMAIL = CFG.SUPPORT_EMAIL || "";
  var AUTH_DOMAIN = CFG.AUTH_DOMAIN || "dedesbaldai.lt";
  var WORKSHOP_CODE = CFG.WORKSHOP_CODE || "gvs";
  var WORKER_SCOPE = CFG.WORKER_EMAIL_SCOPE || "workshop";
  var CRM_URL = (CFG.CRM_URL || "").replace(/\/+$/, "");
  var DB_URL = (CFG.DB_URL || "").replace(/\/+$/, "");
  var INVOICES_URL = (CFG.INVOICES_URL || "").replace(/\/+$/, "");
  var PIN_LEN = 4, PIN_SALT = "_dedes";
  var LS_TOK = "craftos_offer_tok";

  var WS = "", TOKEN = null, REFRESH = null, TOK_EXP = 0, ME = "", LOCAL_ONLY = false;

  // If this deployment has no backend at all, leave the app exactly as it is.
  if (!SB_URL || !SB_KEY) { brand(); return; }

  /* ── i18n — the same four languages the calculator now ships ──────────── */
  function lang() {
    var v = window.LANG;
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
          localNote: "Dirbkite be prisijungimo — projektai saugomi tik šioje naršyklėje.",
          localGo: "Tęsti be prisijungimo", bad: "Neteisingas el. paštas arba slaptažodis.",
          badPin: "Neteisingas vardas arba PIN.", needPin: "Įveskite 4 skaitmenų PIN.",
          needWs: "Įveskite darbo vietos kodą.",
          noWs: "Šiai paskyrai nepriskirta darbo vieta. Prisijunkite prie DB programos ir susikurkite ją.",
          out: "Atsijungti", cloudWs: "Projektai saugomi darbo vietoje", localMode: "Lokalus režimas", toDb: "Į DB projektą", backupAll: "Atsarginė kopija (visi)", restoreAll: "Atkurti" },
    en: { title: "Sign in", ws: "Workspace code", name: "Name", pin: "PIN",
          email: "Email", pw: "Password", signin: "Sign in",
          tabMgr: "Manager", tabWork: "Team member", tabLocal: "This browser only",
          localNote: "Work without signing in — projects stay in this browser.",
          localGo: "Continue without signing in", bad: "Wrong email or password.",
          badPin: "Wrong name or PIN.", needPin: "Enter your 4-digit PIN.",
          needWs: "Enter your workspace code.",
          noWs: "This account has no workspace yet. Sign in to the DB app to create one.",
          out: "Sign out", cloudWs: "Projects are stored in workspace", localMode: "Local mode", toDb: "To a DB project", backupAll: "Backup all", restoreAll: "Restore" },
    de: { title: "Anmelden", ws: "Arbeitsbereich-Code", name: "Name", pin: "PIN",
          email: "E-Mail", pw: "Passwort", signin: "Anmelden",
          tabMgr: "Leitung", tabWork: "Mitarbeiter", tabLocal: "Nur dieser Browser",
          localNote: "Ohne Anmeldung arbeiten — Projekte bleiben in diesem Browser.",
          localGo: "Ohne Anmeldung fortfahren", bad: "Falsche E-Mail oder falsches Passwort.",
          badPin: "Falscher Name oder falsche PIN.", needPin: "Geben Sie Ihre 4-stellige PIN ein.",
          needWs: "Geben Sie Ihren Arbeitsbereich-Code ein.",
          noWs: "Dieses Konto hat noch keinen Arbeitsbereich. Melden Sie sich in der DB-App an, um einen zu erstellen.",
          out: "Abmelden", cloudWs: "Projekte liegen im Arbeitsbereich", localMode: "Lokaler Modus", toDb: "Als DB-Projekt", backupAll: "Alles sichern", restoreAll: "Wiederherstellen" },
    es: { title: "Entrar", ws: "Código del espacio", name: "Nombre", pin: "PIN",
          email: "Email", pw: "Contraseña", signin: "Entrar",
          tabMgr: "Responsable", tabWork: "Miembro del equipo", tabLocal: "Solo este navegador",
          localNote: "Trabaja sin iniciar sesión — los proyectos se quedan en este navegador.",
          localGo: "Continuar sin iniciar sesión", bad: "Email o contraseña incorrectos.",
          badPin: "Nombre o PIN incorrectos.", needPin: "Introduce tu PIN de 4 dígitos.",
          needWs: "Introduce el código del espacio.",
          noWs: "Esta cuenta aún no tiene espacio de trabajo. Entra en la app DB para crear uno.",
          out: "Salir", cloudWs: "Los proyectos se guardan en el espacio", localMode: "Modo local", toDb: "A proyecto DB", backupAll: "Copia de todo", restoreAll: "Restaurar" }
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

  /* ── workspace-scoped cloud storage over the shared `fabflow` table ────── */
  function prefix() { return "fab_" + WS + "_offer_"; }
  function headers() {
    return { apikey: SB_KEY, Authorization: "Bearer " + (TOKEN || SB_KEY),
             "Content-Type": "application/json" };
  }
  function installCloudOverrides() {
    window.cloudOn = function () { return !LOCAL_ONLY && !!(WS && SB_URL && SB_KEY); };
    window.cloudCfg = function () { return { url: SB_URL, key: SB_KEY }; };
    window.cloudHeaders = headers;

    window.cloudList = async function () {
      var url = SB_URL + "/rest/v1/fabflow?key=like." + encodeURIComponent(prefix() + "*") +
                "&select=key,value,updated_at&order=updated_at.desc";
      var r = await fetch(url, { headers: headers() });
      if (!r.ok) throw new Error("HTTP " + r.status);
      var rows = await r.json();
      var out = [];
      rows.forEach(function (row) {
        var name = String(row.key || "").slice(prefix().length);
        if (!name) return;
        var data = null;
        try { data = JSON.parse(row.value || "null"); } catch (e) { return; }
        if (data) out.push({ name: name, data: data, updated_at: row.updated_at });
      });
      return out;
    };
    window.cloudSave = async function (name, data) {
      var r = await fetch(SB_URL + "/rest/v1/fabflow?on_conflict=key", {
        method: "POST",
        headers: Object.assign(headers(), { Prefer: "resolution=merge-duplicates,return=minimal" }),
        body: JSON.stringify({ key: prefix() + name, value: JSON.stringify(data),
                               updated_at: new Date().toISOString() })
      });
      if (!r.ok) throw new Error("HTTP " + r.status + " " + (await r.text()));
    };
    window.cloudDelete = async function (name) {
      var r = await fetch(SB_URL + "/rest/v1/fabflow?key=eq." + encodeURIComponent(prefix() + name),
        { method: "DELETE", headers: headers() });
      if (!r.ok) throw new Error("HTTP " + r.status);
    };
    // The hand-configured cloud panel makes no sense once we own the connection.
    window.saveCloudCfg = function () {};
    window.disconnectCloud = function () {};
    window.testCloud = async function () { renderCloudRow(); };
    window.renderCloudStatus = renderCloudRow;
  }
  function renderCloudRow() {
    var box = document.getElementById("cloudStatus");
    if (box) box.textContent = LOCAL_ONLY ? t("localMode") : (t("cloudWs") + " " + WS);
    ["cloudUrl", "cloudKey"].forEach(function (id) {
      var e = document.getElementById(id);
      if (e) { var w = e.closest(".f") || e.parentElement; if (w) w.style.display = "none"; }
    });
    document.querySelectorAll('[onclick*="saveCloudCfg"],[onclick*="disconnectCloud"]')
      .forEach(function (b) { b.style.display = "none"; });
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
  setInterval(async function () {
    if (LOCAL_ONLY || !REFRESH) return;
    if (TOK_EXP && TOK_EXP < Date.now() + 120000) {
      var d = await refreshTok(REFRESH).catch(function () { return {}; });
      if (d.access_token) {
        TOKEN = d.access_token; REFRESH = d.refresh_token || REFRESH;
        TOK_EXP = Date.now() + ((d.expires_in || 3600) * 1000); saveTok();
      }
    }
  }, 60000);

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
    style();
    var w = document.createElement("div");
    w.id = "cos-login";
    w.setAttribute("role", "dialog");
    w.setAttribute("aria-modal", "true");
    w.innerHTML = ''
      + '<div class="box">'
      +   '<div class="lg"><img src="shared/craftos-logo.png" alt="' + esc(BRAND) + '"></div>'
      +   '<div class="kick">Offer</div>'
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
    if (!PAYWALL || LOCAL_ONLY || !WS || !window.FabsuiteLicense) return true;
    try {
      window.FabsuiteLicense.config({ supabaseUrl: SB_URL, anonKey: SB_KEY,
        fabsuiteUrl: FABSUITE_URL, app: APP_CODE, brand: BRAND,
        supportEmail: SUPPORT_EMAIL, lang: lang() });
      var ok = await window.FabsuiteLicense.gate({ workspaceCode: WS, token: TOKEN,
        onSignOut: function () { clearTok(); location.reload(); } });
      if (!ok) hideLogin();     // the paywall replaces the login box
      return ok;
    } catch (e) { console.warn("gate (non-fatal):", e && e.message); return true; }
  }

  /* ── brand + workspace chip in the app header ──────────────────────────── */
  function brand() {
    document.title = BRAND + " — Offer";
    var lg = document.getElementById("brandLogo");
    if (lg) {
      // The header slot is 38px tall and sits left of the app name, so it takes
      // the square mark; the full wordmark would run into the title.
      lg.src = "shared/craftos-icon.png";
      lg.alt = BRAND;
      lg.style.height = "30px";
      lg.style.filter = "brightness(0) invert(1)";   // navy mark on the dark bar
    }
    var fav = document.querySelector('link[rel="icon"]');
    if (!fav) { fav = document.createElement("link"); fav.rel = "icon"; document.head.appendChild(fav); }
    fav.href = "shared/craftos-favicon.png";
  }
  function headerChip() {
    if (document.getElementById("cos-bar")) return;
    // Sit next to the language switch, which lives in the app's top bar.
    var host = (document.getElementById("lt") || {}).parentElement;
    if (!host) return;
    var bar = document.createElement("span");
    bar.id = "cos-bar";
    // The cross-app links work in local mode too — the hand-off is a URL, not a
    // database write — so only the identity and sign-out are conditional.
    bar.innerHTML =
      (LOCAL_ONLY
        ? '<span>' + esc(t("localMode")) + '</span>'
        : '<span>' + esc(ME || "") + ' · <b>' + esc(WS) + '</b></span>')
      + (CRM_URL ? '<a href="' + esc(CRM_URL) + '" target="_blank" rel="noopener" '
          + 'style="color:#8b93a5;text-decoration:none">CRM&nbsp;&#8599;</a>' : '')
      + (INVOICES_URL ? '<a href="' + esc(INVOICES_URL) + '" target="_blank" rel="noopener" '
          + 'style="color:#8b93a5;text-decoration:none">Invoices&nbsp;&#8599;</a>' : '')
      + (DB_URL ? '<button id="cos-todb" title="' + esc(t("toDb")) + '">' + esc(t("toDb")) + ' &#8599;</button>' : '')
      + (LOCAL_ONLY ? '' : '<button id="cos-out">' + esc(t("out")) + '</button>');
    host.insertBefore(bar, document.getElementById("lt"));
    var out = document.getElementById("cos-out");
    if (out) out.onclick = signOut;
    var toDb = document.getElementById("cos-todb");
    if (toDb) toDb.onclick = handoffToDb;
  }

  /* ── after a successful login ──────────────────────────────────────────── */
  function afterLogin() {
    brand();
    headerChip();
    renderCloudRow();
    initBackup();
    mountBackupUI();
    if (global.CraftOSBackup) setTimeout(global.CraftOSBackup.checkDaily, 4000);
    // The app cached an empty project list while the login box was up.
    try { if (typeof window.renderProjects === "function") window.renderProjects(); } catch (e) {}
  }

  /* ── hand off an accepted quote to the DB app ──────────────────────────
   * Closes the last gap in the chain: CRM → Offer → DB → Nesting. Carries the
   * project name, the client and the quote total so nothing is retyped.
   * ──────────────────────────────────────────────────────────────────────── */
  function quoteTotal() {
    try {
      var q = global.computeQuote && global.computeQuote();
      if (q && isFinite(q.offerFinal)) return Math.round(q.offerFinal);
      var items = (global.S && global.S.quote && global.S.quote.lineItems) || [];
      return Math.round(items.reduce(function (a, li) {
        return a + (Number(li.qty) || 0) * (Number(li.price) || 0);
      }, 0));
    } catch (e) { return 0; }
  }
  function handoffToDb() {
    if (!DB_URL) return;
    var S = global.S || {};
    var c = S.client || {};
    var q = new URLSearchParams({
      from: "offer",
      project: (S.projectName || "").trim(),
      client: (c.name || "").trim(),
      contact: (c.contact || "").trim(),
      phone: (c.phone || "").trim(),
      email: (c.email || "").trim(),
      value: String(quoteTotal() || ""),
      ws: WS || ""
    });
    global.open(DB_URL + "/?" + q.toString(), "_blank", "noopener");
  }
  global.craftosToDb = handoffToDb;

  /* ── whole-workspace backup ────────────────────────────────────────────
   * The calculator can export the project you have open. This adds the same
   * "every project in one file" backup the other CraftOS apps have, on the
   * shared module so the envelope and the daily nudge match.
   * ──────────────────────────────────────────────────────────────────────── */
  var snapshot = null;
  function initBackup() {
    if (!global.CraftOSBackup) return;
    global.CraftOSBackup.init({
      app: "offer", brand: BRAND,
      workspace: function () { return WS || "LOCAL"; },
      collect: function () { return snapshot; },
      restore: function (data) { restoreSnapshot(data); },
      describe: function (data) { return (((data || {}).projects) || []).length + " projects"; },
      toast: function (m) { if (global.toast) global.toast(m); },
      lang: lang
    });
  }
  async function backupAll() {
    if (!global.CraftOSBackup) return;
    initBackup();
    try {
      var projects = [];
      if (global.cloudOn && global.cloudOn()) {
        var rows = await global.cloudList();
        rows.forEach(function (r) { projects.push({ name: r.name, updated_at: r.updated_at, data: r.data }); });
      } else {
        var all = global.loadProjects ? global.loadProjects() : {};
        Object.keys(all).forEach(function (nm) {
          projects.push({ name: nm, updated_at: new Date(all[nm].savedAt || Date.now()).toISOString(), data: all[nm].data });
        });
      }
      snapshot = { v: 1, projects: projects };
      global.CraftOSBackup.download();
    } catch (e) {
      console.error("backupAll", e);
      if (global.toast) global.toast("Backup failed: " + ((e && e.message) || e));
    }
  }
  async function restoreSnapshot(data) {
    var projects = (data && data.projects) || [];
    if (!projects.length) { if (global.toast) global.toast("Backup has no projects"); return; }
    var ok = 0;
    for (var i = 0; i < projects.length; i++) {
      var pr = projects[i];
      if (!pr || !pr.name || !pr.data) continue;
      try {
        if (global.cloudOn && global.cloudOn()) await global.cloudSave(pr.name, pr.data);
        var all = global.loadProjects ? global.loadProjects() : {};
        all[pr.name] = { savedAt: Date.parse(pr.updated_at || "") || Date.now(), data: pr.data };
        if (global.storeProjects) global.storeProjects(all);
        ok++;
      } catch (e) { console.warn("restore", pr.name, e); }
    }
    if (global.toast) global.toast("Restored " + ok + " projects");
    try { if (global.renderProjects) global.renderProjects(); } catch (e) {}
  }
  global.craftosBackupAll = backupAll;
  global.craftosRestoreAll = function (input) {
    initBackup();
    if (global.CraftOSBackup) global.CraftOSBackup.restoreFromInput(input);
  };

  // Buttons live next to the app's own project controls.
  function mountBackupUI() {
    var host = document.getElementById("projList");
    host = host && host.parentElement;
    if (!host || document.getElementById("cos-backup-row")) return;
    var row = document.createElement("div");
    row.id = "cos-backup-row";
    row.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid #2c3340";
    row.innerHTML =
      '<button class="btn" id="cos-bk">\uD83D\uDCBE ' + esc(t("backupAll")) + "</button>" +
      '<label class="btn" style="margin:0;cursor:pointer">\u21BA ' + esc(t("restoreAll")) +
      '<input type="file" accept="application/json" style="display:none" id="cos-rs"></label>';
    host.appendChild(row);
    document.getElementById("cos-bk").onclick = backupAll;
    document.getElementById("cos-rs").onchange = function () { global.craftosRestoreAll(this); };
  }

  /* ── boot ──────────────────────────────────────────────────────────────── */
  installCloudOverrides();
  brand();

  function start() {
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

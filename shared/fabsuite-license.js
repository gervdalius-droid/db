/* ════════════════════════════════════════════════════════════════════════════
 * Fabsuite license client — shared by the NESTING and DB apps.
 * ────────────────────────────────────────────────────────────────────────────
 * One file, no dependencies. It answers a single question for an app:
 *   "Does this workspace have an active subscription that unlocks ME?"
 * …and, if not, paints a paywall so the user can subscribe or manage billing.
 *
 * USAGE (after the user has logged in and you know their workspace code + token):
 *
 *   <script src="shared/fabsuite-license.js"></script>
 *   FabsuiteLicense.config({
 *     supabaseUrl: 'https://YOURREF.supabase.co',
 *     anonKey:     'eyJ...anon...',
 *     fabsuiteUrl: 'https://fabsuite.app',   // your storefront
 *     app:         'nesting'                  // or 'db'
 *   });
 *   const ok = await FabsuiteLicense.gate({
 *     workspaceCode: WORKSPACE_CODE,
 *     token: accessToken,           // the user's Supabase access token
 *     onSignOut: () => doLogout(),
 *   });
 *   if (!ok) return;                // paywall is showing; stop booting the app
 *
 * Design note: the check FAILS OPEN. A network/Supabase hiccup never locks a
 * paying customer out — only an explicit "inactive" answer shows the paywall.
 * ════════════════════════════════════════════════════════════════════════════ */
(function (global) {
  "use strict";

  var CFG = {
    supabaseUrl: "",
    anonKey: "",
    fabsuiteUrl: "https://fabsuite.app",
    app: "db", // 'nesting' | 'db'
  };

  var APP_LABEL = { nesting: "Nesting", db: "DB" };

  function config(opts) { Object.assign(CFG, opts || {}); return API; }

  function up(s) { return String(s || "").trim().toUpperCase(); }

  // ── Ask Supabase: org_entitlement(workspace_code) ─────────────────────────
  // Returns the entitlement object, or null if the request itself failed.
  async function check(workspaceCode) {
    var code = up(workspaceCode);
    if (!CFG.supabaseUrl || !CFG.anonKey) {
      console.warn("[Fabsuite] license not configured — skipping check");
      return null;
    }
    try {
      var r = await fetch(CFG.supabaseUrl + "/rest/v1/rpc/org_entitlement", {
        method: "POST",
        headers: {
          "apikey": CFG.anonKey,
          "Authorization": "Bearer " + CFG.anonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_code: code }),
      });
      if (!r.ok) return null;
      return await r.json();
    } catch (e) {
      console.warn("[Fabsuite] entitlement check failed:", e && e.message);
      return null;
    }
  }

  function hasAccess(ent, app) {
    if (!ent) return true;                 // unknown → fail open
    app = app || CFG.app;
    if (ent.comp) return true;             // legacy / complimentary → everything
    if (!ent.active) return false;         // no live subscription
    // App-agnostic: the entitlement carries the list of unlocked app codes.
    // A single-app plan has e.g. ['nesting']; the suite expands to ALL apps.
    var apps = ent.apps || [];
    return apps.indexOf(app) >= 0;
  }

  // ── Open the Stripe billing portal for this workspace ─────────────────────
  async function openPortal(workspaceCode, token) {
    try {
      var r = await fetch(CFG.supabaseUrl + "/functions/v1/create-portal-session", {
        method: "POST",
        headers: {
          "apikey": CFG.anonKey,
          "Authorization": "Bearer " + (token || CFG.anonKey),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workspace_code: up(workspaceCode) }),
      });
      var d = await r.json();
      if (d.url) { global.location.href = d.url; return; }
      alert(d.error || "Nepavyko atidaryti atsiskaitymų portalo.");
    } catch (e) { alert("Klaida: " + (e && e.message)); }
  }

  function pricingUrl(workspaceCode) {
    var base = String(CFG.fabsuiteUrl || "").replace(/\/+$/, "");
    return base + "/index.html?ws=" + encodeURIComponent(up(workspaceCode)) + "&app=" + CFG.app + "#pricing";
  }

  // ── Paywall overlay ───────────────────────────────────────────────────────
  function showPaywall(opts) {
    opts = opts || {};
    var app = opts.app || CFG.app;
    var ent = opts.ent || {};
    var code = up(opts.workspaceCode);
    var label = APP_LABEL[app] || app;

    var trialEnded = ent.status === "canceled" || ent.status === "unpaid";
    var pastDue = ent.status === "past_due";
    var headline = pastDue ? "Atsiskaitymas nepavyko"
      : trialEnded ? "Prenumerata pasibaigė"
      : "Reikalinga prenumerata";
    var sub = pastDue
      ? "Jūsų mokėjimas nepavyko. Atnaujinkite mokėjimo būdą, kad tęstumėte darbą su " + label + "."
      : "Norėdami naudoti " + label + ", pasirinkite planą. Darbo vietos kodas: <b>" + code + "</b>.";

    var id = "fabsuite-paywall";
    var old = document.getElementById(id); if (old) old.remove();

    var wrap = document.createElement("div");
    wrap.id = id;
    wrap.setAttribute("style", [
      "position:fixed", "inset:0", "z-index:2147483000",
      "display:flex", "align-items:center", "justify-content:center",
      "background:rgba(17,17,16,.72)", "backdrop-filter:blur(6px)",
      "font-family:'Sora',system-ui,sans-serif", "padding:20px",
    ].join(";"));

    wrap.innerHTML =
      '<div style="max-width:440px;width:100%;background:#fff;border-radius:18px;' +
        'box-shadow:0 20px 60px rgba(0,0,0,.35);padding:30px 28px;text-align:center;color:#1a1916">' +
        '<div style="font-size:34px;margin-bottom:10px">' + (pastDue ? "💳" : "🔒") + "</div>" +
        '<div style="font-size:13px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#7c3aed;margin-bottom:6px">Fabsuite · ' + label + "</div>" +
        '<h2 style="font-size:21px;font-weight:700;margin:0 0 10px">' + headline + "</h2>" +
        '<p style="font-size:14px;line-height:1.55;color:#6b6860;margin:0 0 22px">' + sub + "</p>" +
        '<div style="display:flex;flex-direction:column;gap:10px">' +
          '<a href="' + pricingUrl(code) + '" style="display:block;background:#2563eb;color:#fff;font-weight:600;' +
            'font-size:15px;padding:13px;border-radius:11px;text-decoration:none">Pasirinkti planą →</a>' +
          '<button id="fabsuite-pw-portal" style="background:#f0efe9;color:#1a1916;font-weight:600;font-size:14px;' +
            'padding:12px;border-radius:11px;border:0;cursor:pointer">Valdyti atsiskaitymus</button>' +
          '<button id="fabsuite-pw-logout" style="background:transparent;color:#a8a49c;font-size:13px;' +
            'padding:8px;border:0;cursor:pointer">Atsijungti</button>' +
        "</div>" +
        '<div style="font-size:11px;color:#a8a49c;margin-top:18px">Klausimai? <a href="mailto:' +
          'pagalba@fabsuite.app" style="color:#6b6860">pagalba@fabsuite.app</a></div>' +
      "</div>";

    document.body.appendChild(wrap);
    var pBtn = document.getElementById("fabsuite-pw-portal");
    if (pBtn) pBtn.onclick = function () { openPortal(code, opts.token); };
    var lBtn = document.getElementById("fabsuite-pw-logout");
    if (lBtn) lBtn.onclick = function () { if (opts.onSignOut) opts.onSignOut(); else global.location.reload(); };
    return wrap;
  }

  function hidePaywall() { var e = document.getElementById("fabsuite-paywall"); if (e) e.remove(); }

  // ── One-call gate: returns true if allowed, else shows paywall + false ─────
  async function gate(opts) {
    opts = opts || {};
    var app = opts.app || CFG.app;
    var ent = await check(opts.workspaceCode);
    if (hasAccess(ent, app)) { hidePaywall(); return true; }
    showPaywall({ app: app, ent: ent, workspaceCode: opts.workspaceCode, token: opts.token, onSignOut: opts.onSignOut });
    return false;
  }

  var API = { config: config, check: check, hasAccess: hasAccess, gate: gate,
    showPaywall: showPaywall, hidePaywall: hidePaywall, openPortal: openPortal, pricingUrl: pricingUrl,
    _cfg: CFG };
  global.FabsuiteLicense = API;
})(typeof window !== "undefined" ? window : this);

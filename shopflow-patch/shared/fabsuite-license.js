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
    app: "db",                       // 'nesting' | 'db' | 'crm' | 'offer' | 'invoices'
    brand: "CraftOS",
    supportEmail: "",                // shown at the foot of the paywall
    lang: "",                        // force a language; otherwise auto-detected
  };

  var APP_LABEL = { nesting: "Nesting", db: "DB", crm: "CRM", offer: "Offer", invoices: "Invoices" };

  // ── Paywall copy, in the four languages the suite ships ───────────────────
  var T = {
    lt: { pastDue: "Atsiskaitymas nepavyko", ended: "Prenumerata pasibaigė",
          need: "Reikalinga prenumerata",
          subDue: "Jūsų mokėjimas nepavyko. Atnaujinkite mokėjimo būdą, kad tęstumėte darbą su {app}.",
          subNeed: "Norėdami naudoti {app}, pasirinkite planą. Darbo vietos kodas: <b>{code}</b>.",
          pick: "Pasirinkti planą", billing: "Valdyti atsiskaitymus",
          out: "Atsijungti", ask: "Klausimai?" },
    en: { pastDue: "Payment failed", ended: "Subscription ended",
          need: "Subscription required",
          subDue: "Your payment failed. Update your payment method to keep using {app}.",
          subNeed: "Choose a plan to use {app}. Workspace code: <b>{code}</b>.",
          pick: "Choose a plan", billing: "Manage billing",
          out: "Sign out", ask: "Questions?" },
    de: { pastDue: "Zahlung fehlgeschlagen", ended: "Abo beendet",
          need: "Abo erforderlich",
          subDue: "Ihre Zahlung ist fehlgeschlagen. Aktualisieren Sie Ihre Zahlungsmethode, um {app} weiter zu nutzen.",
          subNeed: "Wählen Sie einen Tarif, um {app} zu nutzen. Arbeitsbereich-Code: <b>{code}</b>.",
          pick: "Tarif wählen", billing: "Abrechnung verwalten",
          out: "Abmelden", ask: "Fragen?" },
    es: { pastDue: "Pago fallido", ended: "Suscripción finalizada",
          need: "Se requiere suscripción",
          subDue: "Tu pago ha fallado. Actualiza tu método de pago para seguir usando {app}.",
          subNeed: "Elige un plan para usar {app}. Código del espacio de trabajo: <b>{code}</b>.",
          pick: "Elegir plan", billing: "Gestionar facturación",
          out: "Cerrar sesión", ask: "¿Preguntas?" },
  };

  // The apps store the chosen language under their own key; honour either, then
  // fall back to the browser locale.
  function lang() {
    if (T[CFG.lang]) return CFG.lang;
    var v = "";
    try { v = localStorage.getItem("fab_lang") || localStorage.getItem("fabflow_lang") || ""; } catch (e) {}
    if (T[v]) return v;
    var bl = String((global.navigator && navigator.language) || "").toLowerCase();
    if (bl.indexOf("lt") === 0) return "lt";
    if (bl.indexOf("de") === 0) return "de";
    if (bl.indexOf("es") === 0) return "es";
    return "en";
  }
  function t(key, vars) {
    var s = (T[lang()] || T.en)[key] || (T.en[key] || key);
    return s.replace(/\{(\w+)\}/g, function (_, k) { return (vars && vars[k] != null) ? vars[k] : ""; });
  }

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
    var headline = pastDue ? t("pastDue") : trialEnded ? t("ended") : t("need");
    var sub = pastDue ? t("subDue", { app: label }) : t("subNeed", { app: label, code: code });
    var brand = CFG.brand || "CraftOS";
    var mail = CFG.supportEmail || "";

    var id = "fabsuite-paywall";
    var old = document.getElementById(id); if (old) old.remove();

    var wrap = document.createElement("div");
    wrap.id = id;
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.setAttribute("aria-label", brand + " · " + label);
    wrap.setAttribute("style", [
      "position:fixed", "inset:0", "z-index:2147483000",
      "display:flex", "align-items:center", "justify-content:center",
      "background:rgba(17,17,16,.72)", "backdrop-filter:blur(6px)",
      "font-family:'Sora',system-ui,sans-serif", "padding:20px",
    ].join(";"));

    function esc(v) {
      return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    }

    wrap.innerHTML =
      '<div style="max-width:440px;width:100%;background:#fff;border-radius:18px;' +
        'box-shadow:0 20px 60px rgba(0,0,0,.35);padding:30px 28px;text-align:center;color:#1a1916">' +
        '<div style="font-size:34px;margin-bottom:10px" aria-hidden="true">' + (pastDue ? "\uD83D\uDCB3" : "\uD83D\uDD12") + "</div>" +
        '<div style="font-size:13px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#7c3aed;margin-bottom:6px">' +
          esc(brand) + " \u00B7 " + esc(label) + "</div>" +
        '<h2 style="font-size:21px;font-weight:700;margin:0 0 10px">' + esc(headline) + "</h2>" +
        '<p style="font-size:14px;line-height:1.55;color:#6b6860;margin:0 0 22px">' + sub + "</p>" +
        '<div style="display:flex;flex-direction:column;gap:10px">' +
          '<a href="' + esc(pricingUrl(code)) + '" style="display:block;background:#2563eb;color:#fff;font-weight:600;' +
            'font-size:15px;padding:13px;border-radius:11px;text-decoration:none">' + esc(t("pick")) + ' \u2192</a>' +
          '<button id="fabsuite-pw-portal" style="background:#f0efe9;color:#1a1916;font-weight:600;font-size:14px;' +
            'padding:12px;border-radius:11px;border:0;cursor:pointer">' + esc(t("billing")) + "</button>" +
          '<button id="fabsuite-pw-logout" style="background:transparent;color:#a8a49c;font-size:13px;' +
            'padding:8px;border:0;cursor:pointer">' + esc(t("out")) + "</button>" +
        "</div>" +
        (mail
          ? '<div style="font-size:11px;color:#a8a49c;margin-top:18px">' + esc(t("ask")) + ' <a href="mailto:' +
              esc(mail) + '" style="color:#6b6860">' + esc(mail) + "</a></div>"
          : "") +
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

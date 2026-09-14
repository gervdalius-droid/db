/* ════════════════════════════════════════════════════════════════════════════
 * Launch readiness gate.
 * ────────────────────────────────────────────────────────────────────────────
 * The storefront can verify, from the browser, the two things that must be true
 * before it is allowed to take anyone's money — and it refuses to sell until
 * they are. This is not a checklist item that can be forgotten; it is a
 * property of the shipped page.
 *
 *   1. TENANT ISOLATION. Ask the API for a workspace row using nothing but the
 *      publishable key that ships in this page. If rows come back, then every
 *      customer can read every other customer's data (migration 0005 has not
 *      been applied) and we must not sign anyone up.
 *   2. LEGAL IDENTITY. Terms and Privacy have to name a real seller with a
 *      registration number and an address, or a paying customer is agreeing to
 *      a document with blanks in it.
 *
 * FAILURE DIRECTION. It blocks only on POSITIVE evidence of a problem — rows
 * actually returned, or a config field actually empty. A network error, a
 * timeout or an unreadable answer leaves the page alone: a hiccup at the API
 * must never take the storefront down. Same asymmetry as the paywall, which
 * fails open so an outage cannot lock out a paying customer.
 *
 * Add ?readiness=1 to any storefront page for the full diagnosis.
 * ════════════════════════════════════════════════════════════════════════════ */
(function (g) {
  "use strict";

  var C = g.FABSUITE || {};
  var L = C.LEGAL || {};
  var REQUIRED_LEGAL = ["company", "reg_no", "address", "email"];

  var T = {
    lt: { head: "Registracija laikinai uždaryta",
          body: "Baigiame paruošti sistemą. Parašykite mums ir pranešime, kai bus galima prisiregistruoti.",
          cta: "Parašyti mums" },
    en: { head: "Sign-up is paused",
          body: "We are finishing the setup. Write to us and we will tell you the moment it opens.",
          cta: "Write to us" },
    de: { head: "Registrierung pausiert",
          body: "Wir schließen die Einrichtung ab. Schreiben Sie uns — wir melden uns, sobald es losgeht.",
          cta: "Schreiben Sie uns" },
    es: { head: "Registro en pausa",
          body: "Estamos terminando la configuración. Escríbenos y te avisamos en cuanto abra.",
          cta: "Escríbenos" }
  };
  function lang() {
    try { var v = localStorage.getItem("fabsuite_lang") || localStorage.getItem("fab_lang");
          if (T[v]) return v; } catch (e) {}
    var b = String((g.navigator && navigator.language) || "").toLowerCase();
    if (b.indexOf("lt") === 0) return "lt";
    if (b.indexOf("de") === 0) return "de";
    if (b.indexOf("es") === 0) return "es";
    return "en";
  }
  function t(k) { return (T[lang()] || T.en)[k]; }

  // ── the checks ───────────────────────────────────────────────────────────
  function legalGaps() {
    return REQUIRED_LEGAL.filter(function (k) {
      return !String(L[k] || "").trim();
    });
  }

  // Resolves to true (isolated), false (leaking) or null (could not tell).
  function isolationOk() {
    if (!C.SUPABASE_URL || !C.SUPABASE_ANON_KEY) return Promise.resolve(null);
    var ctl = ("AbortController" in g) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);
    return fetch(C.SUPABASE_URL + "/rest/v1/fabflow?select=key&limit=1", {
      headers: { apikey: C.SUPABASE_ANON_KEY },
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      clearTimeout(timer);
      if (r.status === 401 || r.status === 403) return true;   // refused — good
      if (!r.ok) return null;                                   // unknown
      return r.json().then(function (rows) {
        return !(Array.isArray(rows) && rows.length > 0);       // rows = leaking
      }).catch(function () { return null; });
    }).catch(function () { clearTimeout(timer); return null; });
  }

  // ── what the visitor sees when we will not sell ──────────────────────────
  function block(reasons) {
    // Kill every route into checkout.
    document.querySelectorAll('a[href*="signup.html"]').forEach(function (a) {
      a.setAttribute("aria-disabled", "true");
      a.style.pointerEvents = "none";
      a.style.opacity = ".45";
      a.removeAttribute("href");
    });
    var form = document.getElementById("signup-form") || document.querySelector("form");
    var go = document.getElementById("go");
    if (go) { go.disabled = true; go.style.opacity = ".45"; go.style.pointerEvents = "none"; }
    if (form) form.addEventListener("submit", function (e) { e.preventDefault(); }, true);
    if (g.submitForm) g.submitForm = function () { return false; };

    if (document.getElementById("readiness-note")) return;
    var mail = C.SUPPORT_EMAIL || L.email || "";
    var bar = document.createElement("div");
    bar.id = "readiness-note";
    bar.setAttribute("role", "status");
    bar.style.cssText =
      "position:sticky;top:0;z-index:900;background:#fffbeb;color:#7c5008;" +
      "border-bottom:1px solid #f2d98c;padding:11px 18px;font-size:14px;" +
      "line-height:1.5;text-align:center;font-family:inherit";
    bar.innerHTML = "<b>" + t("head") + "</b> — " + t("body") +
      (mail ? ' <a href="mailto:' + mail + '" style="color:#7c5008;font-weight:600">' +
              t("cta") + "</a>" : "");
    document.body.insertBefore(bar, document.body.firstChild);
    console.warn("[CraftOS] sign-up blocked:\n  - " + reasons.join("\n  - "));
  }

  function diagnose(iso, gaps) {
    var rows = [
      ["tenant isolation (migration 0005)",
       iso === true ? "OK — the publishable key is refused"
       : iso === false ? "OPEN — this key can read tenant rows"
       : "unknown — could not reach the API"],
      ["legal identity (LEGAL in config)",
       gaps.length ? "incomplete — missing: " + gaps.join(", ") : "OK"],
      ["checkout", (C.FREE_SIGNUP ? "free signup (no card taken)" : "live (Stripe)")],
      ["trial", (C.TRIAL_DAYS || "?") + " days"],
      ["support address", C.SUPPORT_EMAIL || "(none)"]
    ];
    var box = document.createElement("pre");
    box.style.cssText = "margin:0;padding:16px;background:#111;color:#ddd;" +
      "font:12px/1.7 ui-monospace,Menlo,monospace;white-space:pre-wrap";
    box.textContent = "CraftOS launch readiness\n\n" + rows.map(function (r) {
      return "  " + (r[0] + "                                  ").slice(0, 34) + r[1];
    }).join("\n");
    document.body.insertBefore(box, document.body.firstChild);
  }

  function run() {
    var gaps = legalGaps();
    isolationOk().then(function (iso) {
      if (/[?&]readiness=1/.test(g.location.search)) diagnose(iso, gaps);
      // Free signup takes no money, so incomplete terms are not yet a problem;
      // leaking tenant data is a problem either way.
      var reasons = [];
      if (iso === false) reasons.push("tenant isolation is open — migration 0005 is not applied");
      if (!C.FREE_SIGNUP && gaps.length) reasons.push("checkout is live but LEGAL is missing: " + gaps.join(", "));
      if (reasons.length) block(reasons);
      g.CraftOSReadiness = { isolated: iso, legalGaps: gaps, blocked: reasons };
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})(window);

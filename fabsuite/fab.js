/* Fabsuite storefront — shared helpers (Supabase auth + edge function calls). */
(function (g) {
  "use strict";
  var C = g.FABSUITE;
  var URL = C.SUPABASE_URL, KEY = C.SUPABASE_ANON_KEY;

  function headers(token) {
    return {
      "apikey": KEY,
      "Authorization": "Bearer " + (token || KEY),
      "Content-Type": "application/json",
    };
  }

  // ── Supabase auth (raw REST, no SDK) ──────────────────────────────────────
  async function signUp(email, password) {
    var r = await fetch(URL + "/auth/v1/signup", {
      method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password }),
    });
    return r.json();
  }
  async function signIn(email, password) {
    var r = await fetch(URL + "/auth/v1/token?grant_type=password", {
      method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password }),
    });
    return r.json();
  }
  function saveSession(s) {
    try { localStorage.setItem("fabsuite_session", JSON.stringify({ access: s.access_token, refresh: s.refresh_token, email: s.user && s.user.email, id: s.user && s.user.id })); } catch (e) {}
  }
  function loadSession() {
    try { return JSON.parse(localStorage.getItem("fabsuite_session") || "null"); } catch (e) { return null; }
  }
  function clearSession() { try { localStorage.removeItem("fabsuite_session"); } catch (e) {} }

  // ── Edge functions ────────────────────────────────────────────────────────
  async function callFn(name, body, token) {
    var r = await fetch(URL + "/functions/v1/" + name, {
      method: "POST", headers: headers(token), body: JSON.stringify(body || {}),
    });
    var d = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(d.error || ("HTTP " + r.status));
    return d;
  }
  async function rpc(name, args, token) {
    var r = await fetch(URL + "/rest/v1/rpc/" + name, {
      method: "POST", headers: headers(token), body: JSON.stringify(args || {}),
    });
    if (!r.ok) return null;
    return r.json();
  }

  // ── helpers ───────────────────────────────────────────────────────────────
  function genCode() { return Math.random().toString(36).slice(2, 7).toUpperCase(); }
  function qs(name) {
    var m = new RegExp("[?&]" + name + "=([^&#]*)").exec(g.location.search);
    return m ? decodeURIComponent(m[1]) : "";
  }
  function fmt(n) { return C.CURRENCY + n; }

  // Full signup → provision workspace → start Stripe checkout.
  // Returns {url} to redirect to, or throws.
  async function signupAndCheckout(opts) {
    // opts: {email, password, company, plan, interval}
    // DEMO MODE (?demo=1): skip Supabase + Stripe entirely and jump to a fake
    // success page, so the whole flow is clickable with no setup.
    if (qs("demo") === "1") {
      var demoCode = genCode();
      return { url: "success.html?ws=" + demoCode + "&demo=1", code: demoCode };
    }
    var res = await signUp(opts.email, opts.password);
    if (res.error || res.msg || res.error_description) {
      // maybe the account already exists → try sign in
      var si = await signIn(opts.email, opts.password);
      if (!si.access_token) throw new Error(res.msg || res.error_description || "Nepavyko sukurti paskyros");
      res = si;
    }
    if (!res.access_token) throw new Error("Nepavyko sukurti paskyros");
    saveSession(res);
    var token = res.access_token;

    // Provision a workspace (retry once on code collision).
    var code = genCode(), reg;
    for (var i = 0; i < 3; i++) {
      try { reg = await callFn("register-org", { workspace_code: code, name: opts.company, email: opts.email }, token); break; }
      catch (e) { if (String(e.message).indexOf("taken") >= 0) { code = genCode(); continue; } throw e; }
    }
    if (!reg) throw new Error("Nepavyko sukurti darbo vietos");

    // Start checkout for the chosen plan.
    var co = await callFn("create-checkout-session", {
      plan: opts.plan, interval: opts.interval, workspace_code: code, email: opts.email,
    }, token);
    return { url: co.url, code: code };
  }

  g.Fab = {
    cfg: C, signUp: signUp, signIn: signIn, callFn: callFn, rpc: rpc,
    saveSession: saveSession, loadSession: loadSession, clearSession: clearSession,
    genCode: genCode, qs: qs, fmt: fmt, signupAndCheckout: signupAndCheckout,
  };
})(window);

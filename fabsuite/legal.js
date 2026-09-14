/* ════════════════════════════════════════════════════════════════════════════
 * Shared plumbing for terms.html / privacy.html.
 * Renders the legal text in the reader's language and substitutes the entity
 * details from FABSUITE.LEGAL. Anything the operator has not filled in yet is
 * rendered as a loud placeholder rather than silently omitted — an unnamed
 * controller is exactly the thing these documents must not have.
 * ════════════════════════════════════════════════════════════════════════════ */
(function (g) {
  "use strict";
  var C = g.FABSUITE || {};
  var L = C.LEGAL || {};
  var BRAND = C.BRAND || "CraftOS";

  function todo(what) {
    return '<mark class="todo" title="Set FABSUITE.LEGAL in config.js">' +
           "[ " + what + " ]</mark>";
  }
  var V = {
    brand: BRAND,
    company: L.company || todo("COMPANY NAME"),
    reg_no: L.reg_no || todo("REG. NO"),
    vat_no: L.vat_no || todo("VAT NO"),
    address: L.address || todo("REGISTERED ADDRESS"),
    email: L.email || C.SUPPORT_EMAIL || todo("CONTACT EMAIL"),
    country: L.country || "Lietuva",
    effective: L.effective || new Date().toISOString().slice(0, 10),
    trial: C.TRIAL_DAYS || 14,
    site: g.location.origin + g.location.pathname.replace(/\/[^\/]*$/, "")
  };
  function fill(s) {
    return String(s).replace(/\{(\w+)\}/g, function (m, k) {
      return V[k] != null ? V[k] : m;
    });
  }

  // Which language to show. These documents ship in English (governing) and
  // Lithuanian; a reader on the German or Spanish storefront gets English,
  // because a machine-translated contract is worse than an honest one.
  function lang() {
    var q = /[?&]lang=(\w+)/.exec(g.location.search);
    if (q && (q[1] === "lt" || q[1] === "en")) return q[1];
    var v = "";
    try { v = localStorage.getItem("fabsuite_lang") || ""; } catch (e) {}
    if (v === "lt") return "lt";
    if (v) return "en";
    return /^lt/i.test(g.navigator.language || "") ? "lt" : "en";
  }

  g.Legal = {
    render: function (doc) {
      var lg = lang(), d = doc[lg] || doc.en;
      document.documentElement.lang = lg;
      document.title = d.title + " — " + BRAND;
      var host = document.getElementById("doc");
      host.innerHTML =
        '<h1>' + d.title + "</h1>" +
        '<p class="eff">' + fill(d.effective) + "</p>" +
        d.body.map(function (sec) {
          return "<h2>" + fill(sec[0]) + "</h2>" +
            sec.slice(1).map(function (p) {
              return /^<(ul|ol|table)/.test(p) ? fill(p) : "<p>" + fill(p) + "</p>";
            }).join("");
        }).join("");
      document.querySelectorAll("[data-brand]").forEach(function (e) { e.textContent = BRAND; });
      var y = document.getElementById("yr"); if (y) y.textContent = new Date().getFullYear();
      // language switch
      var sw = document.getElementById("lgsw");
      if (sw) {
        sw.innerHTML = ["en", "lt"].map(function (c) {
          return '<a href="?lang=' + c + '"' + (c === lg ? ' class="on"' : "") + ">" +
                 c.toUpperCase() + "</a>";
        }).join("");
      }
      var other = document.getElementById("otherdoc");
      if (other) other.href = other.getAttribute("data-href") + "?lang=" + lg;
    }
  };
})(window);

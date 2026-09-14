/* ════════════════════════════════════════════════════════════════════════════
 * CraftOS — shared backup / restore.
 * ────────────────────────────────────────────────────────────────────────────
 * One behaviour for every app in the suite: download a dated JSON snapshot,
 * restore one back (with a confirmation that says exactly what is about to be
 * replaced), and a once-a-day nudge so a workshop never runs for weeks with no
 * copy of its data.
 *
 * The file format is a thin envelope around whatever the app hands over:
 *
 *   { "craftos_backup": 1, "app": "crm", "workspace": "AB12C",
 *     "exportedAt": "2026-09-05T10:11:12.000Z", "data": { … } }
 *
 * The DB app's own restore already tolerates a `{data:{…}}` wrapper, so files
 * stay readable across the suite rather than being per-app dialects.
 *
 * USAGE
 *   <script src="shared/craftos-backup.js"></script>
 *   CraftOSBackup.init({
 *     app: 'crm', brand: 'CraftOS',
 *     workspace: () => WS,          // current workspace code (or '')
 *     collect:   () => D,           // the object to snapshot
 *     restore:   (data) => { … },   // apply a snapshot
 *     describe:  (data) => '3 clients · 8 deals',   // optional
 *     canRestore:() => true,        // optional permission gate
 *     toast:     (msg, kind) => {}, // optional
 *     lang:      () => 'lt'         // optional; else reads fab_lang
 *   });
 *   CraftOSBackup.download();
 *   CraftOSBackup.restoreFromInput(inputEl);
 *   CraftOSBackup.checkDaily();
 * ════════════════════════════════════════════════════════════════════════════ */
(function (global) {
  "use strict";

  var CFG = null;

  var T = {
    lt: {
      done: "💾 Atsarginė kopija atsisiųsta",
      failed: "Nepavyko sukurti kopijos",
      readFail: "Nepavyko perskaityti failo",
      notBackup: "Tai ne CraftOS atsarginė kopija.",
      wrongApp: "Ši kopija yra iš „{app}“ programos, ne iš „{here}“.",
      noRight: "Atkurti duomenis gali tik vadovas",
      confirm: "⚠ ATKURTI IŠ ATSARGINĖS KOPIJOS?\n\nVISI dabartiniai duomenys bus PAKEISTI:\n{what}\n\nKopija sukurta: {when}\n\nPatarimas: pirma atsisiųskite dabartinę kopiją.\n\nTęsti?",
      restored: "✅ Duomenys atkurti",
      dailyTitle: "Dienos atsarginė kopija",
      dailyBody: "Šiandien dar nesukurta atsarginė kopija. Atsisiųsti?",
      dl: "📥 Atsisiųsti", later: "Atidėti"
    },
    en: {
      done: "💾 Backup downloaded",
      failed: "Could not create the backup",
      readFail: "Could not read that file",
      notBackup: "That is not a CraftOS backup file.",
      wrongApp: "This backup is from “{app}”, not “{here}”.",
      noRight: "Only a manager can restore data",
      confirm: "⚠ RESTORE FROM BACKUP?\n\nALL current data will be REPLACED:\n{what}\n\nBackup taken: {when}\n\nTip: download a copy of the current data first.\n\nContinue?",
      restored: "✅ Data restored",
      dailyTitle: "Daily backup",
      dailyBody: "No backup taken today. Download one?",
      dl: "📥 Download", later: "Later"
    },
    de: {
      done: "💾 Sicherung heruntergeladen",
      failed: "Sicherung konnte nicht erstellt werden",
      readFail: "Datei konnte nicht gelesen werden",
      notBackup: "Das ist keine CraftOS-Sicherungsdatei.",
      wrongApp: "Diese Sicherung stammt aus „{app}“, nicht aus „{here}“.",
      noRight: "Nur die Leitung kann Daten wiederherstellen",
      confirm: "⚠ AUS SICHERUNG WIEDERHERSTELLEN?\n\nALLE aktuellen Daten werden ERSETZT:\n{what}\n\nSicherung vom: {when}\n\nTipp: Laden Sie zuerst eine Kopie der aktuellen Daten herunter.\n\nFortfahren?",
      restored: "✅ Daten wiederhergestellt",
      dailyTitle: "Tägliche Sicherung",
      dailyBody: "Heute wurde noch keine Sicherung erstellt. Jetzt herunterladen?",
      dl: "📥 Herunterladen", later: "Später"
    },
    es: {
      done: "💾 Copia de seguridad descargada",
      failed: "No se pudo crear la copia",
      readFail: "No se pudo leer el archivo",
      notBackup: "Ese archivo no es una copia de CraftOS.",
      wrongApp: "Esta copia es de «{app}», no de «{here}».",
      noRight: "Solo un responsable puede restaurar datos",
      confirm: "⚠ ¿RESTAURAR DESDE LA COPIA?\n\nTODOS los datos actuales se REEMPLAZARÁN:\n{what}\n\nCopia del: {when}\n\nConsejo: descarga antes una copia de los datos actuales.\n\n¿Continuar?",
      restored: "✅ Datos restaurados",
      dailyTitle: "Copia diaria",
      dailyBody: "Hoy todavía no hay copia de seguridad. ¿Descargar una?",
      dl: "📥 Descargar", later: "Más tarde"
    }
  };

  function lang() {
    var v = CFG && CFG.lang && CFG.lang();
    if (T[v]) return v;
    try { v = localStorage.getItem("fab_lang"); if (T[v]) return v; } catch (e) {}
    var b = String((global.navigator && navigator.language) || "").toLowerCase();
    if (b.indexOf("lt") === 0) return "lt";
    if (b.indexOf("de") === 0) return "de";
    if (b.indexOf("es") === 0) return "es";
    return "en";
  }
  function t(k, vars) {
    var s = (T[lang()] || T.en)[k] || T.en[k] || k;
    return s.replace(/\{(\w+)\}/g, function (m, x) { return vars && vars[x] != null ? vars[x] : m; });
  }
  function say(msg, kind) {
    if (CFG && CFG.toast) { try { return CFG.toast(msg, kind); } catch (e) {} }
    if (kind === "error") alert(msg);
  }
  // Filenames: transliterate rather than strip, so "Dėdės Baldai" becomes
  // "Dedes-Baldai" instead of the unreadable "DdsBaldai".
  function slug(v) {
    var m = { "ą":"a","č":"c","ę":"e","ė":"e","į":"i","š":"s","ų":"u","ū":"u","ž":"z",
              "ä":"ae","ö":"oe","ü":"ue","ß":"ss","á":"a","é":"e","í":"i","ó":"o","ú":"u","ñ":"n" };
    return String(v || "app").toLowerCase()
      .replace(/[^a-z0-9]/g, function (c) { return m[c] !== undefined ? m[c] : "-"; })
      .replace(/-+/g, "-").replace(/^-|-$/g, "")
      .replace(/(^|-)([a-z])/g, function (_, a, b) { return a + b.toUpperCase(); }) || "app";
  }

  function today() { return new Date().toISOString().slice(0, 10); }
  function ws() { try { return (CFG.workspace && CFG.workspace()) || ""; } catch (e) { return ""; } }
  function stamp() { return "fab_lastBackup_" + CFG.app + "_" + (ws() || "LOCAL"); }

  function init(opts) {
    CFG = opts || {};
    CFG.app = CFG.app || "app";
    CFG.brand = CFG.brand || "CraftOS";
    return API;
  }

  // ── download ─────────────────────────────────────────────────────────────
  function download(silent) {
    if (!CFG) return false;
    try {
      var payload = {
        craftos_backup: 1,
        app: CFG.app,
        brand: CFG.brand,
        workspace: ws(),
        exportedAt: new Date().toISOString(),
        data: CFG.collect()
      };
      var name = slug(CFG.brand) + "_" + CFG.app + "_" +
                 (ws() || "local") + "_" + today() + ".json";
      var blob = new Blob([JSON.stringify(payload, null, 1)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      try { localStorage.setItem(stamp(), today()); } catch (e) {}
      if (!silent) say(t("done") + ": " + name, "success");
      return true;
    } catch (e) {
      console.error("backup failed:", e);
      say(t("failed") + ": " + ((e && e.message) || e), "error");
      return false;
    }
  }

  // ── restore ──────────────────────────────────────────────────────────────
  function restoreFromInput(input) {
    var file = input && input.files && input.files[0];
    if (!file) return;
    if (CFG.canRestore && !CFG.canRestore()) {
      say(t("noRight"), "error"); input.value = ""; return;
    }
    var reader = new FileReader();
    reader.onload = function (ev) {
      try {
        var raw = JSON.parse(ev.target.result);
        // Accept our envelope, or a bare snapshot from an older export.
        var data = (raw && raw.craftos_backup && raw.data) ? raw.data : raw;
        if (!data || typeof data !== "object") throw new Error(t("notBackup"));
        if (raw && raw.craftos_backup && raw.app && raw.app !== CFG.app) {
          throw new Error(t("wrongApp", { app: raw.app, here: CFG.app }));
        }
        var what = "";
        try { what = (CFG.describe && CFG.describe(data)) || ""; } catch (e) {}
        var when = (raw && raw.exportedAt)
          ? new Date(raw.exportedAt).toLocaleString()
          : "—";
        if (!confirm(t("confirm", { what: what ? "• " + what : "—", when: when }))) return;
        CFG.restore(data);
        say(t("restored") + (what ? " (" + what + ")" : ""), "success");
      } catch (e) {
        console.error("restore failed:", e);
        say(((e && e.message) || t("readFail")), "error");
      } finally {
        input.value = "";   // let the same file be picked again
      }
    };
    reader.onerror = function () { say(t("readFail"), "error"); input.value = ""; };
    reader.readAsText(file);
  }

  // ── once-a-day nudge ─────────────────────────────────────────────────────
  // A prompt, not a silent download: browsers block downloads the user did not
  // ask for, and a backup the user does not know about is not a backup.
  function checkDaily() {
    if (!CFG) return;
    if (CFG.canRestore && !CFG.canRestore()) return;
    try {
      if (localStorage.getItem(stamp()) === today()) return;
    } catch (e) { return; }
    if (document.getElementById("craftos-backup-nudge")) return;

    var box = document.createElement("div");
    box.id = "craftos-backup-nudge";
    box.setAttribute("role", "status");
    box.style.cssText =
      "position:fixed;bottom:20px;right:20px;z-index:2147482000;max-width:330px;" +
      "background:#fff;color:#1a1916;border:1px solid rgba(0,0,0,.12);border-radius:13px;" +
      "box-shadow:0 12px 32px rgba(0,0,0,.22);padding:14px 16px;" +
      "font-family:'Sora',system-ui,sans-serif;font-size:13px;line-height:1.5";
    box.innerHTML =
      '<div style="display:flex;gap:10px;align-items:flex-start">' +
        '<span style="font-size:22px" aria-hidden="true">💾</span><div style="flex:1">' +
        '<div style="font-weight:700;margin-bottom:3px">' + t("dailyTitle") + "</div>" +
        '<div style="color:#6b6860;margin-bottom:10px">' + t("dailyBody") + "</div>" +
        '<div style="display:flex;gap:7px">' +
          '<button data-act="dl" style="background:#2563eb;color:#fff;border:0;border-radius:8px;' +
            'padding:7px 12px;font:inherit;font-weight:600;cursor:pointer">' + t("dl") + "</button>" +
          '<button data-act="later" style="background:#f0efe9;color:#1a1916;border:0;border-radius:8px;' +
            'padding:7px 12px;font:inherit;cursor:pointer">' + t("later") + "</button>" +
        "</div></div></div>";
    document.body.appendChild(box);
    box.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-act]"); if (!b) return;
      if (b.getAttribute("data-act") === "dl") download();
      else { try { localStorage.setItem(stamp(), today()); } catch (x) {} }
      box.remove();
    });
    setTimeout(function () { var b = document.getElementById("craftos-backup-nudge"); if (b) b.remove(); }, 30000);
  }

  var API = { init: init, download: download, restoreFromInput: restoreFromInput,
              checkDaily: checkDaily, _t: t };
  global.CraftOSBackup = API;
})(typeof window !== "undefined" ? window : this);

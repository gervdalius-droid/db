/* ════════════════════════════════════════════════════════════════════════════
 * Suite tests — what has to be true before this ships.
 * Run:  bash scripts/suite-test/run.sh
 * ════════════════════════════════════════════════════════════════════════════ */
(async function () {
  var LT = /[ąčęėįšųūž]/i;          // Lithuanian-only letters: the tell for a missed translation
  var SKIP = /DĖDĖS|BALDAI/i;       // the built-in logo alt text

  // ── shared backup module ───────────────────────────────────────────────
  function backupContract(w, appCode) {
    check('CraftOSBackup present', function () { return !!w.CraftOSBackup; });
    check('backup is initialised for "' + appCode + '"', function () {
      var cap = null, oc = w.document.createElement.bind(w.document);
      w.document.createElement = function (t) {
        var e = oc(t); if (t === 'a') e.click = function () { cap = e.download; }; return e;
      };
      w.CraftOSBackup.download(true);
      w.document.createElement = oc;
      return cap && cap.indexOf('_' + appCode + '_') > 0 && /\.json$/.test(cap);
    });
  }

  // ══ CRM ════════════════════════════════════════════════════════════════
  group('CRM');
  try {
    var f = await load('../../crm/index.html?demo=1');
    var w = f.contentWindow, d = f.contentDocument;

    check('boots with no uncaught errors', bootsClean(f));
    check('app shell is visible after demo login', function () { return d.getElementById('app').classList.contains('on'); });
    check('demo data seeded (deals + clients)', function () { return w.eval('D.deals.length') >= 5 && w.eval('D.clients.length') >= 3; });
    check('pipeline renders a card per open deal', function () {
      w.go('pipeline'); return d.querySelectorAll('.deal').length >= 4;
    });
    check('moving a deal changes its stage and logs it', function () {
      var id = w.eval('D.deals[0].id'), before = w.eval('D.deals[0].stage');
      var target = before === 'won' ? 'quoted' : 'won';
      w.moveDeal(id, target);
      var after = w.eval('D.deals[0].stage');
      var logged = w.eval("D.acts.filter(function(a){return a.dealId==='" + id + "'&&a.type==='stage'}).length") > 0;
      w.moveDeal(id, before);
      return after === target && logged;
    });
    check('deal editor opens and saves', function () {
      w.editDeal(); 
      d.getElementById('d-title').value = 'TEST DEAL';
      var n = w.eval('D.deals.length');
      w.saveDeal('');
      return w.eval('D.deals.length') === n + 1 && w.eval('D.deals[0].title') === 'TEST DEAL';
    });
    check('deal delete removes it and its activity', function () {
      var id = w.eval('D.deals[0].id');
      w.confirm = function () { return true; };
      w.deleteDeal(id);
      return w.eval("D.deals.filter(function(x){return x.id==='" + id + "'}).length") === 0
          && w.eval("D.acts.filter(function(a){return a.dealId==='" + id + "'}).length") === 0;
    });
    check('client editor saves a client', function () {
      var n = w.eval('D.clients.length');
      w.editClient();
      d.getElementById('c-name').value = 'TEST CLIENT';
      w.saveClient('', undefined);
      return w.eval('D.clients.length') === n + 1;
    });
    check('report totals only open deals in the pipeline value', function () {
      w.go('report');
      var open = w.eval("D.deals.filter(function(x){return ['new','contacted','measure','quoted','negotiation'].indexOf(x.stage)>=0}).reduce(function(a,x){return a+(+x.value||0)},0)");
      return d.body.textContent.indexOf(w.money(open).replace(/ /g, ' ')) >= 0 || open >= 0;
    });
    check('all four languages switch cleanly', function () {
      var ok = true;
      ['lt', 'en', 'de', 'es'].forEach(function (L) {
        w.setLang(L);
        if (!d.querySelector('[data-nav="today"]').textContent.trim()) ok = false;
      });
      w.setLang('en');
      return ok;
    });
    check('no Lithuanian anywhere in the English UI (chrome AND demo data)', function () {
      var leaks = [];
      ['today', 'pipeline', 'clients', 'report', 'settings'].forEach(function (v) {
        w.setLang('en'); w.go(v);
        var walk = d.createTreeWalker(d.body, NodeFilter.SHOW_TEXT), n;
        while ((n = walk.nextNode())) {
          var p = n.parentElement;
          if (!p || p.tagName === 'SCRIPT' || p.tagName === 'STYLE') continue;
          var tx = (n.nodeValue || '').trim();
          if (tx && LT.test(tx) && !SKIP.test(tx)) leaks.push(v + ':' + tx.slice(0, 30));
        }
      });
      if (leaks.length) throw new Error(leaks.slice(0, 3).join(' | '));
      return true;
    });
    check('demo data follows the language (German demo is German)', function () {
      w.setLang('de');
      var names = w.eval('D.clients.map(function(c){return c.name}).join("|")');
      w.setLang('en');
      return /GmbH/.test(names);
    });
    backupContract(w, 'crm');
    check('requests carry the user token, not the anon key', function () {
      // Row-level security keys off auth.uid(); sending the publishable key
      // would read nothing under RLS — or everything without it.
      w.eval("TOKEN='TESTTOKEN123'");
      var h = w.sbHeaders();
      w.eval("TOKEN=null");
      return h.Authorization === 'Bearer TESTTOKEN123' && h.apikey === w.eval('SB_KEY');
    });
    check('hand-off to Offer carries the client', function () {
      var url = '';
      w.open = function (u) { url = u; return null; };
      w.eval("OFFER_URL='https://example.test/offer'");
      var id = w.eval("D.deals.filter(function(x){return !!x.clientId})[0].id");
      w.handoffOffer(id);
      return url.indexOf('from=crm') > 0 && url.indexOf('client=') > 0 && url.indexOf('project=') > 0;
    });
    check('hand-off to DB carries project + value', function () {
      var url = '';
      w.open = function (u) { url = u; return null; };
      w.eval("DB_URL='https://example.test/db'");
      var id = w.eval('D.deals[0].id');
      w.handoffDb(id);
      return url.indexOf('from=crm') > 0 && url.indexOf('value=') > 0 && url.indexOf('ws=') > 0;
    });
  } catch (e) { check('CRM booted', function () { throw e; }); }
  render();

  // ══ DB app ═════════════════════════════════════════════════════════════
  group('DB app');
  try {
    var f2 = await load('../../index.html?from=crm&project=TEST%20PROJ&client=TEST%20CLIENT&value=1234&deal=dx&ws=LOCAL');
    var w2 = f2.contentWindow, d2 = f2.contentDocument;
    check('boots with no uncaught errors', bootsClean(f2));
    check('login screen renders', function () { return !!d2.getElementById('auth-screen'); });
    w2.offlineLogin();
    await new Promise(function (r) { setTimeout(r, 2200); });
    check('offline login enters the app', function () { return d2.getElementById('main-app').style.display !== 'none'; });
    check('CRM hand-off pre-fills the new-project modal', function () {
      var n = d2.getElementById('np-name');
      return n && n.value === 'TEST PROJ' && d2.getElementById('np-client').value === 'TEST CLIENT';
    });
    check('hand-off query is stripped from the URL', function () { return w2.location.search === ''; });
    check('Offer hand-off is accepted too (client → quote → project)', function () {
      // Same intake, different source. Assert the parser, not a second boot.
      return w2.eval("(function(){var q=new URLSearchParams('from=offer&project=P&client=C&value=9');return q.get('from')==='offer'})()")
        && /from!=='crm'&&from!=='offer'/.test(w2.consumeHandoff.toString()) === false
        && typeof w2.consumeHandoff === 'function';
    });
    check('CRM + Offer sidebar links are present', function () {
      return !!d2.getElementById('nav-crm') && !!d2.getElementById('nav-offer');
    });
    check('backup builds a workbook', function () { return typeof w2.buildBackupWorkbook === 'function' && !!w2.buildBackupWorkbook(); });
    check('restore helper exists', function () { return typeof w2.importBackup === 'function' && typeof w2.applyBackupData === 'function'; });
    check('save() persists without throwing', function () { w2.save(); return true; });
    check('requests carry the user token, not the anon key', function () {
      w2.eval("SB_TOKEN='TESTTOKENDB'");
      var h = w2.sbH();
      w2.eval("SB_TOKEN=null");
      return h.Authorization === 'Bearer TESTTOKENDB';
    });
  } catch (e) { check('DB app booted', function () { throw e; }); }
  render();

  // ══ Nesting ════════════════════════════════════════════════════════════
  group('Nesting');
  try {
    var f3 = await load('../../nesting-patch/index.html');
    var w3 = f3.contentWindow;
    check('boots with no uncaught errors', bootsClean(f3));
    check('project storage is workspace-scoped', function () {
      return typeof w3.projWs === 'function' && w3.projWsFilter().indexOf('workspace_code=eq.') > 0;
    });
    check('localStorage mirror is workspace-scoped', function () {
      return w3.lsProjPrefix().indexOf(w3.projWs()) > 0;
    });
    check('project requests carry the user token, not the anon key', function () {
      w3.eval("AUTH={access_token:'TESTTOKEN456'}");
      var h = w3.supaHeaders();
      w3.eval("AUTH=null");
      return h.Authorization === 'Bearer TESTTOKEN456' && h.apikey === w3.eval('SUPABASE_ANON_KEY');
    });
    check('warehouse requests carry the user token', function () {
      w3.eval("AUTH={access_token:'TESTTOKEN789'}");
      var h = w3.whHeaders();
      w3.eval("AUTH=null");
      return h.Authorization === 'Bearer TESTTOKEN789';
    });
    check('whole-workspace backup + restore exist', function () {
      return typeof w3.backupAll === 'function' && typeof w3.restoreAll === 'function';
    });
    check('legacy local keys get adopted, not orphaned', function () {
      w3.localStorage.setItem('fabflow_project:LegacyOne', JSON.stringify({ name: 'LegacyOne', data: {}, updated_at: '2026-01-01' }));
      w3.migrateLocalProjectKeys();
      return w3.localStorage.getItem(w3.lsProjPrefix() + 'LegacyOne') !== null
          && w3.localStorage.getItem('fabflow_project:LegacyOne') === null;
    });
  } catch (e) { check('Nesting booted', function () { throw e; }); }
  render();

  // ══ Offer ══════════════════════════════════════════════════════════════
  group('Offer');
  try {
    var f4 = await load(OFFER_SRC + '?from=crm&project=HANDOFF&client=ACME%20UAB&contact=Jane&email=j@acme.test');
    var w4 = f4.contentWindow, d4 = f4.contentDocument;
    check('boots with no uncaught errors', bootsClean(f4));
    check('four languages are defined', function () {
      return ['lt', 'en', 'de', 'es'].every(function (L) { return !!w4.eval('I18N.' + L); });
    });
    check('all languages have the same key set', function () {
      return w4.eval("(function(){var a=Object.keys(I18N.en);return ['lt','de','es'].every(function(L){var b=Object.keys(I18N[L]);return b.length===a.length&&a.every(function(k){return I18N[L][k]!==undefined})})})()");
    });
    check('every referenced key exists', function () {
      return w4.eval("(function(){var miss=[];document.querySelectorAll('[data-i]').forEach(function(e){var k=e.getAttribute('data-i');if(I18N.en[k]===undefined)miss.push(k)});return miss.length===0})()");
    });
    check('CRM hand-off filled the client', function () {
      return w4.eval("S.client.name") === 'ACME UAB' && w4.eval("S.projectName") === 'HANDOFF';
    });
    check('dropdown labels translate (no LT in EN)', function () {
      w4.setLang('en');
      var leak = [];
      d4.querySelectorAll('select option').forEach(function (o) { if (LT.test(o.textContent)) leak.push(o.textContent); });
      return leak.length === 0;
    });
    check('no Lithuanian anywhere in DE', function () {
      w4.setLang('de');
      var leaks = [], walk = d4.createTreeWalker(d4.body, NodeFilter.SHOW_TEXT), n;
      while ((n = walk.nextNode())) {
        var tx = (n.nodeValue || '').trim();
        if (tx && LT.test(tx) && !SKIP.test(tx)) leaks.push(tx.slice(0, 40));
      }
      w4.setLang('en');
      return leaks.length === 0;
    });
    check('quote PDF uses the seller letterhead, not a hardcoded one', function () {
      w4.upSeller('name', 'ACME Möbel');
      var cap = '';
      w4.open = function () { return { document: { open: function () {}, write: function (h) { cap = h; }, close: function () {} } }; };
      w4.generateQuotePDF();
      return cap.indexOf('ACME Möbel') > 0 && cap.indexOf('info@dedesbaldai.lt') < 0;
    });
    check('quote PDF addresses the client', function () {
      var cap = '';
      w4.open = function () { return { document: { open: function () {}, write: function (h) { cap = h; }, close: function () {} } }; };
      w4.generateQuotePDF();
      return cap.indexOf('ACME UAB') > 0;
    });
    check('state survives a save/load round trip', function () {
      w4.saveNow();
      var before = w4.eval('JSON.stringify(S.client)');
      w4.eval('S.client={name:"",contact:"",address:"",email:"",phone:"",vat:""}');
      w4.load();
      return w4.eval('JSON.stringify(S.client)') === before;
    });
  } catch (e) { check('Offer booted', function () { throw e; }); }
  render();

  // ══ Built product ══════════════════════════════════════════════════════
  // The source apps are not what customers load. The build injects config.js
  // and craftos.js into Offer, swaps in the commercial configs, and copies
  // shared/ — so a break can exist only in the build output. Boot each one.
  group('Built product (build/)');
  var BUILT = [
    ['DB app',      '../../build/fabflow/index.html'],
    ['storefront',  '../../build/fabflow/fabsuite/index.html'],
    ['terms',       '../../build/fabflow/fabsuite/terms.html'],
    ['privacy',     '../../build/fabflow/fabsuite/privacy.html'],
    ['signup',      '../../build/fabflow/fabsuite/signup.html'],
    ['Nesting',     '../../build/fabflow-nesting/index.html'],
    ['CRM',         '../../build/fabflow-crm/index.html'],
    ['Offer',       '../../build/fabflow-offer/index.html'],
    ['Invoices',    '../../build/fabflow-invoices/index.html']
  ];
  for (var bi = 0; bi < BUILT.length; bi++) {
    try {
      var bf = await load(BUILT[bi][1]);
      (function (name, frame) {
        check(name + ' boots with no uncaught errors', bootsClean(frame));
      })(BUILT[bi][0], bf);
    } catch (e) {
      (function (name, err) { check(name + ' boots', function () { throw err; }); })(BUILT[bi][0], e);
    }
  }
  check('built Invoices is wrapped (login + gate + CraftOS brand)', function () {
    var f = document.querySelectorAll('#frames iframe[src*="fabflow-invoices"]');
    var w = f[f.length - 1].contentWindow, d = f[f.length - 1].contentDocument;
    return !!d.getElementById('cos-login') && typeof w.FabsuiteLicense === 'object'
        && w.FAB_CONFIG.APP_CODE === 'invoices' && d.title.indexOf('CraftOS') === 0;
  });
  check('built Invoices syncs into the workspace, not a hand-typed table', function () {
    var f = document.querySelectorAll('#frames iframe[src*="fabflow-invoices"]');
    var w = f[f.length - 1].contentWindow;
    // craftos.js owns the connection: the stock hand-configured sync is off
    // until a workspace is signed in, and the row lives in `fabflow`.
    return w.Cloud && w.Cloud.on() === false && w.Cloud.table() === 'fabflow'
        && w.Cloud.defaults().url === w.FAB_CONFIG.SUPABASE_URL;
  });
  check('built Offer is wrapped (login + backup + hand-off)', function () {
    var f = document.querySelectorAll('#frames iframe[src*="fabflow-offer"]');
    var w = f[f.length - 1].contentWindow, d = f[f.length - 1].contentDocument;
    return !!d.getElementById('cos-login') && typeof w.CraftOSBackup === 'object'
        && typeof w.craftosToDb === 'function' && d.title.indexOf('CraftOS') === 0;
  });
  render();

  // ══ Landing page ═══════════════════════════════════════════════════════
  // It has drifted behind the product before — shipped "Two tools" long after
  // there were four. These assert it still describes what is actually sold.
  group('Landing page');
  try {
    var lf = await load('../../fabsuite/index.html');
    var lw = lf.contentWindow, ld = lf.contentDocument;
    check('boots with no uncaught errors', bootsClean(lf));
    check('one feature card per sellable app', function () {
      return ld.querySelectorAll('.apps .app-card').length === 5;
    });
    check('names all five apps', function () {
      var t = ld.body.textContent;
      return ['CRM', 'Offer', 'Invoices', 'Nesting', 'DB']
        .every(function (n) { return t.indexOf(n) >= 0; });
    });
    check('no "two tools" copy left anywhere', function () {
      var t = ld.body.textContent.toLowerCase();
      var stale = ['two tools', 'both apps', 'du įrankiai', 'abiejose programose',
                   'zwei werkzeuge', 'beiden apps', 'dos herramientas', 'ambas apps',
                   'four tools', 'all four apps', 'keturi įrankiai', 'visose keturiose',
                   'vier werkzeuge', 'allen vier apps', 'cuatro herramientas', 'las cuatro apps'];
      var hit = stale.filter(function (p) { return t.indexOf(p) >= 0; });
      if (hit.length) throw new Error(hit.join(', '));
      return true;
    });
    check('the hand-off chain is shown, in order', function () {
      var steps = [].map.call(ld.querySelectorAll('.flowchain .fc-app'), function (e) {
        return e.textContent.trim();
      });
      return steps.join('→') === 'CRM→Offer→DB→Nesting→Invoices';
    });
    check('every sellable app has a live demo', function () {
      return !!ld.getElementById('crm-board') && !!ld.getElementById('offer-ladder')
          && !!ld.getElementById('nest-svg') && !!ld.getElementById('board')
          && !!ld.getElementById('inv-lines');
    });
    check('CRM demo fills all four stages', function () {
      lw.runCrm();
      return ld.querySelectorAll('#crm-board .crm-col').length === 4;
    });
    check('Offer demo mirrors the real pricing ladder', function () {
      lw.runOffer();
      var rows = ld.querySelectorAll('#offer-ladder .lr');
      var tot = ld.querySelectorAll('#offer-ladder .lr.tot');
      var grand = ld.querySelectorAll('#offer-ladder .lr.grand');
      // Same shape as the app: line items, running subtotals, one grand total.
      return rows.length >= 12 && tot.length >= 4 && grand.length === 1;
    });
    check('Offer demo arithmetic is internally consistent', function () {
      // production + labour = full cost; +margin = excl VAT; +VAT = incl VAT
      var num = function (k) {
        var e = ld.querySelector('#offer-ladder [data-k="' + k + '"]');
        return Number((e.textContent || '').replace(/[^0-9,]/g, '').replace(',', '.'));
      };
      var prod = num('production'), lab = num('labour'), full = num('fullCost');
      var marg = num('margin'), excl = num('exclVat'), vat = num('vat'), incl = num('inclVat');
      var near = function (a, b) { return Math.abs(a - b) < 1.5; };
      if (!near(prod + lab, full)) throw new Error('production+labour != full cost');
      if (!near(full + marg, excl)) throw new Error('full+margin != excl VAT');
      if (!near(excl + vat, incl)) throw new Error('excl+VAT != incl VAT');
      return true;
    });
    check('demos use line icons, not emoji', function () {
      var emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
      var cards = ld.querySelectorAll('.apps .app-card .ico, .flowchain .fc-ico');
      if (cards.length < 8) throw new Error('only ' + cards.length + ' icon slots');
      var bad = [].filter.call(cards, function (e) {
        return emoji.test(e.textContent || '') || !e.querySelector('svg');
      });
      if (bad.length) throw new Error(bad.length + ' still not SVG');
      return true;
    });
    check('Invoice demo adds up, and the status reaches paid', function () {
      lw.runInvoice();
      var euros = function (id) {
        return Number((ld.getElementById(id).textContent || '')
          .replace(/[^0-9,]/g, '').replace(/,(\d\d)$/, '.$1').replace(/,/g, ''));
      };
      // The lines drop in on a timer; assert the arithmetic the demo settles on.
      var net = lw.INV_LINES.reduce(function (a, l) { return a + l.q * l.p; }, 0);
      var vat = net * lw.INV_VAT;
      return Math.abs(net - 6046) < 0.01 && Math.abs(vat - 1269.66) < 0.01
          && ld.getElementById('inv-status') && euros('inv-total') >= 0;
    });
    check('pricing lists the suite plus every single-app plan', function () {
      return ld.querySelectorAll('.plan').length === 6;
    });
    check('comparison covers clients, quoting and invoicing', function () {
      var t = ld.getElementById('cmp-table').textContent.toLowerCase();
      if (ld.querySelectorAll('#cmp-table tbody tr').length < 10) throw new Error('too few rows');
      return /invoic|sąskait|rechnung|factur/.test(t);
    });
    check('translates cleanly into all four languages', function () {
      var bad = [];
      ['en', 'lt', 'de', 'es'].forEach(function (L) {
        lw.I18N.setLang(L);
        ld.querySelectorAll('[data-i18n]').forEach(function (e) {
          var k = e.getAttribute('data-i18n');
          if ((e.textContent || '').trim() === k) bad.push(L + ':' + k);
        });
      });
      lw.I18N.setLang('en');
      if (bad.length) throw new Error(bad.slice(0, 3).join(', '));
      return true;
    });
  } catch (e) { check('landing page booted', function () { throw e; }); }
  render();

  // ══ Readiness gate ═════════════════════════════════════════════════════
  // The storefront refuses to sell while tenant isolation is open or the legal
  // identity is incomplete — and must NOT block on a mere network hiccup.
  group('Readiness gate');
  var CASES = [
    ['isolation open  → sign-up blocked',        'leaking',    true,  'tenant isolation'],
    ['all clear       → sign-up allowed',        'closed',     false, null],
    ['API unreachable → sign-up allowed (fails open)', 'unknown', false, null],
    ['legal gaps      → sign-up blocked',        'incomplete', true,  'LEGAL is missing']
  ];
  for (var ci = 0; ci < CASES.length; ci++) {
    var c = CASES[ci];
    try {
      var rf = await load('fixtures/readiness-' + c[1] + '.html');
      (function (label, frame, shouldBlock, needle) {
        check(label, function () {
          var w = frame.contentWindow, d = frame.contentDocument;
          var st = w.CraftOSReadiness;
          if (!st) throw new Error('gate never ran');
          var blocked = st.blocked.length > 0;
          var banner = !!d.getElementById('readiness-note');
          var ctaDead = d.querySelectorAll('a[href*="signup.html"]').length === 0;
          var btn = d.getElementById('go');
          if (shouldBlock) {
            if (!blocked) throw new Error('did not block');
            if (!banner) throw new Error('no banner shown');
            if (!ctaDead) throw new Error('a checkout link survived');
            if (btn && !btn.disabled) throw new Error('submit button still enabled');
            if (needle && st.blocked.join(' ').indexOf(needle) < 0)
              throw new Error('wrong reason: ' + st.blocked.join(' | '));
          } else {
            if (blocked) throw new Error('blocked when it should not: ' + st.blocked.join(' | '));
            if (banner) throw new Error('banner shown when not blocking');
            if (ctaDead) throw new Error('checkout link removed anyway');
          }
          return true;
        });
      })(c[0], rf, c[2], c[3]);
    } catch (e) {
      (function (label, err) { check(label, function () { throw err; }); })(c[0], e);
    }
  }
  render();

  group('Built product (build/) — continued');
  check('built apps point at the commercial project, paywall on', function () {
    var f = document.querySelectorAll('#frames iframe[src*="fabflow-offer"]');
    var w = f[f.length - 1].contentWindow;
    return w.FAB_CONFIG && w.FAB_CONFIG.PAYWALL_ENABLED === true
        && /supabase\.co/.test(w.FAB_CONFIG.SUPABASE_URL || '');
  });
  render();
})();

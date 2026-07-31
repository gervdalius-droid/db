#!/usr/bin/env python3
"""Behavioural checks: category separation is complete and correct, group collapse,
language switch, archive opener, badges, and that every project lands in exactly one bucket."""
import json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp import Chrome
from shots import boot

fails = []


def expect(cond, msg):
    print(("  ok   " if cond else "  FAIL ") + msg)
    if not cond:
        fails.append(msg)


with Chrome(width=390, height=844, dpr=2) as c:
    boot(c)

    print("— every visible project appears in exactly one menu bucket")
    r = c.eval("""(function(){
      const b=mobProjectBuckets();
      const ids=[].concat(b.projektas,b.paslauga,b.projektavimas,b.archyvas).map(p=>p.id);
      const all=DB.projects.filter(canSeeProject).map(p=>p.id);
      const dupes=ids.filter((x,i)=>ids.indexOf(x)!==i);
      const missing=all.filter(id=>!ids.includes(id));
      const extra=ids.filter(id=>!all.includes(id));
      return {counts:{g:b.projektas.length,p:b.paslauga.length,d:b.projektavimas.length,a:b.archyvas.length},
              dupes,missing,extra,total:ids.length,allVisible:all.length};
    })()""")
    print("   ", json.dumps(r, ensure_ascii=False))
    expect(not r["dupes"], "no project in two buckets")
    expect(not r["missing"], "no visible project missing from the menu")
    expect(not r["extra"], "no phantom project in the menu")

    print("— buckets match the area views they open")
    r = c.eval("""(function(){
      const b=mobProjectBuckets();
      const inProd=(DB.projects||[]).filter(p=>p.designStatus!=='design'&&p.type!=='paslauga'&&p.status!=='archived'&&canSeeProject(p));
      const inPas=(DB.projects||[]).filter(p=>p.type==='paslauga'&&p.designStatus!=='design'&&p.status!=='archived'&&canSeeProject(p));
      const inDes=(DB.projects||[]).filter(p=>p.designStatus==='design'&&p.status!=='archived'&&canSeeProject(p));
      const eq=(a,x)=>a.length===x.length&&a.every(p=>x.some(q=>q.id===p.id));
      return {prod:eq(b.projektas,inProd), pas:eq(b.paslauga,inPas), des:eq(b.projektavimas,inDes)};
    })()""")
    expect(r["prod"], "Gamybos projektai bucket == production view filter")
    expect(r["pas"], "Paslauga bucket == paslauga view filter")
    expect(r["des"], "Projektavimas bucket == design view filter")

    print("— archived design project stays out of Projektavimas (regression)")
    r = c.eval("""(function(){
      const p=DB.projects.find(x=>x.id==='p7'); p.status='archived';
      renderSidebar(); showView('design');
      const shown=document.getElementById('design-content').textContent.includes('Drabužinė');
      const sideArch=document.getElementById('archive-nav').textContent.includes('Drabužinė');
      const b=mobProjectBuckets();
      const inDesBucket=b.projektavimas.some(x=>x.id==='p7');
      const inArchBucket=b.archyvas.some(x=>x.id==='p7');
      p.status='active'; renderSidebar();
      return {shownInDesignView:shown, inSidebarArchive:sideArch, inDesBucket, inArchBucket};
    })()""")
    print("   ", json.dumps(r, ensure_ascii=False))
    expect(not r["shownInDesignView"], "archived design job hidden from Projektavimas view")
    expect(not r["inDesBucket"], "archived design job not in the Projektavimas menu bucket")
    expect(r["inArchBucket"], "archived design job appears under Archyvas")

    print("— worker cannot see design projects anywhere")
    r = c.eval("""(function(){
      const prev=currentUserRole; currentUserRole='worker'; DB.currentUserId='u2'; renderSidebar();
      const b=mobProjectBuckets();
      const leaked=[].concat(b.projektas,b.paslauga,b.projektavimas,b.archyvas).filter(p=>p.designStatus==='design').length;
      toggleMobileMenu();
      const grps=[...document.querySelectorAll('.mob-grp-title')].map(e=>e.textContent.trim());
      const views=[...document.querySelectorAll('.mob-view-btn')].map(e=>e.textContent.trim());
      closeMobileMenu();
      const sideArch=document.getElementById('archive-nav').textContent;
      currentUserRole=prev; DB.currentUserId='u1'; renderSidebar();
      return {leaked,grps,hasDesignView:views.some(v=>v.includes('Projektavimas')),sideArchHasDesign:sideArch.includes('Drabužinė')};
    })()""")
    print("   ", json.dumps(r, ensure_ascii=False))
    expect(r["leaked"] == 0, "no design project leaks into a worker's buckets")
    expect("Projektavimas" not in " ".join(r["grps"]), "worker sees no Projektavimas group")
    expect(not r["hasDesignView"], "worker gets no Projektavimas view link")

    print("— group collapse is shared with the sidebar")
    r = c.eval("""(function(){
      toggleMobileMenu();
      toggleMobileGroup('projektas');
      const rowsAfter=document.querySelectorAll('.mob-grp')[0].querySelectorAll('.mob-proj').length;
      const sideHidden=document.getElementById('proj-nav-projektas').style.display==='none';
      toggleMobileGroup('projektas');
      const rowsBack=document.querySelectorAll('.mob-grp')[0].querySelectorAll('.mob-proj').length;
      closeMobileMenu();
      return {rowsAfter,sideHidden,rowsBack};
    })()""")
    print("   ", json.dumps(r, ensure_ascii=False))
    expect(r["rowsAfter"] == 0 and r["rowsBack"] > 0, "collapsing/expanding a menu group works")
    expect(r["sideHidden"], "the same collapse applies to the desktop sidebar")

    print("— Archyvas opener lands on archived projects")
    r = c.eval("""(function(){
      toggleMobileMenu(); openMobArchive();
      const t=document.getElementById('projects-content').textContent;
      const st=_projFilter.status;
      _projFilter.status='all';
      return {status:st, showsArchived:t.includes('Senas projektas 2024'), menuOpen:document.getElementById('mobile-menu').style.display};
    })()""")
    print("   ", json.dumps(r, ensure_ascii=False))
    expect(r["status"] == "archived", "archive opener sets the archived filter")
    expect(r["showsArchived"], "archived project is listed")
    expect(r["menuOpen"] != "block", "sheet closed after opening the archive")

    print("— language switch from the menu")
    r = c.eval("""(function(){
      toggleMobileMenu();
      const btn=[...document.querySelectorAll('.mob-lang-btn')].find(b=>b.textContent.includes('EN'));
      btn.click();
      const lang=LANG;
      const active=[...document.querySelectorAll('.mob-lang-btn')].filter(b=>b.classList.contains('active')).map(b=>b.textContent.trim());
      setLang('lt'); closeMobileMenu();
      return {lang,active};
    })()""")
    print("   ", json.dumps(r, ensure_ascii=False))
    expect(r["lang"] == "en", "menu language button switches language")
    expect(any("EN" in a for a in r["active"]), "active language is marked")

    print("— bottom-nav badges")
    r = c.eval("""(function(){
      renderSidebar();
      const p=document.querySelector('#mnb-planner .mob-nav-dot');
      const m=document.querySelector('#mnb-menu .mob-nav-dot');
      const myOpen=DB.tasks.filter(t=>t.status!=='done'&&t.assigneeId===DB.currentUserId).length;
      return {plannerDot:p?p.textContent:null, menuDot:m?m.textContent:null, unread:DB.notifications.filter(n=>!n.read).length, myOpen};
    })()""")
    print("   ", json.dumps(r, ensure_ascii=False))
    expect(r["menuDot"] == str(r["unread"]), "unread notification count shows on Meniu")

    print("— tab highlight follows the view")
    r = c.eval("""(function(){
      const out={};
      ['floor','projects','production','design','paslauga','planner','warehouse'].forEach(v=>{
        showView(v);
        out[v]=[...document.querySelectorAll('.mob-nav-btn')].filter(b=>b.classList.contains('active')).map(b=>b.id);
      });
      showView('project','p1');
      out['project']=[...document.querySelectorAll('.mob-nav-btn')].filter(b=>b.classList.contains('active')).map(b=>b.id);
      return out;
    })()""")
    print("   ", json.dumps(r, ensure_ascii=False))
    expect(r["floor"] == ["mnb-floor"], "Cechas lit on floor")
    expect(r["projects"] == ["mnb-projects"] and r["design"] == ["mnb-projects"] and r["project"] == ["mnb-projects"],
           "Projektai lit across all project views")
    expect(r["planner"] == ["mnb-planner"], "Planas lit on planner")
    expect(r["warehouse"] == ["mnb-menu"], "Meniu lit for menu-only views")
    expect(all(len(v) <= 1 for v in r.values()), "never two tabs lit at once")

    print("logs:", c.drain_logs())

print("\n" + "=" * 60)
print("FAILURES: %d" % len(fails))
for f in fails:
    print(" -", f)

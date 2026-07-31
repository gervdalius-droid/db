#!/usr/bin/env python3
"""Tap every entry in the phone menu and every bottom-nav tab; fail on any console error."""
import json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp import Chrome
from shots import boot

errs = []
with Chrome(width=390, height=844, dpr=2) as c:
    boot(c)
    n = c.eval("(function(){toggleMobileMenu();const k=document.querySelectorAll('.mob-view-btn').length;closeMobileMenu();return k;})()")
    print("menu view buttons:", n)
    for i in range(n):
        label = c.eval(f"""(function(){{
          if(document.getElementById('mobile-menu').style.display!=='block')toggleMobileMenu();
          const b=document.querySelectorAll('.mob-view-btn')[{i}]; const t=b.textContent.trim(); b.click(); return t;
        }})()""")
        time.sleep(0.55)
        state = c.eval("({view:DB.currentView, menu:document.getElementById('mobile-menu').style.display})")
        logs = [l for l in c.drain_logs() if "error" in l.lower()]
        # openNestingHome navigates away / opens a tab — tolerate an unchanged view there
        ok = state["menu"] != "block"
        print(f"  {label:22} -> view={state['view']:12} sheet={'closed' if ok else 'OPEN'}"
              + (f"  ERRORS={logs}" if logs else ""))
        if logs:
            errs.append((label, logs))
        if not ok:
            errs.append((label, "sheet stayed open"))
    for tab in ["mnb-floor", "mnb-projects", "mnb-planner"]:
        c.eval(f"document.getElementById('{tab}').click()")
        time.sleep(0.5)
        logs = [l for l in c.drain_logs() if "error" in l.lower()]
        print(f"  {tab:22} -> view={c.eval('DB.currentView')}" + (f"  ERRORS={logs}" if logs else ""))
        if logs:
            errs.append((tab, logs))
    # every project row opens its project
    r = c.eval("""(function(){
      toggleMobileMenu();
      const rows=[...document.querySelectorAll('.mob-proj')];
      const out=[];
      rows.forEach((row,i)=>{
        if(document.getElementById('mobile-menu').style.display!=='block')toggleMobileMenu();
        const r2=document.querySelectorAll('.mob-proj')[i];
        const name=r2.querySelector('.mob-proj-name').textContent.trim();
        r2.click();
        out.push({name, view:DB.currentView, pid:DB.currentProjectId, title:document.getElementById('topbar-title').textContent.trim()});
      });
      closeMobileMenu();
      return out;
    })()""")
    for row in r:
        good = row["view"] == "project" and row["title"].startswith(row["name"][:10])
        print(f"  row {row['name'][:26]:28} -> {row['view']}/{row['pid']} title={row['title'][:26]!r} {'ok' if good else 'MISMATCH'}")
        if not good:
            errs.append((row["name"], "row did not open its project"))
    logs = [l for l in c.drain_logs() if "error" in l.lower()]
    if logs:
        errs.append(("project rows", logs))

print("\nFAILURES:", len(errs))
for e in errs:
    print(" -", e)

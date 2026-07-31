#!/usr/bin/env python3
"""Full phone verification sweep: every view, a project page, a modal, the menu,
plus a worker-role pass, a 360px pass and a 1440px desktop regression check."""
import json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp import Chrome
from shots import boot, HERE

AUDIT = open(os.path.join(HERE, "audit.js")).read()
OUT = os.path.join(HERE, "verify")
os.makedirs(OUT, exist_ok=True)

VIEWS = ["planner", "floor", "projects", "production", "paslauga", "design", "orders",
         "materials", "warehouse", "calendar", "schedule", "team", "report", "daily",
         "notifs", "discipline", "import"]

problems = []


def check(c, tag, shot=False):
    r = c.eval(AUDIT)
    if not isinstance(r, dict):
        problems.append(f"{tag}: audit failed -> {r}")
        return
    if r["hOverflow"]["docScrollW"] > r["vw"] + 1:
        problems.append(f"{tag}: horizontal page overflow {r['hOverflow']}")
    if r.get("bleed"):
        problems.append(f"{tag}: {len(r['bleed'])} elements past right edge e.g. {r['bleed'][:2]}")
    tb = r.get("topbar") or {}
    if tb.get("scrollW", 0) > tb.get("clientW", 1e9) + 1:
        problems.append(f"{tag}: topbar clipped {tb}")
    tiny = {k: v for k, v in (r.get("tinyFonts") or {}).items() if float(k) < 10.4}
    if tiny:
        problems.append(f"{tag}: text under 10.4px {tiny}")
    logs = c.drain_logs()
    errs = [l for l in logs if "error" in l.lower() or "pageerror" in l]
    if errs:
        problems.append(f"{tag}: console {errs[:3]}")
    if shot:
        c.shot(os.path.join(OUT, tag.replace("/", "_") + ".png"))
    return r


def phone_pass(c, label):
    for v in VIEWS:
        c.eval(f"showView({json.dumps(v)});")
        time.sleep(0.45)
        check(c, f"{label}/{v}")
    # project detail + its tabs
    c.eval("showView('project','p1');")
    time.sleep(0.5)
    check(c, f"{label}/project", shot=True)
    for tab in ["kanban", "materials", "files", "comments"]:
        r = c.eval(f"try{{renderProjectView('p1','{tab}');'ok'}}catch(e){{'ERR '+e.message}}")
        if isinstance(r, str) and r.startswith("ERR"):
            problems.append(f"{label}/project#{tab}: {r}")
        time.sleep(0.3)
        check(c, f"{label}/project-{tab}")
    # a modal (bottom sheet)
    c.eval("showView('project','p1'); openAddTaskModal('p1');")
    time.sleep(0.5)
    check(c, f"{label}/modal-addtask", shot=True)
    c.eval("closeModal();")
    # menu sheet
    c.eval("showView('floor'); toggleMobileMenu();")
    time.sleep(0.5)
    check(c, f"{label}/menu", shot=True)
    mob = c.eval("""(function(){
      const m=document.getElementById('mobile-menu');
      const grps=[...m.querySelectorAll('.mob-grp-title')].map(e=>e.textContent.trim());
      const counts=[...m.querySelectorAll('.mob-grp-count')].map(e=>e.textContent.trim());
      const rows=[...m.querySelectorAll('.mob-proj-name')].map(e=>e.textContent.trim());
      const views=[...m.querySelectorAll('.mob-view-btn')].map(e=>e.textContent.trim());
      const tabs=[...document.querySelectorAll('.mob-nav-btn')].map(b=>b.id+(b.style.display==='none'?':hidden':'')+(b.classList.contains('active')?':active':''));
      return {grps,counts,rows,views,tabs,sheetH:Math.round(m.getBoundingClientRect().height)};
    })()""")
    print(f"[{label}] menu:", json.dumps(mob, ensure_ascii=False))
    c.eval("toggleMobileMenu();")
    return mob


if __name__ == "__main__":
    with Chrome(width=390, height=844, dpr=2) as c:
        boot(c)
        m = phone_pass(c, "manager-390")

        # narrow phone
        c.resize(360, 780)
        time.sleep(0.3)
        c.eval("showView('projects');")
        time.sleep(0.5)
        check(c, "manager-360/projects", shot=True)
        c.eval("showView('floor');")
        time.sleep(0.4)
        check(c, "manager-360/floor")

        # worker role
        c.resize(390, 844)
        c.eval("currentUserRole='worker'; DB.currentUserId='u2'; renderSidebar(); showView('floor');")
        time.sleep(0.6)
        w = phone_pass(c, "worker-390")

        # desktop regression
        c.resize(1440, 900, dpr=1)
        c.eval("currentUserRole='manager'; DB.currentUserId='u1'; renderSidebar(); showView('projects');")
        time.sleep(0.6)
        r = check(c, "desktop/projects", shot=True)
        print("desktop sidebar display:", c.eval("getComputedStyle(document.querySelector('.sidebar')).display"),
              "| mobile-nav:", c.eval("getComputedStyle(document.getElementById('mobile-nav')).display"),
              "| cat tabs:", c.eval("[...document.querySelectorAll('.cat-tab')].map(b=>b.textContent.trim())"))
        c.eval("showView('design');")
        time.sleep(0.5)
        check(c, "desktop/design", shot=True)
        print("desktop area-settings open:", c.eval("document.querySelector('.area-settings')?.open"))

    print("\n" + "=" * 60)
    if problems:
        print("PROBLEMS (%d):" % len(problems))
        for p in problems:
            print(" -", p)
    else:
        print("No problems found.")

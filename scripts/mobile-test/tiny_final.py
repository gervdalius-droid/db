#!/usr/bin/env python3
"""Confirm the only sub-10.4px text left on a phone is avatar initials inside circles."""
import json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp import Chrome
from shots import boot

JS = """(function(){
  const out=[];
  document.querySelectorAll('.view.active *, .modal *').forEach(el=>{
    if(!el.offsetParent) return;
    if(!el.textContent || !el.textContent.trim() || el.children.length) return;
    const fs=parseFloat(getComputedStyle(el).fontSize);
    if(fs>=10.4) return;
    const cs=getComputedStyle(el);
    const isAvatar=el.classList.contains('avatar') || (cs.borderRadius.includes('50%') && el.textContent.trim().length<=3);
    if(!isAvatar) out.push({fs, cls:String(el.className||el.tagName), txt:el.textContent.trim().slice(0,24)});
  });
  return out;
})()"""

VIEWS = ["planner","floor","projects","production","paslauga","design","orders","materials",
         "warehouse","calendar","schedule","team","report","daily","notifs","discipline","import"]
bad = []
with Chrome(width=390, height=844, dpr=2) as c:
    boot(c)
    for v in VIEWS:
        c.eval(f"showView({json.dumps(v)})")
        time.sleep(0.4)
        for r in (c.eval(JS) or []):
            bad.append((v, r))
    c.eval("showView('project','p1')")
    time.sleep(0.5)
    for r in (c.eval(JS) or []):
        bad.append(("project", r))
    c.eval("openAddTaskModal('p1')")
    time.sleep(0.5)
    for r in (c.eval(JS) or []):
        bad.append(("modal", r))

print("non-avatar text under 10.4px on a phone:", len(bad))
for v, r in bad[:20]:
    print(" ", v, json.dumps(r, ensure_ascii=False))

#!/usr/bin/env python3
import json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp import Chrome
from shots import boot

JS = """(function(){
  const t=document.querySelector('#projects-content table');
  if(!t)return 'no table';
  const box=t.parentElement;
  return {tableW:t.scrollWidth, containerW:box.clientWidth, fits:t.scrollWidth<=box.clientWidth+1,
          cols:[...t.querySelectorAll('thead th')].filter(h=>h.offsetParent).map(h=>h.textContent.trim()+':'+Math.round(h.getBoundingClientRect().width))};
})()"""

with Chrome(width=390, height=844, dpr=2) as c:
    boot(c)
    for w in (390, 360, 320):
        c.resize(w, 800)
        c.eval("showView('projects');")
        time.sleep(0.6)
        print(w, json.dumps(c.eval(JS), ensure_ascii=False))
    c.resize(1440, 900, dpr=1)
    c.eval("showView('projects');")
    time.sleep(0.6)
    print(1440, json.dumps(c.eval(JS), ensure_ascii=False))

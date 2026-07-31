#!/usr/bin/env python3
"""Log into the db app in local mode with rich demo data and screenshot views at phone size."""
import json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp import Chrome

HERE = os.path.dirname(os.path.abspath(__file__))
SEED = open(os.path.join(HERE, "seed.js")).read()
URL = "http://localhost:8736/"

VIEWS = sys.argv[1:] or ["floor", "projects", "production", "design", "paslauga",
                         "planner", "calendar", "warehouse", "materials", "team", "orders"]


def boot(c):
    c.goto(URL, wait=3.0)
    print("login-logs:", c.drain_logs())
    r = c.eval("typeof offlineLogin")
    assert r == "function", r
    c.eval("localStorage.clear(); offlineLogin();")
    time.sleep(1.2)
    print("seed:", c.eval(SEED))
    c.eval("save&&0; renderSidebar(); applyNavVisibility&&applyNavVisibility();")
    c.eval("dismissWelcome&&dismissWelcome();")
    c.eval("const tc=document.getElementById('toast-container'); if(tc)tc.innerHTML=''; window.toast=function(){};")
    time.sleep(0.4)


if __name__ == "__main__":
    out = os.path.join(HERE, "shots")
    os.makedirs(out, exist_ok=True)
    with Chrome(width=390, height=844, dpr=2) as c:
        boot(c)
        for v in VIEWS:
            c.eval(f"showView({json.dumps(v)});")
            time.sleep(0.7)
            p = os.path.join(out, f"{v}.png")
            c.shot(p, full=True)
            logs = c.drain_logs()
            print(f"{v}: {p}" + (f"  LOGS={logs}" if logs else ""))
        # menu open
        c.eval("showView('floor'); toggleMobileMenu();")
        time.sleep(0.5)
        c.shot(os.path.join(out, "menu.png"))
        print("menu:", c.drain_logs())

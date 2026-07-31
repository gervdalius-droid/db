# Phone test harness

Drives the app in a headless Chrome at phone size over CDP. No node/npm needed —
`cdp.py` speaks the DevTools protocol with nothing but the Python stdlib.

It logs in through `offlineLogin()` (local mode, no Supabase credentials required)
and injects `seed.js`, a dataset that covers every project category: gamyba,
paslauga, projektavimas, paused, overdue, completed and archived.

## Run

    cd ~/github/db && python3 -m http.server 8736 &
    cd scripts/mobile-test
    python3 verify.py      # every view at 390 + 360 px, manager + worker, desktop regression
    python3 behaviour.py   # project bucketing, collapse, archive, language, badges, tab highlight
    python3 click_all.py   # taps every menu entry and project row, fails on console errors
    python3 tiny_final.py  # asserts no non-avatar text under 10.4px on a phone
    python3 table_check.py # asserts the Visi projektai table fits at 390/360/320
    python3 shots.py floor projects design   # screenshots into ./shots

All five scripts assume the server is on port 8736 (see `URL` in `shots.py`).

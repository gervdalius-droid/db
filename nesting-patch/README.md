# NESTING patch — ready to deploy

This folder is the productized **Nesting** app: the same code as your live nesting
repo, now with `config.js` + the subscription gate + workspace-scoped logins —
mirroring what we did for the DB app. Smoke-tested (the login renders and the JS
runs); the live login + paywall flows still need a real test against your
projects.

## What's here
| File | Use |
|---|---|
| `index.html` | Patched nesting app (config-driven, gate wired into login + auto-login) |
| `config.js` | **Private** config — your projects, paywall OFF, workspace `S4OQX`, legacy logins |
| `config.commercial.js` | **Product** config template — paywall ON, per-company logins (fill TODOs) |
| `shared/fabsuite-license.js` | The shared gate/paywall module (same as the DB repo) |

## What changed in the app (vs your current nesting)
- Backend URLs/keys, brand, tenant code, and the worker-login scheme now come from
  `config.js` (with safe fallbacks). Two backends stay separate: **DATA** (nesting
  jobs) and **WAREHOUSE** (auth + shared stock + `fab_orgs`).
- **Subscription gate** runs after login and on auto-login: it checks the
  workspace's **`nesting`** entitlement in the warehouse project. Skipped when
  `PAYWALL_ENABLED:false`. Fails open on network error.
- **Workspace-scoped logins**: in product mode the login shows a *"Darbo vietos
  kodas"* field; the worker's hidden email becomes `name.<CODE>@fabflow.app`, so
  identical names in different companies don't collide. Your private build keeps
  the old `name.gvs@dedesbaldai.lt` scheme unchanged.

## Deploy — your private nesting (no behaviour change)
Upload these to your existing **`nesting`** repo:
- `index.html`, `config.js`, and `shared/fabsuite-license.js`

`config.js` here points at your projects with the paywall OFF, so your team logs
in exactly as before.

## Deploy — the FabFlow Nesting product
1. Create a **`fabflow-nesting`** repo (GitHub Pages).
2. Fill the TODOs in `config.commercial.js`:
   - `WAREHOUSE_URL`/`WAREHOUSE_ANON_KEY` = your **commercial DB project** (same one
     the DB product uses — that's where `fab_orgs` + the gate live).
   - `DATA_URL`/`DATA_ANON_KEY` = a nesting data project for customers.
3. Upload `index.html`, `shared/fabsuite-license.js`, and
   `config.commercial.js` **renamed to `config.js`**.
4. In that commercial DB project, make sure `set-worker-pin` has
   `FABSUITE_AUTH_DOMAIN=fabflow.app` (so worker emails match), and that Stripe has
   a **Nesting** product (the seed script already creates it).

That's it — a paying customer with a **Nesting** or **Suite** plan can now log into
the nesting app with their company code, and a customer without it sees the paywall.

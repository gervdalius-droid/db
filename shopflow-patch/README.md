# ShopFlow → the CraftOS DB app

The production app customers buy under the **`db`** plan is ShopFlow (repo
`shopflow`). It lives in its own repo and is **wrapped, not edited** — the same
arrangement as Offer and Invoices.

```
shopflow-patch/
  craftos.js              ← login + subscription gate + workspace storage + hand-offs
  config.js               ← private deployment (paywall OFF)
  config.commercial.js    ← product deployment (paywall ON)  → becomes config.js
  shared/                 ← fabsuite-license.js + CraftOS logo/favicon
```

## Two layers of login, on purpose

| Layer | What it answers | Where it lives |
|---|---|---|
| **Workspace** | *which company's shop is this device looking at* | CraftOS sign-in — manager email + password, or a worker's own CraftOS login. Enforced by RLS on the row key. |
| **Profile** | *who is standing at this machine right now* | ShopFlow's own picker + 4-digit PIN. Unchanged. |

A shop tablet is signed in to the workspace **once**; after that the crew just
taps a face and types a PIN, which is the right UX for a shared shopfloor
screen. A worker on their own phone can sign the device in themselves from the
*Team member* tab.

## How the wrapping works

ShopFlow already renders a cloud gate before its profile picker, so the CraftOS
login drops into that slot and looks native:

| Seam | Stock behaviour | In the product |
|---|---|---|
| `Sync.needsGate()` | no shop password yet | no CraftOS session yet |
| `Sync.gateHtml/bindGate()` | one shared shop password | manager / team member / local |
| `Sync.push/pull()` | `workspaces` row | `fabflow` row `fab_<WS>_shopflow` |
| `Sync.login()` | one shared shop account | the signed-in user's own account |

Live updates: upstream uses Supabase realtime through the JS SDK. The wrapper
talks plain REST (no CDN dependency), so it polls every 15 s while the tab is
visible instead.

> **A trap worth knowing.** ShopFlow declares `App`, `Store`, `Sync`, `D`, `M`,
> `Toast` and `Drawer` with `const`. Those are lexical globals — real bindings in
> the script realm, but **not** properties of `window`. `window.App` is
> `undefined`; reference them by bare name.

## A clean workshop on first run

A paying customer must never open their workspace onto the demo shop's invented
team, orders and materials — least of all its PINs, which are printed in a
public README. When a workspace has no saved row, the wrapper empties orders,
members, materials, articles, portfolios, boards and activity, keeps what is
domain knowledge (the station workflow, permissions, shift), and asks the owner
for a name and a PIN. Everyone else is added under **Team**.

## The hand-offs

In — the same query contract the old DB app used, so CRM and Offer needed no
change:

```
?from=crm|offer&project=…&client=…&value=…&deal=…&ws=…
```

It becomes a production order routed through every non-engineering station, and
the order drawer opens on it.

Out — two buttons in the order drawer:

- **To cutting →** `NESTING_URL/?project=…&gvs=<orderId>&ws=…`
- **Invoice this →** `INVOICES_URL/?from=shopflow&client=…&project=…&qty=…&ref=<WO>`
  (the Invoices app opens a draft with the buyer and the line filled in)

And the shared warehouse: materials are published to `fabflow_stock` for the
Nesting app, keyed by `workspace_code,sku`.

## Build

```bash
bash scripts/build-product.sh shop     # → build/fabflow-shop/
```

Push that to the `fabflow-shop` repo (GitHub Pages). Override the source
location with `SHOP_SRC=/path/to/repo`.

Two files must **never** ship and the build refuses if they appear:
`realdata.js` (a real workshop's client data) and `sync-config.js` (that
workshop's own Supabase connection).

## Known gaps

- **DE/ES.** ShopFlow ships EN + LT, translated by matching exact English
  strings at render time. The suite sells in four languages; the other two are
  still owed.
- **Offcuts.** ShopFlow has no offcut concept, so it publishes stock to Nesting
  but not `fabflow_offcuts` — Nesting owns that table and writes it itself.
- **Per-worker accountability.** Every device in a workspace shares one Supabase
  principal, so the audit trail's author is asserted by the client, not proven
  by auth. That is the same trade the Invoices app makes, and it is fine for a
  kiosk; revisit it if a customer needs accountability that survives a
  determined user.

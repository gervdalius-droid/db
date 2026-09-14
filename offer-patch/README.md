# Offer → CraftOS product build

The Offer calculator lives in its own repo (`offer`, a single `index.html`).
This folder turns that file into a sellable CraftOS app **without editing it**.

```
offer-patch/
  craftos.js              ← login + subscription gate + workspace-scoped storage + brand
  config.js               ← private deployment (paywall OFF)
  config.commercial.js    ← product deployment (paywall ON)  → becomes config.js
  shared/                 ← fabsuite-license.js + CraftOS logo/favicon
```

## How the wrapping works

`craftos.js` loads **after** the app's own script and overrides four seams:

| Seam | Stock behaviour | In the product |
|---|---|---|
| `cloudOn()` | true when the user pasted a URL + key | true whenever a workspace is signed in |
| `cloudList()` | `GET /rest/v1/quote_projects` | `fabflow` rows with key `fab_<WS>_offer_*` |
| `cloudSave()` | insert into `quote_projects` | upsert one `fabflow` row |
| `cloudDelete()` | delete from `quote_projects` | delete that `fabflow` row |

Everything else — the calculator, the PDF, the i18n — is untouched, so an
upstream change to the calculator needs no re-patching.

It also injects a login box (manager email+password, worker code+name+PIN, or
"this browser only"), runs `FabsuiteLicense.gate({app:'offer'})`, swaps in the
CraftOS logo/title/favicon, and adds a workspace chip with cross-links to CRM
and DB in the header.

## Build

`bash scripts/build-product.sh` reads `~/github/offer/index.html`, injects the
three script tags, and writes `build/fabflow-offer/`. Push that to the
`fabflow-offer` repo (GitHub Pages).

## Multi-tenancy

Quote projects are stored per workspace (`fab_<CODE>_offer_<name>`), so two
customers can both have a project called "Virtuvė" without colliding — the same
namespacing the DB and CRM apps use.

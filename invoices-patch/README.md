# Invoices → CraftOS product build

The invoicing app lives in its own repo (`invoices`, a single `index.html` plus
a lazily-downloaded company registry). This folder turns that file into a
sellable CraftOS app **without editing it**.

```
invoices-patch/
  craftos.js              ← login + subscription gate + workspace-scoped storage + brand
  config.js               ← private deployment (paywall OFF)
  config.commercial.js    ← product deployment (paywall ON)  → becomes config.js
  shared/                 ← fabsuite-license.js + CraftOS logo/favicon
```

## How the wrapping works

The app already keeps its whole state as **one document** and syncs it to a
Supabase table the user configures by hand. `craftos.js` loads after the app's
own script and overrides that connection on the `Cloud` object the app exposes
on `window`:

| Seam | Stock behaviour | In the product |
|---|---|---|
| `Cloud.on()` | true once URL + key + password were entered | true whenever a workspace is signed in |
| `Cloud.token()` | its own refresh token | the CraftOS session token |
| `Cloud.fetchRemote()` | `invoice_workspaces` row | `fabflow` row `fab_<WS>_invoices` |
| `Cloud.put()` | ditto | ditto |
| `Cloud.signOut()` | forget the connection | sign out of CraftOS |

Everything else — the editor, the printed document, the VAT arithmetic, the UBL
export, the registry search — is untouched, so an upstream change needs no
re-patching.

It also injects a login box (manager email+password, worker code+name+PIN, or
"this browser only"), runs `FabsuiteLicense.gate({app:'invoices'})`, swaps in the
CraftOS title/favicon, and adds a workspace chip with cross-links to DB, Offer
and CRM.

## Build

`bash scripts/build-product.sh invoices` reads `~/github/invoices/index.html`,
injects the three script tags and writes `build/fabflow-invoices/`. Push that to
the `fabflow-invoices` repo (GitHub Pages). Override the source location with
`INVOICES_SRC=/path/to/repo`.

`cloud-config.js` is deliberately **not** shipped — the wrapper owns the
connection, and the app already tolerates that script 404-ing.

## Multi-tenancy

The whole document lives under one key, `fab_<CODE>_invoices`, so 0005's
row-level security already covers it: the key carries the workspace code, and a
customer can only read or write keys for workspaces they belong to.

Two safeguards live in `firstSync()`:

* signing into a **different** workspace in a browser that still holds the
  previous company's books clears the local copy before syncing — two customers'
  invoices never mix;
* a **first** sign-in where both sides hold data asks which side wins instead of
  silently picking one.

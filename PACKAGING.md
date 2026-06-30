# Packaging — single app or the whole suite

Every app is sold **two ways at once**:

- **As one unit** — a customer buys just that app (e.g. only Nesting, or only DB).
- **As the whole suite** — one subscription unlocks **all** apps, at a discount.

| Plan | Unlocks | Monthly | Annual |
|---|---|---|---|
| Nesting | Nesting | €39 | €390 |
| DB | DB | €49 | €490 |
| **Suite** | **every app** | **€69** | **€690** |

## How it works (app-agnostic)

- Each customer workspace (`fab_orgs`) carries an **`apps`** list of unlocked app
  codes. A single-app plan sets e.g. `['nesting']`; the **suite expands to every
  app in the catalog**.
- The Stripe webhook fills `apps` from each product's `fabsuite_apps` metadata.
- Every app gates itself with the same one-liner — it just checks whether its own
  code is in the list:
  ```js
  hasAccess = ent.comp || (ent.active && ent.apps.includes(APP_CODE));
  ```
- Nothing is hardcoded to "two apps." The catalog lives in one place:
  `ALL_APPS` (env `FABSUITE_APPS`, default `nesting,db`).

## Adding a new app later (e.g. "quote")

It's a small, well-defined checklist — no core changes:

1. **The app:** deploy it (its own page) with a `config.js` that sets
   `APP_CODE: "quote"`, `PAYWALL_ENABLED: true`, and includes
   `shared/fabsuite-license.js` + the gate (see `NESTING_INTEGRATION.md`).
2. **Catalog:** `supabase secrets set FABSUITE_APPS=nesting,db,quote` and redeploy
   the `admin` function. Now "free access" and the suite include it automatically.
3. **Stripe:** add a standalone entry to `PLANS` in `scripts/stripe-seed.mjs`
   (the suite auto-bundles it), run the seed, then set the new
   `PRICE_QUOTE_MONTH` / `PRICE_QUOTE_YEAR` secrets.
4. **Storefront:** add the plan to `fabsuite/config.js` (and
   `fabsuite/config.commercial.js`). The pricing page renders plans from config,
   so the new card appears automatically.
5. *(optional)* add a checkbox for it in the operator console's "manual override".

That's it — the new app is immediately sellable on its own **and** part of the
suite.

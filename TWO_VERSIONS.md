# Two versions: your private app + the FabFlow product

You run **one codebase**, deployed **twice**. The only thing that differs is a
small `config.js`. Never fork the code — edit here, rebuild the product.

```
   THIS repo  (db)  ───────────────►  private app   ·  your Supabase  ·  paywall OFF  ·  "Dėdės Baldai"
        │  bash scripts/build-product.sh
        ▼
   build/fabflow/   ──push──►  fabflow repo  ───────►  the product  ·  NEW Supabase  ·  paywall ON  ·  "FabFlow"
                                                                         every customer = one workspace
```

- **Your private app stays exactly as it is** — same URL, your data, no paywall.
- **The product is a build of the same files** with `config.commercial.js`
  swapped in. Customers sign up through the storefront; each company becomes a
  workspace in the **separate** commercial Supabase project, so customer data
  never touches yours.
- You **don't** make a copy per customer — one product instance serves them all.

## The config switch

| Setting | Private (`config.js`) | Product (`config.commercial.js`) |
|---|---|---|
| Supabase | your project | new customer-only project |
| `PAYWALL_ENABLED` | `false` | `true` |
| Brand / title | Dėdės Baldai | FabFlow |
| Worker-email domain | `dedesbaldai.lt` / `gvs` | `fabflow.app` / `ff` |

`index.html` reads all of these from `window.FAB_CONFIG` (with safe fallbacks),
so the HTML is byte-for-byte identical in both deployments.

## Day-to-day workflow

1. Make changes here in the `db` repo (your source of truth) and test on your
   private app.
2. When you want to ship to customers:
   ```bash
   bash scripts/build-product.sh      # → build/fabflow/
   ```
3. Upload the **contents** of `build/fabflow/` to the `fabflow` repo (drag-and-drop
   in GitHub's "Add file → Upload files", or `cd build/fabflow && git push`).

That's it — customers get the update, your private app is untouched.

## One-time: stand up the product

1. **Create the commercial Supabase project** (a new project, separate from
   `byvtqycdgboqbmpoysyt`). Copy its URL + anon key from Settings → API.
2. In that new project, do everything in **`FABSUITE_SETUP.md`** — run the SQL
   migration, deploy the 4 edge functions (+ `set-worker-pin`), set the Stripe
   secrets, add the webhook. (Run it against the **new** project, not your
   private one.)
3. Fill the two TODO values in **both**:
   - `config.commercial.js`
   - `fabsuite/config.commercial.js`
   with the new project's URL + anon key. Update `APP_URLS` / `FABSUITE_URL` to
   wherever the `fabflow` repo is served.
4. Create the **`fabflow`** GitHub repo, run `build-product.sh`, push, and turn
   on GitHub Pages.
5. Point a domain (e.g. `fabflow.app`) at it when ready, then update
   `FABSUITE_URL` / `APP_URLS` and rebuild.

> Your **private** project does **not** need the billing tables. If you already
> ran the SQL migration there, it's harmless (the paywall is off). Ideally the
> `fab_orgs` / Stripe infra lives only in the commercial project.

## NESTING — same pattern

The nesting app (repo `nesting`) gets the identical treatment:
1. Extract its hardcoded Supabase/brand into a `config.js` (mirror what we did in
   `index.html`).
2. Add the gate from `NESTING_INTEGRATION.md`, behind a `PAYWALL_ENABLED` flag.
3. Build a `fabflow-nesting` deploy with the commercial config.

## ✅ Worker-login collisions — fixed (config-driven)

Worker logins are now namespaced by a `WORKER_EMAIL_SCOPE` flag:

- **Private app** (`config.js`): `WORKER_EMAIL_SCOPE: "workshop"` — unchanged
  `slug(name).gvs@dedesbaldai.lt`; your existing worker accounts keep working.
- **Product** (`config.commercial.js`): `WORKER_EMAIL_SCOPE: "workspace"` —
  `slug(name).<WORKSPACE_CODE>@fabflow.app`, so two customers who each have a
  "Jonas" get separate accounts. The `set-worker-pin` function also enforces that
  an admin can only manage workers in their **own** workspace.

**Commercial project setup:** the `set-worker-pin` function builds the email
domain from an env var, so it matches the app:
```bash
supabase secrets set FABSUITE_AUTH_DOMAIN=fabflow.app
```
(Keep it equal to `AUTH_DOMAIN` in `config.commercial.js`.) Redeploy the function
after setting it: `supabase functions deploy set-worker-pin`.

> When you productize **NESTING**, apply the same `WORKER_EMAIL_SCOPE` logic to
> its `authEmail` so its worker logins match the DB app's (same accounts, both
> apps).

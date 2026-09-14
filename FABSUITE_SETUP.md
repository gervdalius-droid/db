# CraftOS — selling CRM, Offer, Invoices, Nesting & DB as subscriptions

This repo contains everything to charge for the five apps with **Stripe**, gate
access per **workspace** (= one customer company), and onboard customers through
the **fabsuite** storefront.

> Before going live, work through **`LAUNCH.md`** — it lists what is still
> blocking real customers (tenant isolation, legal details, support address).

---

## How it fits together

```
  fabsuite/ (storefront)          Supabase                         Stripe
  ─────────────────────           ────────────────────────         ──────────────
  index.html   pricing   ──┐
  signup.html  ───────────►│  register-org ─► fab_orgs row     create customer
                           │  create-checkout-session ────────► Checkout (14-day trial)
  success.html ◄───────────┘                                   │
                                                                ▼
  DB / NESTING / INVOICES app           stripe-webhook ◄──── subscription events
  ─────────────────────                 (updates fab_orgs.status + apps)
  enterApp() → FabsuiteLicense.gate()
        │  org_entitlement(code)  ─────► reads fab_orgs
        ▼
   active? → app loads.  inactive? → paywall (Subscribe / Manage billing)
  account.html → create-portal-session ─► Stripe Billing Portal (card, cancel, invoices)
```

**Tenant = workspace.** The apps already namespace every row in `fabflow` by a
workspace code (`fab_<CODE>_…`). The new `fab_orgs` table maps that same code to
a Stripe subscription and the list of unlocked apps. The apps ask
`org_entitlement(code)` and either load or show a paywall.

| File / piece | What it does |
|---|---|
| `supabase/migrations/0000_base_schema.sql` | the app tables themselves (run first on a fresh project) |
| `supabase/migrations/0001_fabsuite_billing.sql` | `fab_orgs`, `org_members`, RLS, `org_entitlement()`, comp helper |
| `supabase/migrations/0002_admin_audit.sql` | admin console audit trail |
| `supabase/migrations/0003_apps_catalog.sql` | adds CRM + Offer to the catalog; back-fills suite/comp workspaces |
| `supabase/migrations/0004_project_tenancy.sql` | `fabflow_projects` gains `workspace_code` (was globally keyed on name) |
| `supabase/migrations/0005_tenant_isolation.sql` | **RLS on every app table**, keyed to `org_members` — read the header first |
| `supabase/migrations/0006_invoices_app.sql` | adds Invoices to the catalog; back-fills suite/comp workspaces |
| `supabase/functions/create-checkout-session` | Start Stripe Checkout for a plan |
| `supabase/functions/create-portal-session` | Open Stripe Billing Portal |
| `supabase/functions/stripe-webhook` | Sync subscription → `fab_orgs` (source of truth) |
| `supabase/functions/register-org` | Provision a workspace on signup |
| `shared/fabsuite-license.js` | Entitlement check + paywall (both apps reuse it) |
| `fabsuite/` | Landing, pricing, signup, account, success/canceled, terms, privacy |
| `crm/` | The CRM app (source; built to `fabflow-crm`) |
| `offer-patch/` | Wrapper that turns `~/github/offer` into the CraftOS Offer app |
| `invoices-patch/` | Wrapper that turns `~/github/invoices` into the CraftOS Invoices app |
| `scripts/stripe-seed.mjs` | Create the products & prices in Stripe |
| `index.html` | DB app — gate wired into `enterApp()`, billing link in sidebar |

---

## Setup (one time)

### 1 · Database
Supabase → **SQL Editor** → paste **all** of
`supabase/migrations/0001_fabsuite_billing.sql` → **Run**. (Idempotent.)

### 2 · Keep your existing company working (comp it)
Find your current workspace code in the DB app (sidebar → *Darbo vietos kodas*),
then in the SQL Editor run:

```sql
select public.fabsuite_grant_comp('YOURCODE', 'Dėdės Baldai');
```

This flags that workspace as permanently free (`comp = true`) so billing going
live never locks you out.

### 3 · Create Stripe products
```bash
npm i stripe
STRIPE_SECRET_KEY=sk_test_xxx node scripts/stripe-seed.mjs
```
It creates five products (CRM, Offer, Nesting, DB, the CraftOS suite) and prints
the ten `PRICE_*` IDs. Keep that output.

### 4 · Deploy the edge functions
```bash
npm i -g supabase
supabase login
supabase link --project-ref byvtqycdgboqbmpoysyt

supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy register-org
supabase functions deploy stripe-webhook --no-verify-jwt   # Stripe can't send a Supabase JWT
```

### 5 · Set the secrets
```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_xxx \
  FABSUITE_URL=https://dbxfabflow.github.io/fabflow/fabsuite \
  FABSUITE_APPS=crm,offer,invoices,nesting,db \
  FABSUITE_TRIAL_DAYS=60 \
  PRICE_CRM_MONTH=price_...     PRICE_CRM_YEAR=price_... \
  PRICE_OFFER_MONTH=price_...   PRICE_OFFER_YEAR=price_... \
  PRICE_NESTING_MONTH=price_... PRICE_NESTING_YEAR=price_... \
  PRICE_DB_MONTH=price_...      PRICE_DB_YEAR=price_... \
  PRICE_SUITE_MONTH=price_...   PRICE_SUITE_YEAR=price_...
```

`FABSUITE_APPS` is what the **suite** plan unlocks — add an app code here and the
suite includes it automatically. `FABSUITE_TRIAL_DAYS` must match `TRIAL_DAYS` in
`fabsuite/config.commercial.js`, which is what the storefront advertises.

> Do **not** set `FABSUITE_FREE_SIGNUP` in production — it comps every signup and
> skips Stripe entirely. It exists only for testing without payments.
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically.

### 6 · Wire the Stripe webhook
Stripe → **Developers → Webhooks → Add endpoint**
- URL: `https://byvtqycdgboqbmpoysyt.supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed`, `customer.subscription.created`,
  `customer.subscription.updated`, `customer.subscription.deleted`,
  `invoice.payment_failed`

Copy the **Signing secret** (`whsec_…`) and set it:
```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 7 · The storefront
`fabsuite/` is plain static HTML — it's already served at
`https://gervdalius-droid.github.io/db/fabsuite/`. When you move it to its own
domain, update:
- `fabsuite/config.js` → `APP_URLS` (where DB & Nesting live)
- `index.html` → `const FABSUITE_URL`
- the `FABSUITE_URL` Supabase secret

> The instant signup flow needs **email confirmation OFF** in Supabase →
> Authentication → Providers → Email (it already is for this project, since the
> apps sign managers in immediately).

---

## Test it (Stripe test mode)

1. Open `fabsuite/index.html` → pick a plan → **Pradėti**.
2. Fill company/email/password → **Tęsti į apmokėjimą**.
3. Use test card `4242 4242 4242 4242`, any future date/CVC.
4. Land on `success.html` with a workspace code.
5. Open the **DB app**, log in as that manager → it loads (trialing = active).
6. In Stripe, cancel the subscription → within seconds the webhook flips the
   workspace to `canceled`; reload the DB app → **paywall** appears.
7. `account.html` → **Valdyti atsiskaitymus** → Stripe portal opens.

---

## Pricing (edit in `config.js` **and** `scripts/stripe-seed.mjs` together)

| Plan | Unlocks | Monthly | Annual |
|---|---|---|---|
| CRM | CRM | €29 | €290 |
| Offer | Offer | €29 | €290 |
| Nesting | Nesting | €39 | €390 |
| DB | DB | €49 | €490 |
| **CraftOS** | all four | **€89** | **€890** |

All plans start with a free trial (`FABSUITE_TRIAL_DAYS`, currently 60) and
collect the card up front through Stripe Checkout, so they convert on their own.

## How gating behaves

- **Active / trialing / past_due** → app loads (past_due = grace while Stripe
  retries the card).
- **canceled / unpaid / none** → paywall blocks entry.
- **comp = true** → always free (your legacy workspace).
- **Network/Supabase error** → *fails open* (loads) so an outage never locks a
  paying customer out. Only an explicit "inactive" answer paywalls.
- Offline/local mode (`LOCAL` workspace) is never gated.

---

## Notes & next steps

- **EU VAT:** you chose Stripe (you are the merchant of record). Turn on
  **Stripe Tax** for automatic VAT, and collect VAT IDs for B2B reverse-charge.
  Add `automatic_tax: { enabled: true }` to `create-checkout-session` once Tax
  is configured.
- **Data isolation:** workspaces are separated by code (existing behaviour).
  `fab_orgs`/`org_members` give you the mapping to add strict RLS on `fabflow`
  later if you want hard isolation — that's an independent hardening step, not
  required for billing.
- **NESTING app:** see `NESTING_INTEGRATION.md` — a ~10-line drop-in.
- **OFFER app:** see `offer-patch/README.md` — wrapped rather than edited, so
  upstream changes to the calculator need no re-patching.
- **Tenant isolation:** migrations 0004 + 0005 are written but **not yet applied
  anywhere**. Deploy the current `set-worker-pin` first, then run them against a
  restored/staging project and verify a worker login still works
  (`select public.fab_whoami();`). See blocker 2 in `LAUNCH.md`.
- **Tests:** `bash scripts/suite-test/run.sh` boots all four apps headlessly and
  checks the cross-app hand-offs, backup round-trips, auth headers and
  translations. It exits non-zero on failure — run it before every deploy.
- **Go live:** swap `sk_test_`/`pk_test_` for live keys, re-run the seed script
  in live mode, add a live webhook endpoint, update `STRIPE_WEBHOOK_SECRET`.

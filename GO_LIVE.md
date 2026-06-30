# Go-live — start selling, one step at a time

Plain-language recipe to go from the demo to really taking money. No prior
knowledge assumed. Steps marked **🤝 (I can help)** are the few technical ones —
tell me when you reach them and we'll do them together.

> You only do this **once**. After that, customers sign up by themselves.

---

## What you'll need first (free to start)
- A **Stripe** account → handles the card payments. (stripe.com — sign up)
- A **Supabase** account → the customer database. (supabase.com — sign up)
- Your **GitHub** account → where the websites live. (you already have this)

Keep a note open to paste a few keys into as you go.

---

## Phase A — The customer database

**A1.** In Supabase, click **New project**. Name it e.g. `fabflow`. Pick a region
near you. Wait ~2 min for it to finish.

**A2.** Open the project → **Settings → API**. Copy two things into your notes:
- the **Project URL** (looks like `https://abcd....supabase.co`)
- the **anon public** key (a long text string)

**A3.** Left menu → **SQL Editor → New query**. Open the file
`supabase/migrations/0001_fabsuite_billing.sql`, copy **everything**, paste, click
**Run**. Do the same with `supabase/migrations/0002_admin_audit.sql`.
✅ This creates the tables that track customers and subscriptions.

---

## Phase B — Payments (Stripe)

**B1.** In Stripe, make sure you're in **Test mode** (toggle, top-right) for now.

**B2.** **Developers → API keys** → copy the **Secret key** (`sk_test_...`) into
your notes.

**B3. 🤝** Create the products & prices. Easiest: I run the prepared script
(`scripts/stripe-seed.mjs`) with your test key and it makes Nesting, DB, and the
Suite automatically, then gives you the price IDs. (Or you can create 3 products
by hand in Stripe → Products.)

---

## Phase C — The "robots" that connect everything (edge functions)

These are small programs that run on Supabase: start checkout, open the billing
portal, react to payments, provision new customers, manage workers, and power your
admin console.

**C1. 🤝** Deploy the functions in `supabase/functions/`:
`create-checkout-session`, `create-portal-session`, `stripe-webhook`,
`register-org`, `set-worker-pin`, `admin`. These can be deployed by pasting each
into Supabase → **Edge Functions → Deploy a new function** (like you did for
`set-worker-pin`), or with one command each. I'll guide you.

**C2.** Set the secrets (Supabase → **Edge Functions → Manage secrets**) — paste:
- `STRIPE_SECRET_KEY` = your `sk_test_...`
- `STRIPE_WEBHOOK_SECRET` = (you get this in Phase D)
- the six `PRICE_...` IDs from B3
- `FABSUITE_URL` = your shop's web address (Phase E)
- `FABSUITE_ADMINS` = your email (so only you can use the admin console)
- `FABSUITE_AUTH_DOMAIN` = `fabflow.app`

> Note: `stripe-webhook` must be deployed with "Verify JWT" **off** — Stripe
> can't send a Supabase login. (I'll point this out at the right moment.)

---

## Phase D — Tell Stripe to notify the database

**D1.** Stripe → **Developers → Webhooks → Add endpoint**.
- URL: `https://<your-project>.supabase.co/functions/v1/stripe-webhook`
- Choose events: `checkout.session.completed`,
  `customer.subscription.created/updated/deleted`, `invoice.payment_failed`.

**D2.** Copy the **Signing secret** (`whsec_...`) → set it as
`STRIPE_WEBHOOK_SECRET` (back in C2).
✅ Now, when someone pays, the database updates itself automatically.

---

## Phase E — Put the websites online

You'll have two websites (same as the demo): the **DB app + shop**, and the
**Nesting app**.

**E1.** Fill in the settings files with your Phase A keys:
- `config.commercial.js` and `fabsuite/config.commercial.js`
  → paste your **Project URL** + **anon key** (replace the `TODO...` parts).
- `nesting-patch/config.commercial.js` → same keys.
**🤝** I can fill these in for you once you paste the two keys.

**E2.** Build the shop+app files: run `scripts/build-product.sh` → it makes a
`build/fabflow/` folder. Create a GitHub repo named **fabflow**, upload that
folder's contents, and turn on **Pages** (Settings → Pages).

**E3.** For Nesting: create a repo **fabflow-nesting**, upload the files from
`nesting-patch/` (using `config.commercial.js` renamed to `config.js`), turn on
Pages.

**E4.** Put the real web addresses back into the config files (`FABSUITE_URL`,
the app links) and re-upload. (Small loop — I'll help.)

---

## Phase F — Make yourself the admin

**F1.** Supabase → **Authentication → Users → Add user** → your email + a
password. Tick **Auto Confirm**.

**F2.** Make sure `FABSUITE_ADMINS` (C2) contains that email.
✅ Open `https://<your-fabflow-site>/admin/` and sign in.

---

## Phase G — Test, then flip the switch

**G1.** Do a real run in **test mode**: go to your shop, sign up, pay with Stripe's
test card `4242 4242 4242 4242` (any future date/CVC). Open the app — it should
unlock. (Use `TESTING.md` as your tick-list.)

**G2.** When happy: in Stripe switch to **Live mode**, redo B2/B3/D with live keys,
update the secrets, and you're selling for real. 🎉

---

### The honest summary
- The **clicking** parts (create accounts, paste keys, upload files, turn on Pages)
  you can do yourself.
- The **🤝 technical** parts (the seed script, deploying functions) are quick — we
  do them together; you paste me a key or some output and I hand you the result.
- Nothing here is risky in **test mode**. You can practice the whole thing with
  fake cards before going live.

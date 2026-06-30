# Operator console — manage customers, subscriptions & everything else

A simple website where a **non-technical person** can run the whole business:
see every customer, grant or cancel access, extend trials, reset passwords, and
jump to Stripe for money matters. No code, no SQL.

- **Console (what you click):** `admin/index.html` → deployed at
  `https://<your-fabflow-site>/admin/`
- **Brain (does the work safely):** the `admin` edge function. It runs with full
  rights on the server and only obeys people on your **admin allowlist**, so the
  browser never holds any secret keys.

```
  you ──login──►  admin/index.html  ──your token──►  admin edge function ──► Supabase + Stripe
                                                      (checks your email is an admin)
```

---

## What you can do from it

| In the console | What it does |
|---|---|
| **Dashboard** | Totals: customers, active, trialing, past-due, free, and estimated monthly revenue (MRR). |
| **Search / filter customers** | Find any company by name, code, or email; filter by status. |
| **Suteikti nemokamą prieigą** | Give a customer everything for free (e.g. a friend, a pilot). One click. |
| **Pratęsti prieigą** | Add days to their access — extend a trial without touching Stripe. |
| **Atšaukti prenumeratą** | Cancel in Stripe — at period end or immediately. |
| **Vadovo slaptažodis** | Set a new password for a customer's manager if they're locked out. |
| **Atidaryti Stripe** | Jump straight to that customer in Stripe for refunds / cards / invoices. |
| **Rankinis koregavimas** | Advanced: fix status/apps by hand if something ever looks wrong. |
| **Pašalinti klientą** | Remove a customer from the registry (asks you to type the code). |
| **Paskutiniai veiksmai** | A log of every admin action — who did what, and when. |

Every action is recorded in the audit log (table `fab_audit_log`).

---

## One-time setup (in the COMMERCIAL Supabase project)

1. **Audit table** — SQL Editor → run `supabase/migrations/0002_admin_audit.sql`.
2. **Deploy the function:**
   ```bash
   supabase functions deploy admin
   ```
3. **Create your admin login** — Supabase → Authentication → Users → *Add user*
   → your email + a password (this is *your* console login). Tick "Auto Confirm".
4. **Set who is allowed** — list the admin email(s):
   ```bash
   supabase secrets set FABSUITE_ADMINS=you@example.com
   # multiple admins: FABSUITE_ADMINS=you@example.com,partner@example.com
   ```
   (`STRIPE_SECRET_KEY` is already set from the billing setup.)
5. **Open it** — `https://<your-fabflow-site>/admin/` → sign in.

> The console is included automatically when you run `scripts/build-product.sh`
> (it copies the `admin/` folder into the product). It reads the commercial
> Supabase URL/key from the same `config.js`, so it always targets the right
> project.

---

## Security notes (plain language)

- Only emails in **`FABSUITE_ADMINS`** can do anything. Anyone else who finds the
  page can log in but every action returns "no admin rights".
- The powerful key (service role) lives **only on the server**, never in the
  page. The console just sends your login token; the function checks it.
- Want the page itself hidden? Deploy `admin/` to a separate private repo/host
  instead of bundling it — the function's allowlist protects it either way.
- Refunds and card changes are intentionally **not** rebuilt here — the "Atidaryti
  Stripe" button sends you to Stripe, the safest place for money operations.

---

## Adding/removing admins later

Just update the secret and redeploy nothing — the function reads it live:
```bash
supabase secrets set FABSUITE_ADMINS=you@example.com,newperson@example.com
```
Create the new person's login in Supabase → Authentication → Users.

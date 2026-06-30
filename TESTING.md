# Testing checklist (QA) — does everything work?

Tick each box. Two parts: **A) the demo** (do this now, no setup) and **B) the
real thing** (after go-live, in Stripe test mode). For each: *do this → you should
see that.*

---

## A) Demo — click-through (no accounts, nothing real)

Open `demo/index.html` and use the 5 buttons.

- [ ] **Shop opens** — button 1 → you see the landing page and, lower down, three
      price cards (Nesting, Suite, DB) with a monthly/annual toggle.
- [ ] **Toggle works** — switch monthly ↔ annual → the prices change.
- [ ] **Sign-up form** — button 2 → you can type company, email, password.
- [ ] **"Payment" is skipped in demo** — press *Tęsti į apmokėjimą* → you land on
      the success screen (no real Stripe).
- [ ] **Success shows a code** — button 3 → you see a workspace code (e.g.
      `DEMO42`) and buttons to open the apps.
- [ ] **Locked state** — button 4 → the app shows the 🔒 paywall with *Pasirinkti
      planą*.
- [ ] **Unlocked state** — click *✓ Su prenumerata* → the paywall disappears and
      the app is visible.
- [ ] **Operator console** — button 5 → you see stats, a customer list with status
      colours, and *Paskutiniai veiksmai*.
- [ ] **Open a customer** — click any row → a panel slides in with Suteikti nemokamą
      prieigą / Pratęsti / Atšaukti / Stripe / etc.

If all ticked: the **experience** is working. ✅

---

## B) Real run — after go-live (Stripe TEST mode)

Card to use everywhere: **`4242 4242 4242 4242`**, any future expiry, any CVC.

### Buying
- [ ] On your real shop, pick the **Suite** plan → sign up → pay with the test card
      → you reach the success page with a real workspace code.
- [ ] In Stripe → **Customers**, the new customer appears with a **trialing** or
      **active** subscription.
- [ ] In your **operator console**, the new customer appears in the list.

### Using the apps
- [ ] Open the **DB app**, log in as that manager (the email/password you signed up
      with) → the app loads (no paywall).
- [ ] In DB, set a worker's **PIN** (Komanda → narys → PIN).
- [ ] Open the **Nesting app**, enter the **workspace code** + the worker name +
      PIN → it loads. (Same login works in both apps.)

### Single-app vs suite
- [ ] Make a second customer who buys **only DB** → the DB app loads, but the
      **Nesting** app shows the paywall for them.

### Losing access
- [ ] In Stripe (or the operator console), **cancel immediately** → reload the app
      → the **paywall** appears.
- [ ] In the operator console, **Suteikti nemokamą prieigą** to that customer →
      reload the app → it loads again.
- [ ] **Pratęsti prieigą** by 30 days → the customer's "valid until" date moves.

### Billing self-service
- [ ] From the app's **Prenumerata** link (or account page) → *Valdyti
      atsiskaitymus* opens the Stripe billing portal.

### Your own company (private app) is untouched
- [ ] Your existing DB/Nesting apps still work exactly as before, with **no
      paywall** (they use the private config).

If all ticked in test mode → switch Stripe to **Live** and you're ready to sell. ✅

---

### If something fails
Tell me which box failed and what you saw — that's usually enough for me to pinpoint
it (most issues are a missing secret or a function not deployed).

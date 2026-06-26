# Deploy the "set-worker-pin" helper (one time)

This lets a **manager set/reset any worker's PIN from inside the app** (Komanda →
worker → Redaguoti → **Prisijungimo PIN**). The actual password change runs in a
secure Supabase Edge Function so the admin key never touches the browser.

You deploy it once. After that, PIN management lives in the app forever.

The function code is in: `supabase/functions/set-worker-pin/index.ts`

---

## Easiest: deploy from the Supabase dashboard

1. Supabase → project **byvtqycdgboqbmpoysyt** → **Edge Functions**.
2. Click **Deploy a new function** (or **Create function**).
3. Name it **exactly**: `set-worker-pin`
4. Delete the sample code, then paste the **entire contents** of
   `supabase/functions/set-worker-pin/index.ts`.
5. Leave **"Verify JWT"** ON (default).
6. Click **Deploy**.

That's it — no secrets to set. (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
are provided to the function automatically.)

---

## Alternative: deploy with the Supabase CLI

```bash
# one-time
npm i -g supabase
supabase login
supabase link --project-ref byvtqycdgboqbmpoysyt

# from inside the db repo folder
supabase functions deploy set-worker-pin
```

---

## How to use it (after deploy)

1. Log in to the db app as the **manager**.
2. Go to **Komanda** (Team) → pick a worker → **Redaguoti**.
3. Type a 4-digit **PIN** → **Nustatyti**.
   - First time → creates the worker's login.
   - Again later → resets their PIN.
4. The worker can now log in with their **name + that PIN** in **both** the db app
   and the Nesting app.

## Test / troubleshoot

- **"Tik vadovas gali nustatyti PIN"** → you're not logged in as a manager, or the
  manager's admin profile is missing. Log in via the manager (email + password) tab.
- **404 / "HTTP 404"** → the function name isn't exactly `set-worker-pin`, or it isn't
  deployed yet.
- **CORS error in the browser console** → make sure you pasted the whole file
  (the CORS headers at the top are required).

## Security notes

- The service-role key stays inside the function (server-side) — never in the app.
- The function refuses anyone who isn't a logged-in admin (checks the caller's token
  **and** that they have an admin profile).
- It only ever sets accounts in the `name.gvs@dedesbaldai.lt` / `PIN_dedes` scheme —
  it cannot touch admin accounts or anything else.

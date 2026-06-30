# Add the subscription gate to the NESTING app

The NESTING app (repo `nesting`) shares the same Supabase project and the same
workspace-code model as DB, so gating it is a ~10-line drop-in using the shared
license client. Do this in the nesting app's `index.html`.

## 1 · Load the shared client

Either copy `shared/fabsuite-license.js` into the nesting repo, or reference it
from the db repo (same Supabase backend, CORS-safe for a plain script):

```html
<script src="https://gervdalius-droid.github.io/db/shared/fabsuite-license.js"></script>
```

## 2 · Gate after login

Find the point where a user has logged in and the app knows the **workspace
code** and the user's **access token** (the same `SB_TOKEN` / workspace code the
nesting app already uses to read `fabflow`). Right before you reveal the app UI,
add:

```js
// ── Fabsuite subscription gate (app: 'nesting') ──
if (window.FabsuiteLicense && WORKSPACE_CODE && WORKSPACE_CODE !== 'LOCAL') {
  FabsuiteLicense.config({
    supabaseUrl: SB_URL,                                   // your Supabase URL
    anonKey:     SB_KEY,                                   // your anon key
    fabsuiteUrl: 'https://gervdalius-droid.github.io/db/fabsuite',
    app:         'nesting',
  });
  const ok = await FabsuiteLicense.gate({
    workspaceCode: WORKSPACE_CODE,
    token: SB_TOKEN,                                       // the user's access token
    onSignOut: () => logout(),                             // your logout function
  });
  if (!ok) return;   // paywall is showing — stop booting the app
}
```

Map `WORKSPACE_CODE`, `SB_URL`, `SB_KEY`, `SB_TOKEN`, and `logout()` to whatever
the nesting app calls them. That's it.

## What the user sees

- Workspace has an active **Nesting** or **Fabsuite** plan (or is comp'd) → app
  loads normally.
- Otherwise → a paywall overlay with **Pasirinkti planą** (→ fabsuite pricing)
  and **Valdyti atsiskaitymus** (→ Stripe portal).

The check fails open on network errors, so a Supabase hiccup never blocks a
paying customer.

## Notes

- The DB-only plan does **not** unlock Nesting, and vice-versa. The **Fabsuite**
  plan unlocks both. This is enforced by `app: 'nesting'` above (it checks
  `has_nesting`).
- No backend changes are needed in the nesting repo — all billing infra lives in
  this `db` repo's Supabase functions and `fab_orgs` table.

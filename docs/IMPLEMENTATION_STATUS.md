# Implementation status

Updated after the stabilization build on this branch.

## Completed

- Repository inspection against the current tree, not the earlier notes alone.
- Legacy `SuperAdmin.jsx` settings markup is valid JSX. The production build no longer prints the stray-brace warning.
- Legacy login always clears its loading flag. Network failure, timeout, and a non-JSON response return an error. A short phone number is rejected before any request.
- Legacy data screens catch a failed load, show an alert with Retry, and do not stay on Loading. The dashboard does not invent a collection percentage when the month has no invoices.
- Deferred modules (gate, amenities, volunteers, WhatsApp centre, AI) stay in the repo and are off the primary role menus. `/legacy` still opens them.
- `node_modules` and `dist` are gitignored.
- New platform at `/`: email/password session, community setup with required approval limits, role-based navigation, and screens that call the ledger, collection, expense, reconciliation, statement, ticket, meeting, resolution, document, and notification functions.
- Empty states instead of sample rupee figures.
- Migration `supabase/migrations/20261118120000_platform_foundation.sql`: communities, memberships, double-entry journal, collections, expenses, reconciliation, statements, elected auditors, tickets, meetings, resolutions, documents, notifications, RLS, and storage policies when the storage schema exists.
- SQL assertions in `supabase/tests/ledger_rls.sql`.

## Files

Application: `src/main.jsx`, `src/index.css`, `src/SocietyOS.jsx`, `src/components/*`, `src/lib/supabase.js`, `src/lib/authApi.js`, `src/lib/async.js`, `src/platform/*`.

Backend: `supabase/migrations/20261118120000_platform_foundation.sql`, `supabase/tests/bootstrap.sql`, `supabase/tests/ledger_rls.sql`, `scripts/test-db.sh`.

Tooling: `package.json`, `package-lock.json`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `playwright.config.js`, `env.example`.

Docs: this folder.

## Database

One migration. It has been applied only to a disposable local database named `societyos_test`. It has not been applied to a hosted Supabase project.

## Tests executed

- `npm test` — Vitest 2.1.9, 4 files, 12 tests, all passed.
- `npm run test:db` — exit 0, final line `database tests passed`.
- `npm run build` — Vite 5.4.21, succeeded in 1.58s, no JSX warning. Largest chunks: `index` 182.07 kB (gzip 59.96 kB), `supabase` 176.73 kB (gzip 46.68 kB), `Platform` 50.29 kB (gzip 12.58 kB). The previous single bundle was about 682 kB.
- `npx playwright test` — 4 passed. Legacy login rejected a short number. With the environment's Supabase URL set, a 10-digit lookup showed "Could not reach the server" and the button returned to Continue. The platform showed sign-in, showed no sample balance of ₹2,84,500, and a failed sign-in restored the Sign in button. The heading remained visible at 390×844.

## Build status

Production build succeeds.

## Supabase

Not connected as a verified hosted project. The previously configured host `wzchqxwwezklxsxmjvyt.supabase.co` does not resolve. This environment currently injects `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; requests to that host fail and the UI surfaces the failure. Do not treat that as a working backend.

## Outstanding

- Create a new Supabase project, apply the migration, and set the two `VITE_` variables. Do not apply `supabase/schema.sql` beside it.
- The legacy `auth-login` function still compares a PIN. The new platform does not use it. Production sign-in is Supabase Auth email and password.
- Redaction is a second uploaded file. There is no PDF redaction engine.
- Fund export is CSV. Statement output is the browser print dialog.
- Email and WhatsApp are not delivered. In-app `notifications` rows are.
- Reconciliation matching asks for the statement-line and journal-entry ids. It does not auto-match a CSV.
- Storage policies are created only when the migration runs where `storage.objects` exists. They were not executed in local PostgreSQL, which has no storage schema.
- Phases 5–8 are represented by the schema, RPCs, and screens. They are not a completed pilot: there is no hosted RLS run, no backup drill, and no resident walkthrough on real community data.

## Next

1. Provision Supabase and apply the migration.
2. Create the first community through the setup screen, add units, open funds, and post opening balances with `post_journal`.
3. Walk the treasurer, auditor, and resident paths against that project.
4. Replace the legacy PIN function before any production login.

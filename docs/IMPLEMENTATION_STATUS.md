# Implementation status

Updated after the pre-merge review of pull request #2. This is not a production-ready release. The migration has been applied only to a disposable local database. It has not been applied to a hosted Supabase project, and the resident, treasurer, and auditor workflows have not passed integration testing against a real project.

## Review findings

### Critical

- **Fixed.** `complete_reconciliation` treated a zero statement opening, a zero statement closing, and zero movement inside the period as reconciled, even when the bank book balance was not zero. An exception also rolled back the stored difference. The difference is now statement closing minus the book balance of that bank account for entries on or before the period end, in the same community. A non-zero difference is stored and the row stays open. Unmatched lines return null and stay open. Status becomes `reconciled` only when the difference is zero and every line is matched.

### High

- **Fixed.** `publish_statement(..., true)` could skip the reviewed-status check. Publication now always requires `reconciled_and_reviewed`. The exceptions flag only skips the open-expense and open-reconciliation counts, and then the status is `published_with_exceptions`.
- **Fixed.** `review_statement` could move a published statement back to `clarification_required`, which hid it from residents. A review after publication adds an audit row and leaves the status published.
- **Fixed.** There was no way to append a correction after publication without rewriting the immutable snapshot. `append_statement_version` inserts the next version after a newer auditor review and does not update older versions.
- **Fixed.** `start_reconciliation` did not prove the bank account belonged to the community. A treasurer of another community could attach it. The account must be a bank account in that community.
- **Fixed.** `match_statement_line` accepted any journal entry id. The entry must be in the reconciliation's community, must touch that bank account, and the reconciliation must still be open.
- **Fixed.** `certify_auditor_election` counted every ballot that was not the winner, so two runners-up of one vote each could block a two-vote winner. It now compares the winner with the second-place candidate. Certification also waits until `voting_ends_on`, requires the candidate to be an active member, and refuses an election whose seat count is not 1.
- **Fixed.** `cast_auditor_ballot` did not require the candidate to be a member.
- **Fixed.** `post_journal` could not store `reverses_entry_id`, so a reversal was not linked. `reverse_entry` posts the opposite lines, stores the link, and rejects a second reversal.
- **Fixed.** `GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private` exposed helpers such as `private.notify_members`, which has no caller check. Authenticated now has execute only on `private.has_role`, `private.is_member`, and `private.occupies`. The other private functions run inside security-definer functions owned by the migration role.
- **Fixed.** A concurrent insert with the same idempotency key could surface a raw unique violation. The insert now catches that conflict and returns the existing entry when the payload hash matches.

### Medium

- **Fixed.** The same approver could insert two `expense_approvals` rows and meet a committee quorum alone. The pair is unique, a repeat decision is rejected, and a race on that constraint returns the same error.
- **Fixed.** `close_vote` counted vacant units. Quorum now uses units with an open occupancy.
- **Fixed.** `propose_resolution` did not check that the meeting belonged to the community.
- **Fixed.** Every member could read draft expenses and payment references. Members see approved expenses. Financial roles still see every row.
- **Fixed.** `record_collection` locks the demand before checking the outstanding amount.
- **Fixed.** `documents` now stores `storage_bucket`. Public files must use `community-published`. Other access classes must use `community-originals`. The path must start with the community id. Storage policies use `storage_community`, which returns null for a non-uuid folder instead of failing the listing. A public invoice still has to be marked redacted. That flag is not a redaction algorithm.
- **Fixed.** Fund and bank balance totals ignore a journal row whose entry is not in the account's community.
- **Fixed.** `review_subject` rejects an unknown subject and checks that a reconciliation or statement belongs to the community. It still does not change an amount.
- **Fixed.** The statement review button sent `reconciled_and_reviewed` as the review status. The function expects `verified`, `clarification_required`, or `disputed`.

### Low

- **Documented, not built.** Elections with `auditor_seats` greater than 1 are refused instead of silently electing one person. Multi-seat certification is not implemented.
- **Documented, not built.** Reconciliation matching is by statement-line id and journal-entry id. There is no automatic CSV match.
- **Documented, not built.** Email and WhatsApp are not sent. Export is CSV, not Excel. Statements use the browser print dialog, not a PDF file. The legacy PIN function still compares a PIN. Redaction is a second uploaded file. No hosted row-level-security run has been executed. Storage policies are not executed in local PostgreSQL because that database has no `storage` schema.
- **Not a defect for a fresh project.** `CREATE ROLE` for `anon` and `authenticated` is skipped when the role exists. `pgcrypto` is created with `IF NOT EXISTS`. The profile trigger on `auth.users` is the standard pattern. `supabase/schema.sql` must not be applied beside this migration. This migration has never been applied to a hosted project, so the review edits stay in the same file.

## Completed

- Repository inspection against the current tree, not the earlier notes alone.
- Legacy `SuperAdmin.jsx` settings markup is valid JSX. The production build no longer prints the stray-brace warning.
- Legacy login always clears its loading flag. Network failure, timeout, and a non-JSON response return an error. A short phone number is rejected before any request.
- Legacy data screens catch a failed load, show an alert with Retry, and do not stay on Loading. The dashboard does not invent a collection percentage when the month has no invoices.
- Deferred modules (gate, amenities, volunteers, WhatsApp centre, AI) stay in the repo and are off the primary role menus. `/legacy` still opens them.
- `node_modules` and `dist` are gitignored.
- New platform at `/`: email/password session, community setup with required approval limits, role-based navigation, and screens that call the ledger, collection, expense, reconciliation, statement, ticket, meeting, resolution, document, and notification functions. Treasurers can reverse a posted entry. A published statement can receive a corrected version after a new auditor review.
- Empty states instead of sample rupee figures.
- Migration `supabase/migrations/20261118120000_platform_foundation.sql`: communities, memberships, double-entry journal, collections, expenses, reconciliation, statements, elected auditors, tickets, meetings, resolutions, documents, notifications, RLS, and storage policies when the storage schema exists.
- SQL assertions in `supabase/tests/ledger_rls.sql`, including the defects listed above.

## Files

Application: `src/main.jsx`, `src/index.css`, `src/SocietyOS.jsx`, `src/components/*`, `src/lib/supabase.js`, `src/lib/authApi.js`, `src/lib/async.js`, `src/platform/*`.

Backend: `supabase/migrations/20261118120000_platform_foundation.sql`, `supabase/tests/bootstrap.sql`, `supabase/tests/ledger_rls.sql`, `scripts/test-db.sh`.

Tooling: `package.json`, `package-lock.json`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `playwright.config.js`, `env.example`.

Docs: this folder.

## Database

One migration. It has been applied only to a disposable local database named `societyos_test`. It has not been applied to a hosted Supabase project.

## Tests executed

Results below are from the review fixes on this branch. They are local. They are not a hosted integration test.

- `npm test` — Vitest 2.1.9, 4 files, 12 tests, all passed.
- `npm run test:db` — exit 0, final line `database tests passed`, including the reconciliation, reversal, quorum, election, and statement regressions.
- `npm run build` — Vite 5.4.21, succeeded in 1.50s, no JSX warning. Largest chunks: `index` 182.07 kB (gzip 59.96 kB), `supabase` 176.73 kB (gzip 46.68 kB), `Platform` 51.45 kB (gzip 12.81 kB).
- GitHub CI on `0884f8f` had one check, Cloudflare Pages, and it succeeded. There was no failing check to repair. The review commit starts a new Pages deployment. Playwright was not re-run: the smoke path is the unconfigured sign-in screen, and these fixes sit behind an authenticated session.

## Interface

The product name is SABHA. The sign-in screen shows the wordmark, “Clarity in Every Community.”, and “A transparent platform for community finances, decisions and accountability.” The primary sign-in is still email and password. It does not collect a mobile number, does not offer public registration, and does not send an OTP. There is no self-service password recovery screen. A replacement password is issued by the community administrator. The older phone sign-in remains at `/legacy` for communities that already stored a number. That sign-in no longer returns the phone number or PIN to the browser, and resident lists show only the last four digits.

## Branding

Checked on 19 November 2026. User-facing titles, the sign-in screens, the application shell, the profile line, the PWA manifest, the favicon, and the install icons now say SABHA. The strings live in `src/brand.js`. The mark and wordmark files are under `public/brand/`. Rules are in `docs/BRAND.md`.

Authentication, role navigation, ledger functions, and row-level security were not changed. The browser title is `SABHA — Clarity in Every Community.` The manifest `name` and `short_name` are `SABHA`. A bad sign-in still shows an alert and leaves the Sign in button usable. `/legacy` still opens and shows the same wordmark. Logout and role navigation remain covered by `src/platform/session.test.jsx`.

Names kept on purpose: the npm package `societyos`, `src/SocietyOS.jsx`, the storage key `societyos_auth`, the synthetic address `@societyos.app`, the local database `societyos_test`, the Pages hostname `societyos.pages.dev`, environment variable names, database objects, migration filenames, and the WhatsApp verify-token default.

## Mobile layout

The resident, treasurer, and auditor shell is mobile-first. Below 1024px the primary bar is Home, Finance, Concerns, Meetings, and More. Documents, notifications, profile, and role-specific tools sit under More. A left sidebar appears from 1024px. The earlier Super Admin screens stay at `/legacy` and remain a desktop layout. They were not rebuilt.

The palette is warm ivory, deep ink, stone, white, and terracotta. Forest green is removed. Secondary text uses `#5C5852` and small accent text uses `#8C4E3B` because the specified muted `#77736D` and terracotta `#A65F49` fall short of 4.5:1 on ivory. Terracotta remains the mark and the primary button colour. Headings use Manrope. Interface text uses Inter. Amounts use tabular numerals.

Home shows the posted fund balance, posted receipts, and posted payments. Those figures are the authorised ledger totals. They are not labelled as this calendar month, because the dashboard function does not return a month slice and a resident cannot see every collection. Latest statement, next meeting, open public concerns, and notifications come from the same dashboard function. Empty communities still show “No fund balances yet” and no rupee amount.

Finance uses one section at a time and fund rows instead of a wide table. Expenses can be searched and filtered. Publishing, paying, reversing, and closing a vote ask for confirmation. Concerns open with a Raise concern action and a public/private explanation. Documents label a resident copy separately from a restricted original and open through a signed URL.

Offline caching of financial data was not added. The existing manifest and icons remain. There is no claim of offline use.

Checked on 19 November 2026 at 320, 360, 390, 430, 768, 1024, and 1440px on the sign-in page and `/legacy`. No horizontal overflow and no page errors. A failed sign-in still shows an alert. Signed-in resident, treasurer, and auditor screens were not walked on a hosted project because the Supabase host does not resolve. Role navigation and sign-out remain covered by the session test. Private rows are still enforced by the unchanged row-level security policies.

## Branding verification

- `npm test` — Vitest 2.1.9, 4 files, 12 tests, all passed. The unconfigured screen asserts the SABHA heading and the tagline, and asserts that SocietyOS is not shown.
- `npm run test:db` — exit 0, final line `database tests passed`.
- `npm run build` — Vite 5.4.21, succeeded. The built `index.html` title is `SABHA — Clarity in Every Community.`
- Browser check of the production build: title and manifest name are SABHA, the sign-in heading and tagline render, a failed sign-in shows “Could not reach the server. Check your connection and try again.”, and `/legacy` shows the SABHA heading. The hosted Supabase host still does not resolve, so a real session was not created.

## Build status

Production build succeeds.

## Supabase

Not connected as a verified hosted project. The previously configured host `wzchqxwwezklxsxmjvyt.supabase.co` does not resolve. This environment currently injects `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; requests to that host fail and the UI surfaces the failure. Do not treat that as a working backend.

## Hosted demo attempt (19 November 2026)

The Pages site opens, and sign-in cannot succeed. No demo accounts were created and no resident, treasurer, or auditor workflow was run against a hosted database.

- Preview: `https://cursor-transparency-platform.societyos.pages.dev`. The built client embeds `https://wzchqxwwezklxsxmjvyt.supabase.co`. That host does not resolve.
- The Yasvik organization is on the free plan. Creating a separate project named SocietyOS Demo was rejected because the account has reached its limit of two active free projects. The quoted cost of another project was $0 per month, and the limit still blocked it.
- The only project visible in this session is the live Yasvik store. It contains products, orders, customers, and tax records. The SocietyOS migration was not applied there, and that project was not paused or deleted.
- This environment has no Cloudflare API token. The Pages environment variables were not changed. `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` still have to be set on the Pages project, followed by a rebuild, after an empty Supabase project exists. The service-role key must not be added as a `VITE_` variable.
- DEMO role logins are defined, and they have not been created on a hosted project. The sign-in page lists them. `npm run seed:demo` creates them on an empty project when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set. It refuses the live Yasvik store and the unreachable host. The shared password is `Sabha-Demo-2026`. The community name is `DEMO · Palm Court`. No ledger entries are posted.
- Society OS (`wzchqxwwezklxsxmjvyt`) was resumed by the owner on 19 November 2026. Its auth service answers. `public.communities` is not present, so the foundation migration has not been applied. This session still cannot run SQL or create users on that project. The client no longer blocks the host locally.

## Outstanding

- Free a Supabase project slot or upgrade the organization, create an empty project, and apply only `supabase/migrations/20261118120000_platform_foundation.sql`. Do not apply `supabase/schema.sql` beside it. Do not reuse the Yasvik store project.
- Set the two `VITE_` variables on Cloudflare Pages and rebuild.
- Walk the complete resident, treasurer, and auditor workflows on that project before calling the application production-ready.
- The legacy `auth-login` function still compares a PIN. The new platform does not use it. Production sign-in is Supabase Auth email and password.
- Redaction is a second uploaded file. There is no PDF redaction engine. A file marked redacted can still contain sensitive bytes.
- Fund export is CSV. Statement output is the browser print dialog.
- Email and WhatsApp are not delivered. In-app `notifications` rows are.
- Reconciliation matching asks for the statement-line and journal-entry ids. It does not auto-match a CSV.
- Storage policies are created only when the migration runs where `storage.objects` exists. They were not executed in local PostgreSQL, which has no storage schema.
- Multi-seat auditor elections are refused. They are not implemented.
- Phases 5–8 are represented by the schema, RPCs, and screens. They are not a completed pilot: there is no hosted RLS run, no backup drill, and no resident walkthrough on real community data.

## Next

1. Free a Supabase project slot or upgrade the Yasvik organization, then create an empty project and apply the foundation migration.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` on Cloudflare Pages and rebuild.
3. Create labelled demo accounts for resident, treasurer, elected auditor, committee administrator, and platform administrator. Keep the service-role key off the frontend.
4. Walk those accounts through the published-statement, collection, expense, reconciliation, reversal, and cross-community checks.
5. Replace the legacy PIN function before any production login.

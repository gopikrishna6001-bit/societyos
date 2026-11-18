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

## Build status

Production build succeeds.

## Supabase

Not connected as a verified hosted project. The previously configured host `wzchqxwwezklxsxmjvyt.supabase.co` does not resolve. This environment currently injects `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; requests to that host fail and the UI surfaces the failure. Do not treat that as a working backend.

## Outstanding

- Create a new Supabase project, apply the migration, and set the two `VITE_` variables. Do not apply `supabase/schema.sql` beside it.
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

1. Provision Supabase and apply the migration.
2. Create the first community through the setup screen, add units, open funds, and post opening balances with `post_journal`.
3. Walk the treasurer, auditor, and resident paths against that project.
4. Replace the legacy PIN function before any production login.

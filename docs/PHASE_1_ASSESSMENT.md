# Phase 1 — implementation assessment

Date: 19 November 2026. Branch: `cursor/phase-0-safety-recovery-fe89`. Pull request: #3.

This is an upgrade of the existing SocietyOS application into SABHA. It is not a second product. `/` is the transparency ledger. `/legacy` is the original apartment-management application. Both use Supabase project `wzchqxwwezklxsxmjvyt`. No hosted data was changed for this assessment.

## What is already working

- Phone and PIN login at `/legacy` through `auth-login`, with the session stored in Supabase Auth and `localStorage` key `societyos_auth`. The client no longer aborts slow requests at 30 seconds.
- Email and password sign-in at `/` through Supabase Auth, with roles from `community_memberships`.
- SocietyOS modules for dashboard, residents, committee, finances, complaints, notices, polls, meetings, gate, maintenance, amenities, volunteers, WhatsApp, AI assistant, and super admin still have screens and data calls.
- SABHA screens for home, finance, concerns, meetings, documents, notifications, units, and settings exist in `src/platform/`.
- Preview deploys are produced by Cloudflare Pages. Production `https://societyos.pages.dev` is a separate deployment and was not updated by this branch until someone promotes it.
- CI on commit `f928957` passed, and a Pages preview was published. That does not make the application production-ready.

## What pull request #3 fixed

Commit `f928957` only:

- SocietyOS expense reads and writes use `legacy_expenses` (`society_id`, `expense_date`, `status`, `category`).
- SocietyOS meeting reads and writes use `legacy_meetings` (`date`, `minutes_draft`, `minutes_final`, `rsvp`).
- Notification helpers use `legacy_notifications` (`resident_id`, `read`).
- The WhatsApp expense path uses `legacy_expenses`. The function was not deployed.
- `Financials.getExpenses` no longer embeds `vendors(name)`, because `legacy_expenses.vendor_id` has no foreign key to `vendors`.
- Regression tests lock those table names and columns. SABHA screens still query `expenses`, `meetings`, `notifications`, and `resolutions` with `community_id`.
- The SABHA sign-in screen hides demo accounts unless `VITE_ENABLE_DEMO_LOGIN=true`.
- Docs warn not to replay `20261118120000_platform_foundation.sql` on the hosted project.

Hosted `count(*)` on 19 November 2026: 3 rows in `legacy_expenses`; the other five legacy tables and the new ledger tables were empty. Storage buckets: 0.

## What remains broken or incomplete

- The two experiences are still separate applications. `/legacy` must stay until each module is inside the SABHA shell and verified.
- SABHA ledger writes (`create_expense`, `record_collection`, reconciliation, statements, auditor certification) depend on functions from the foundation migration that are not all installed. Reads can run. Writes are not production-ready.
- Legacy complaints are readable by every resident in the society (`residents_read_complaints`). SABHA private tickets are a different table.
- `auth-login` compares a plaintext PIN, allows unauthenticated `set_pin` and `reset_pin`, derives the Auth password from the resident id, and returns a reset PIN. `verify_jwt` must not be switched on by itself, because phone login has no user JWT yet.
- `ai-proxy` does not check a signed-in user. Hosted `verify_jwt` was not re-read.
- There are no storage buckets, so invoices, statements, and attachments cannot be stored with the policies SABHA expects.
- The approved eight-figure emblem is not in the repository. The installed mark is an open ring. Raster PWA icons still show that ring in the old colour.
- Secretary navigation hides finances. `is_committee()` allows them. Hiding the button is not the control.
- Many SocietyOS module interiors still use the earlier dark slate layout. Only the chrome, sign-in, and primary actions moved to the approved colours in this phase.

## Database compatibility that remains

| SocietyOS concept | Table the old screens must use | SABHA table to leave alone |
|---|---|---|
| Expenses | `legacy_expenses` | `expenses` |
| Meetings | `legacy_meetings` | `meetings` |
| Notifications | `legacy_notifications` | `notifications` |
| Resolutions | `legacy_resolutions` (no current screen) | `resolutions` |
| Bank accounts | `legacy_bank_accounts` (no current screen) | `bank_accounts` |
| Expense categories | `legacy_expense_categories` (no current screen) | `expense_categories` |

Do not copy rows from a legacy table into the SABHA table because the names once matched. Columns, keys, and money types differ. Foreign keys from `meeting_rsvps`, `motions`, `bank_transactions`, and `legacy_resolutions` still point at the legacy tables.

## Authentication and security that remain

One person must keep one Auth user (`residents.auth_user_id`). Phone login still overwrites that user's password, so email sign-in cannot be attached to the same user until that overwrite is removed. PIN hashing, authenticated `set_pin`, and a committee-only reset that does not return the PIN are the next auth change. They belong in one reviewed function deploy together with the client. This phase does not change `auth-login`.

## Recommended sequence

1. Keep PR #3's legacy query fix. Confirm the three historical expenses on a preview with a committee session. Do not promote it over `societyos.pages.dev` until that check is done.
2. Auth containment: stop public `set_pin` / `reset_pin` and stop deriving the Auth password, while phone login still works. Test with an existing resident before any production function deploy.
3. Complaint privacy migration, tested on a disposable database, not applied to the hosted project until approved.
4. Storage buckets `community-published` and `community-originals` in a new migration, applied only with approval.
5. Install missing ledger write functions as a diff against the live database, not by replaying the foundation file.
6. Move SocietyOS modules into the SABHA shell one at a time (Home, Community, Finance, Concerns, More). Delete `/legacy` only after each module is verified.
7. Add the approved emblem file when it is supplied, then replace the ring and the PWA icons.
8. Auditor election, reconciliation, and statement publication after the write functions exist.

## Done in this phase, after the assessment

User-facing identity only. No auth, schema, or hosted data change.

- Tagline is `Clarity in Community.`
- Navy, cyan, blue, and white are the sign-in background, chrome, current navigation item, and primary buttons.
- `/legacy` and phone/PIN login are unchanged in behaviour.
- The open-ring mark is recolored. It is not the eight-figure emblem.

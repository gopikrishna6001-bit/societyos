# SABHA phase 0 — production safety and recovery

Date: 19 November 2026. Branch: `cursor/phase-0-safety-recovery-fe89`.

This pass prepares consolidation. It does not merge, deploy, or change hosted data. The discovery audit remains the source of truth for the product inventory. Where this document and an older setup note disagree about the hosted database, this document is the later read-only check.

Hosted project: `wzchqxwwezklxsxmjvyt` (`https://wzchqxwwezklxsxmjvyt.supabase.co`, region observed earlier as `ap-southeast-1`). The Yasvik store project must stay untouched.

## What was implemented

Only the items in this section are code or tests on the branch.

1. SocietyOS expense, meeting and notification queries now use `legacy_expenses`, `legacy_meetings` and `legacy_notifications`. SABHA screens in `src/platform/screens.jsx` still use `expenses`, `meetings`, `notifications` and `resolutions` with `community_id`.
2. The WhatsApp bot's pending-expense read and expense insert use `legacy_expenses` and the historical columns (`society_id`, `status`, `expense_date`, `net_amount`, `category`, `created_by`). The function was not deployed.
3. `Financials.getExpenses` no longer asks PostgREST for `vendors(name)`. `legacy_expenses.vendor_id` has no foreign key to `vendors`, so that embed cannot resolve. `vendor_id` is still returned by `select('*')`.
4. Regression tests cover the service helpers and the Finances and Meetings screens. Results are in the test section below.
5. The SABHA sign-in screen no longer renders demo accounts or the shared password unless `VITE_ENABLE_DEMO_LOGIN` is exactly `true`. Production Pages projects must leave that variable unset. This does not delete the accounts or change Auth.

Nothing else was changed in authentication, row-level security, storage, migrations, or Cloudflare.

## 1. Production safety plan

### Keep serving the current sites

| Surface | URL | What it is |
|---|---|---|
| Production SocietyOS | `https://societyos.pages.dev` | The phone and PIN client residents already use. Keep this deployment on its current build until a tested replacement is ready. |
| SABHA preview | `https://cursor-transparency-platform.societyos.pages.dev` | Preview of `/` (SABHA) and `/legacy` (SocietyOS) against the same Supabase project. |
| This branch | not deployed | Legacy query fix and the demo-login gate. Do not point either Pages project at it until the checks below pass on a preview. |

Both front ends talk to the same Supabase project. A query fix in a new Pages deployment changes what the browser asks for. It does not rewrite rows. The safe rollout is:

1. Leave `societyos.pages.dev` on the build residents use today.
2. Deploy this branch only as a Cloudflare Pages **preview**. Exercise `/legacy` finances and meetings with a committee session, and `/` finance with a SABHA session.
3. Confirm the preview's legacy expense list returns the three historical rows (description, `expense_date`, `status`, `amount`) and that SABHA still queries `occurred_on` / `community_id`.
4. Promote the preview only after that check. Do not replay `supabase/migrations/20261118120000_platform_foundation.sql`.

`docs/DEPLOYMENT.md` and `docs/ENVIRONMENT_SETUP.md` used to say the foundation migration was not on this project, or that the host did not resolve. Both are stale. The tables already exist. Replaying the migration would try to create objects that are already there.

### Data that must not move in this phase

Read-only counts on 19 November 2026:

| Table | Rows |
|---|---|
| `legacy_expenses` | 3 |
| `legacy_meetings` | 0 |
| `legacy_notifications` | 0 |
| `legacy_resolutions` | 0 |
| `legacy_bank_accounts` | 0 |
| `legacy_expense_categories` | 0 |
| `expenses`, `meetings`, `notifications`, `resolutions` (SABHA) | 0 |
| `storage.buckets` | 0 |

The three expense rows are the historical set. Meetings, notifications, resolutions and bank accounts were renamed, but they are empty. Empty does not mean the tables can be dropped. Foreign keys still point at them:

- `bank_transactions.account_id` → `legacy_bank_accounts`
- `legacy_expenses.category_id` → `legacy_expense_categories`
- `meeting_rsvps.meeting_id` and `motions.meeting_id` → `legacy_meetings`
- `legacy_resolutions.meeting_id` → `legacy_meetings`

No SocietyOS screen currently selects `bank_accounts`, `expense_categories` or `resolutions`. Those names now belong to SABHA. Do not retarget SABHA queries at the legacy tables.

### Authentication stays as it is until a tested replacement exists

Phone and PIN login through `auth-login` stays. This branch does not change the function, does not create Auth users, and does not rewrite `residents.pin` or `residents.auth_user_id`.

## 2. Security remediation plan

Confirmed from the function source and from hosted policies. No production setting was changed.

### Publicly callable `auth-login`

`supabase/functions/auth-login/index.ts` accepts `lookup`, `login`, `set_pin` and `reset_pin` with the service-role client. The handler never checks `Authorization`. The repository has no `config.toml`, so the hosted `verify_jwt` toggle was **not** re-read from the dashboard in this pass. The function body itself is enough to treat the endpoint as public: anyone who can call the function URL can invoke every action.

**Immediate containment (reversible, not done):**

- In the dashboard, confirm `verify_jwt`. Turning it on will also block phone login, because the resident has no user JWT yet. Do not flip it until the client sends a credential the gateway accepts **and** `set_pin` / `reset_pin` are rejected or authenticated inside the function.
- Ship a new revision that refuses `set_pin` and `reset_pin` unless the caller presents a committee session, while `lookup` and `login` keep working. Rate-limit `login` and `lookup` by phone. Do not deploy that revision from this branch; it needs its own review so residents are not locked out.
- Stop returning the new PIN from `reset_pin`. The current function computes a PIN from the flat number and sends it back in the JSON body.

**Longer-term:** replace this function with the identity design in section 4. Do not keep a service-role function that compares a PIN and then overwrites the Auth password.

### Plaintext PIN storage and comparison

`login` reads `residents.pin` and compares it with `!==` to the request body. `set_pin` writes `new_pin` straight into `residents.pin`. That column is plaintext. A 4-digit PIN is also guessable.

**Immediate:** do not add new readers of `residents.pin`. Do not log the column. Committee tools must not render it.

**Longer-term:** store a one-way hash (Argon2id or bcrypt) in a column the browser role cannot select. Compare the hash only inside a rate-limited function. Keep the current column until every resident has a hash and a successful test login, then stop reading the plaintext column. Do not drop it in the same change as the first hash write.

### Unauthenticated `set_pin` and `reset_pin`

`set_pin` updates any resident id the caller supplies. `reset_pin` does the same and returns the new PIN. `SocietyOS.jsx` calls `set_pin` from the profile sheet after login, but the function does not check that the caller is that resident.

**Immediate containment:** require the resident's current session (`auth.uid()` matches `residents.auth_user_id`) for `set_pin`, and require `is_committee()` for `reset_pin`. Until that ships, treat resident UUIDs as secrets and do not put them in client logs.

### Predictable PIN reset

`reset_pin` sets the PIN to the last four digits of `flat_number`, padded with zeros. Anyone who knows a flat number and the resident id can predict the PIN after a reset.

**Immediate:** stop using the flat number as the PIN. A committee reset should set a random PIN, deliver it outside the API response, and set `pin_changed` false so the resident must replace it. Do not deploy a reset that still returns the PIN.

### Public demo accounts

`src/demoAccounts.js` holds five `@demo.sabha.app` users and one shared password. `src/platform/Platform.jsx` used to render that password on every SABHA sign-in screen, including a production build.

**Implemented now:** the panel loads only when `VITE_ENABLE_DEMO_LOGIN=true`. A production build with the variable unset does not render the password. Cloudflare production and the current preview must not set the variable.

**Still required before this is actually safe:**

- The password remains in the repository for `scripts/seed-demo-logins.mjs`. That is acceptable for a seed script and unacceptable on a public login form.
- The five Auth users still exist on the hosted project if the seed was run. Disabling them is a hosted Auth change and was **not** done. Recommended manual step, after the product owner agrees: ban or delete those users in the Supabase Auth dashboard for production, and recreate them only on a disposable project. Do not delete a user whose id is also `residents.auth_user_id` for a real resident. Check that link first with a read-only query.
- Dynamic import keeps the module out of the main graph when the flag is false. Confirm the production `dist` does not contain the password before promoting a build. The test run below includes that check when the flag is unset.

### Society-wide complaint visibility

Hosted policy `residents_read_complaints` is `SELECT` where `society_id = get_my_society_id()`. Every resident in the society can read every complaint. `residents_raise_complaints` is `INSERT` with no `WITH CHECK` visible in `pg_policies`. Committee members have `ALL` through `is_committee()`.

SABHA `tickets` are a different table and were designed with a private flag. Legacy `complaints` are not private.

**Immediate:** do not promise residents that a complaint is private. The UI copy should say society members can see it, until a policy change exists.

**Deliberate correction, later:** split public and private complaints. Private rows should be visible to the author, the assignee, and committee roles. That is a security correction, not a silent permission removal: today residents can see every row, and some screens depend on that. Product owner must accept the change. Apply it as a new policy in a reviewed migration, not by editing production in the dashboard during this phase.

`is_committee()` is true for any active `committee_members` row and for `residents.is_super_admin`. The SocietyOS navigation hides Finances from the secretary. The database does not. Hiding the button is not the control.

### AI endpoint

`supabase/functions/ai-proxy/index.ts` forwards the caller's prompt to Gemini with `GEMINI_API_KEY` and does not check a user. CORS is `*`. The hosted `verify_jwt` value is **UNKNOWN** (no function config in the repo, dashboard toggle not re-read). The source is enough to treat a public function as an open proxy for the Gemini key.

**Immediate containment:** set `verify_jwt` on, or reject requests with no user JWT inside the function, and cap body size. Do not deploy from this branch. `Meetings.jsx` can still call `VITE_AI_ENDPOINT` or `api.anthropic.com` directly from the browser, which is a separate key-exposure risk if a key is ever placed in `VITE_`.

`whatsapp-bot` also calls an AI helper. Its expense queries are retargeted. Its auth model was not changed.

### Storage buckets and policies

`storage.buckets` has zero rows. SABHA's `register_document` expects `community-published` and `community-originals`, with the path starting with the community id, and a public invoice marked redacted. Those buckets and their policies are not on the hosted project. There is nothing to lock down yet, and document upload cannot succeed.

**When buckets are created:** create them in a migration, not by hand on production first. Private originals and public redacted copies stay in different buckets. Do not add a public bucket for original invoices. Do not invent files to test this on the hosted project.

### What not to do in the name of speed

- Do not set `verify_jwt` off on any new function.
- Do not put the service-role key in a `VITE_` variable or in Pages.
- Do not reset every PIN to the flat number as a "recovery".
- Do not run `schema.sql`. Its policies are permissive and its names collide with the live tables.

## 3. Legacy compatibility — implemented, with test results

### Hosted columns the old screens need

`legacy_expenses`: `society_id`, `category_id`, `description`, `amount`, `net_amount`, `expense_date`, `status`, `approved_by`, `approved_at`, `rejected_reason`, `notes`, `created_by`, `category`, plus the other columns listed in `src/lib/legacyTables.js`.

`legacy_meetings`: `society_id`, `title`, `type`, `date`, `time`, `venue`, `meeting_link`, `agenda`, `quorum_required`, `attendees`, `rsvp`, `status`, `minutes_draft`, `minutes_final`, `action_items`.

`legacy_notifications`: `resident_id`, `read` (boolean), `created_at`, `title`, `body`.

SABHA `expenses` has `community_id`, `occurred_on`, `approval_status`, `payee`, and no `expense_date` or `society_id`. SABHA `meetings` has `held_on` and `minutes`, not `date` or `minutes_draft`. SABHA `notifications` has `recipient_id` and `read_at`, not `resident_id` and `read`. That mismatch is why the old screens returned HTTP 400.

### Call sites changed

| Caller | Now reads / writes |
|---|---|
| `src/components/Finances.jsx` load, insert, approve, reject | `legacy_expenses` ordered by `expense_date`, filtered by `society_id` |
| `src/lib/supabase.js` `Financials.getExpenses`, `createExpense`, `approveExpense`, `rejectExpense`, `getIncomeStatement` | `legacy_expenses` |
| `src/components/Meetings.jsx` load, create, RSVP, minutes, cancel | `legacy_meetings` ordered by `date` |
| `src/lib/supabase.js` `Meetings.*` | `legacy_meetings`, including embeds `meeting_rsvps` and `motions` (those foreign keys point at `legacy_meetings`) |
| `src/lib/supabase.js` `Reports.getNotifications`, `markNotificationRead`, `markAllRead` | `legacy_notifications` using `resident_id` and `read` |
| `supabase/functions/whatsapp-bot/index.ts` | `legacy_expenses` |

`src/platform/screens.jsx` was not retargeted.

No legacy screen queried `legacy_resolutions`, `legacy_bank_accounts` or `legacy_expense_categories`. Constants for those names are in `src/lib/legacyTables.js` so a later caller does not guess. Invoices, payments, complaints, notices, gate, staff and the other SocietyOS modules were not renamed and were left on their current tables.

### Tests actually executed

Command: `npm test` (Vitest). Database tests were not run against the hosted project. `npm run test:db` drops and recreates a local database named `societyos_test`; it was not required to prove these query targets, and it was not pointed at hosted Supabase.

The new tests are:

- `src/lib/legacyQueries.test.js` — service calls record `legacy_expenses`, `legacy_meetings` and `legacy_notifications`, the columns above, and the absence of SABHA columns on legacy writes. A source scan locks the same files and asserts `src/platform/screens.jsx` still uses the SABHA names and columns.
- `src/components/legacyScreens.test.jsx` — rendering Finances loads `legacy_expenses` with `select *`, `society_id`, `expense_date`. Adding an expense inserts `status: pending`, `expense_date`, `net_amount`, `category`, and does not send `community_id` or `occurred_on`. Rendering Meetings loads only `legacy_meetings` ordered by `date`.
- `src/platform/expired-session.test.jsx` — the sign-in form does not show the demo heading or the shared password when the flag is unset.

`npm test` on 19 November 2026: 9 files, 22 tests, all passed. That includes the three legacy query tests, the two screen tests, and the sign-in test that the demo password is not rendered. `npm run build` succeeded. With `VITE_ENABLE_DEMO_LOGIN` unset, `dist` does not contain the shared password or the `@demo.sabha.app` addresses. The words "DEMO accounts" remain in the sign-in chunk because that component still exists; it renders nothing unless the flag was true at build time. `npm run test:db` was not run. It rebuilds a local database and was not pointed at the hosted project.

### Not verified against hosted PostgREST

The unit tests mock the client. They prove the browser code asks for the right table and columns. They do not prove hosted RLS will return the three expense rows to a given user. Committee sessions pass `committee_manage_expenses` (`is_committee()` and matching society). A resident session does not have a select policy on `legacy_expenses`, which matches the old committee-only expense policy. Meetings allow resident `SELECT`. Notifications allow the owning resident or a committee member.

A preview click-through is still required before this branch replaces `societyos.pages.dev`.

## 4. Authentication migration design

Not implemented. Phone and PIN stay until the replacement below has been tested with the existing residents.

### One person, one Auth user

| Person | Today's identity | Target |
|---|---|---|
| Resident with phone and PIN | `residents` row. `auth_user_id` may already point at `auth.users`. Login creates `phone@societyos.app` with password `sos_` plus the resident id if that link is missing, and **resets that password on every login**. | The existing `auth.users` row whose id is `residents.auth_user_id`. Never call `createUser` when that column is set. Never call `updateUserById` to set a password derived from the resident id. |
| Committee member | Same resident row, plus `committee_members.role` (`President`, `Secretary`, `Treasurer`, `Committee Member`). | Same Auth user. Title stays on `committee_members`. Powers come from `community_memberships` (section 5). |
| Treasurer | Committee role `Treasurer`, or SABHA membership `treasurer`. | Same Auth user. Add `treasurer` membership if missing. Do not create a second login. |
| Resident auditor | SABHA role `resident_auditor` only, granted by `certify_auditor_election`. | Same Auth user as the resident. `grant_role` must still refuse this role. |
| Tenant | `residents.type = tenant`. No separate Auth model. | Same Auth user. Occupancy type `tenant` on `unit_occupancies`. No second account. |
| Super admin | `residents.is_super_admin`. | `community_memberships.role = platform_admin` on the communities they administer, or a single platform flag if the product owner wants one admin across communities. Still one Auth user. |
| New email/password user | `auth.users` plus `profiles` and `community_memberships`. May have no `residents` row. | Keep that Auth user. If they are also a phone resident, link the resident row to this id instead of creating another user. |

### Why the two logins cannot share a password dance

The current PIN login overwrites the Auth password with a value derived from the resident id. If that Auth user is also the email login, the next phone login destroys the email password. That is an account-takeover footgun as well as a lockout.

Until PIN verification no longer writes an Auth password:

- Do not enable email sign-in on a user that phone login still rewrites.
- Do not create a second Auth user "so email has its own password".

### Linking procedure (future migration, one resident at a time)

1. Read `residents.auth_user_id`, `residents.phone`, and `auth.users.email` for that person. Do not print the PIN.
2. If `auth_user_id` is set, that id is canonical. Stop.
3. If an email user already exists for that person, set `auth_user_id` to that id inside a transaction that refuses the update when the id is already used by another resident.
4. Only when neither exists, create one Auth user. Prefer the resident's real email when they have one. The synthetic `@societyos.app` address is a temporary bridge, not the long-term login name.
5. Add `community_memberships` for the mapped roles. Do not insert a second profile.

Match on phone and on email before any insert. A unique index on `residents.auth_user_id` (where not null) should exist before the backfill. Confirm whether it already exists; this pass did not add one.

### Invitation

Committee invites by phone or email.

- Known resident with `auth_user_id`: add membership and occupancy. Send the invite to the existing email or phone. Do not call `createUser`.
- Known phone, no Auth user: create one user, set `auth_user_id`, then add membership.
- Unknown email: create one user and one resident or profile, then occupancy. SABHA's `add_occupancy` already rejects an unknown email; keep that rule for the ledger side.
- Tenant invite uses occupancy type `tenant` and the same user.

### Recovery

- Email users: Supabase password recovery to the real email. Redirect URL must be the SABHA origin (`sabhaapp.in` once DNS exists, the Pages preview until then). Add that origin in the Supabase Auth redirect allow-list before turning recovery on.
- Phone users, until SMS OTP exists: committee-only reset. The function checks `is_committee()`, writes a random PIN **hash**, and does not return the PIN. The committee tells the resident out of band. The resident must replace it on next login (`pin_changed`).
- Lost phone and lost email: super admin recovery with an audit row. No self-service path that takes only a flat number.

### Session persistence and logout

- Authority is the Supabase Auth session (`sb-wzchqxwwezklxsxmjvyt-auth-token`), for both shells.
- `localStorage.societyos_auth` may cache the resident id, name, flat and role for the legacy shell. It must not store the phone or the PIN. `SocietyOS.jsx` already strips those on save. It must not be accepted as proof of login if `supabase.auth.getSession()` is empty.
- Logout in both shells calls `supabase.auth.signOut()` and removes `societyos_auth`.
- The legacy client must keep using the browser `fetch` without an artificial abort. The earlier 30-second abort is what made the preview look logged out on a slow phone.

### PIN in the final design

The browser never sends a derived Auth password. The edge function:

1. Rate-limits by phone.
2. Loads the resident by phone with the service role.
3. Compares the submitted PIN to the **hash**.
4. On success, creates a session for the already linked Auth user with a one-time server-side link (`generateLink` / verify), not with `password: "sos_" + id`.
5. Returns the session and the role payload. Does not return the PIN hash.

Phone login stays on the legacy route until this function has been tested with a copy of the resident list (hash the existing PINs in a transaction, verify one resident, keep the plaintext column as fallback behind a flag, then remove the fallback). A failed test rolls back by still accepting the plaintext column. Residents are not asked to register again.

### New residents

Secretary creates the resident and unit, or the resident accepts an invite. First login sets a PIN (hashed) or a password, not both stored as the Auth password. Committee role is a separate grant, not a second signup.

## 5. Role mapping

Not implemented. Existing permissions stay. The only deliberate correction is the complaint privacy change in section 2, and it waits for a product decision.

### Titles and grants

| SocietyOS | How it is decided today | SABHA grant | Notes |
|---|---|---|---|
| `super_admin` | `residents.is_super_admin` | `platform_admin` | UI is desktop-first. Can open every legacy module. |
| `president` | `committee_members.role = President` | `committee_admin` | Keep the title President on the committee record. |
| `secretary` | `committee_members.role = Secretary` | `committee_admin` | Legacy **navigation** hides Finances. Legacy **RLS** allows every committee member, including the secretary, to manage expenses, complaints and meetings. Do not remove that database right in this phase. A later UI may keep finances off the secretary home without pretending RLS is that strict. |
| `treasurer` | `committee_members.role = Treasurer` | `treasurer` and `committee_admin` | Legacy UI starts on Finances. SABHA treasurer is a finance role and is not automatically `committee_admin`. Mapping a current treasurer to **both** preserves "committee member who can also pay" until the product owner says treasurers should lose unit and meeting admin. |
| `committee` | Any other `committee_members.role` | `committee_admin` | Legacy UI: dashboard, complaints, notices, meetings, polls. No finances tab. RLS still allows finances. |
| `resident` | Default | `resident` | Legacy shell shows `ResidentPortal`, not the committee tabs. |
| `tenant` | `residents.type = tenant` | `resident` plus occupancy `tenant` | Same portal as a resident in the legacy shell (`ROLE_NAV` is empty for both). SABHA has no tenant role. Do not invent one that locks tenants out of concerns or meetings. |
| Resident auditor | Not in SocietyOS | `resident_auditor` | View and review finance. Cannot be granted by `grant_role`. Cannot edit amounts. |
| (none) | — | `platform_admin` on SABHA only | An email admin with no resident row stays platform admin. Do not also mark a random resident `is_super_admin`. |

### Frontend navigation versus database enforcement

| Area | Legacy UI | Legacy RLS | SABHA UI (`canSee`) | SABHA RLS |
|---|---|---|---|---|
| Expenses | Treasurer, president, super admin | Any committee member (`committee_manage_expenses`) | Treasurer, committee admin, auditor, platform admin | Financial roles see all; residents see approved only |
| Meetings | Committee roles and super admin | Residents may select and update RSVP; committee manages | Every member (`decisions`) | Members of the community |
| Notifications | `useNotifications` by resident id | Own row, or committee in the society | Every member, filtered by `recipient_id = auth.uid()` | Same as the filter |
| Complaints | Committee tabs; residents use the portal | Any resident in the society may select all | Concerns module, separate `tickets` table | Private tickets are a SABHA rule, not the legacy policy |
| Bank accounts | No current screen | Committee on `legacy_bank_accounts` | Treasurer, committee admin, auditor, platform admin | `private.has_role` for those roles |
| Auditor review | Absent | Absent | Auditor, treasurer, committee, platform admin | Auditor cannot change the amount |
| Super admin | Full legacy nav | `is_super_admin` counts as committee | Settings and units for `platform_admin` / `committee_admin` | `platform_admin` inside `private.has_role` |

Authoritative model after consolidation:

- **Database:** `community_memberships.role` plus the SABHA policies and security-definer functions, for every new ledger, ticket, meeting, document and notification.
- **Legacy tables:** keep `is_committee()`, `get_my_society_id()` and `get_resident_id()` until those screens have moved. Do not point legacy policies at `private.has_role` in the same change as the query fix.
- **Titles:** `committee_members.role` is the label (President, Secretary, Treasurer). It is not a second permission system.
- **UI:** navigation may hide a module. It must not be the only check. The secretary/finances mismatch stays documented until the product owner either shows finances to every committee member or tightens `committee_manage_expenses` to treasurer and president only. Tightening it would remove a right the database grants today, so it is a decision, not a drive-by fix.

Role resolution order for a signed-in user:

1. Load `community_memberships` for `auth.uid()`.
2. If the user has a `residents.auth_user_id` match, load `committee_members` and `is_super_admin` for the legacy shell only.
3. Do not let the legacy label override a SABHA finance policy. A president without `treasurer` or `committee_admin` does not get ledger writes.
4. `resident_auditor` comes only from certification.

## 6. Consolidated routing plan

Not implemented. `/` stays SABHA (`src/platform/Platform.jsx`). `/legacy/*` stays SocietyOS (`src/SocietyOS.jsx` via `src/main.jsx`). No module is removed or hidden because it has not been redesigned.

Target information architecture, still one Vite app:

| Destination | Who | Where it lives today | Future route |
|---|---|---|---|
| Home | All | SABHA `home`; legacy `dashboard` and resident portal | `/` |
| Finance, collections, ledger, reconciliation, statements | Treasurer, committee finance, auditor, resident read-only for published figures | SABHA finance pages; legacy `Finances.jsx` for invoices and `legacy_expenses` | `/finance` with those sections inside, not a second app |
| Concerns | All | Legacy `Complaints.jsx`; SABHA concerns | `/concerns` |
| Meetings and decisions | All members read; committee writes | Legacy `Meetings.jsx` (`legacy_meetings`); SABHA decisions (`meetings`, `resolutions`) | `/meetings` |
| More | Role-specific | SABHA overflow items; legacy nav entries that do not fit the four primaries | `/more` |
| Residents and units | Committee, super admin | `Residents.jsx`, SABHA units | `/more/residents` |
| Documents | Members, with private files limited | SABHA documents (buckets missing) | `/more/documents` |
| Notifications | Each user | Legacy `legacy_notifications`; SABHA `notifications` | `/more/notifications` |
| Gate, deliveries, blacklist, incidents | Operations roles | `Gate.jsx` | `/more/gate` |
| Maintenance, assets, AMC | Committee | `Maintenance.jsx` | `/more/maintenance` |
| Staff | Committee | Staff module in `src/lib/supabase.js`, maintenance screens | `/more/staff` |
| Vendors | Committee | `Maintenance` vendor calls | `/more/vendors` |
| Amenities | Residents book; committee administers | `Amenities.jsx` | `/more/amenities` |
| Volunteers | Residents | `Volunteers.jsx` | `/more/volunteers` |
| Notices and polls | Committee writes; residents read and vote | `Notices.jsx`, `Polls.jsx` | `/more/notices`, `/more/polls` until they fold into meetings or home |
| Super admin | Platform admin | `SuperAdmin.jsx` | `/admin`, desktop layout, not in the five-item resident bar |

Duplicate pairs stay visible until each has one backing table:

- Legacy expenses and SABHA expenses stay separate modules in the UI, labelled "Maintenance expenses (historical)" and "Ledger expenses", so the three historical rows are not mixed into an empty journal.
- Legacy meetings and SABHA meetings stay separate until minutes and resolutions are migrated with a written mapping (`date` → `held_on`, `minutes_final` → `minutes`). There are zero legacy meeting rows today, so this is a schema hazard more than a data move.
- Complaints and tickets stay separate until privacy rules are decided.
- Residents and memberships stay separate until account linking in section 4 has run.
- The two notification tables stay separate. Columns do not match (`read` versus `read_at`, `resident_id` versus `recipient_id`).

`/legacy` remains as an alias until every SocietyOS screen has a route under the shell above. Removing the alias is a later phase.

## 7. Mobile-first design architecture

Phase 1 applied the tagline "Clarity in Community." and the navy, cyan, and blue chrome. See `docs/PHASE_1_ASSESSMENT.md`. The eight-figure emblem is still not in the repository. Do not revert to forest green or terracotta.

### Tokens to introduce

| Token | Value | Use |
|---|---|---|
| `navy` | `#031D27` | App background, super-admin sidebar |
| `cyan` | `#00D4E8` | Primary action, focus ring, current nav item |
| `blue` | `#0878E8` | Links, secondary emphasis, chart series |
| `white` | `#FFFFFF` | Text on navy, form surfaces |
| Tagline | Clarity in Community | `brand.tagline` |

The approved mark is the circular emblem with eight blue/cyan figures and a white S (`src/brand/Mark.jsx` is the current mark and will be replaced, not stretched). Type stays Inter for UI and Manrope for short titles. Gradients only in the mark. No stock illustrations, no oversized hero cards, no motion that delays a tap.

### Layout

Breakpoints already used by the product: 320, 360, 390, 430, 768, 1024, 1440.

- Below 1024px, resident, tenant, treasurer, committee and auditor use a bottom bar: **Home, Finance, Concerns, Meetings, More**. Minimum target height 48px. The current SABHA bar is close to this (`PRIMARY` plus More in `Platform.jsx`) but it is styled in terracotta and the Finance item does not yet include the legacy invoice ledger.
- More opens a sheet, not a new sitemap. Role actions live in the sheet: treasurer sees collections, reconciliation and approvals; auditor sees reviews; committee sees residents, notices and gate; tenant and resident see notices, amenities, visitors they pre-approve, and profile.
- Tables become stacked rows under 768px. The legacy finances screen is a wide HTML table with inline styles and a 10px uppercase label. That is the first screen to rebuild onto the tokens, after the query fix is in production.
- Forms use one column, 16px inputs (prevents iOS zoom), and a sticky primary button.
- Super admin at 1024px and above uses a left navigation (`/admin`): societies, users, configuration. At 768px and below, super admin still works, as a single column, but it is not the layout we optimise.
- Loading and error states use the existing `QueryStatus` pattern (message plus retry). Empty states say what is missing in one sentence.

### Component migration order

1. Token file and `brand.tagline`, without restyling every legacy inline screen.
2. SABHA shell (background, bar, type, buttons) onto the tokens. Keep the five destinations.
3. Resident home, then finance (published figures first), concerns, meetings.
4. Legacy screens one module at a time, starting with Finances and Meetings, keeping their data calls.
5. Super admin layout last.

Do not restyle by editing dozens of inline style objects in the same change as a data migration.

## 8. Proposed code changes

### On this branch

- `src/lib/legacyTables.js` — table names and hosted column lists.
- `src/lib/supabase.js` — legacy expense, meeting and notification helpers.
- `src/components/Finances.jsx`, `src/components/Meetings.jsx` — same tables.
- `supabase/functions/whatsapp-bot/index.ts` — legacy expenses. Not deployed.
- `src/lib/legacyQueries.test.js`, `src/components/legacyScreens.test.jsx` — regression tests.
- `src/platform/Platform.jsx`, `src/platform/expired-session.test.jsx` — demo accounts hidden unless `VITE_ENABLE_DEMO_LOGIN=true`.
- `docs/PHASE_0_SAFETY_AND_RECOVERY.md` — this plan.
- Short corrections in `docs/ENVIRONMENT_SETUP.md`, `docs/DEPLOYMENT.md` and `docs/IMPLEMENTATION_STATUS.md` so the next reader does not replay the foundation migration or copy the demo password into another document.

### Explicitly not in this branch

- Any edit to `auth-login`, PIN hashing, Auth users, or redirect URLs.
- Any migration, policy, bucket, or function deploy.
- Replaying `20261118120000_platform_foundation.sql`, including the write RPCs that are still missing (`create_expense`, `record_collection`, and the rest of that file's writers).
- Route merge, brand tokens, or a visual redesign.
- Deleting or disabling hosted demo users.
- Tightening complaint RLS.
- Linking `residents.auth_user_id` to SABHA memberships.

### Recommended next changes, each behind its own review

1. Preview this branch. Confirm three legacy expenses load for a committee user and SABHA finance still addresses `expenses`.
2. Auth revision: authenticate `set_pin`, disable public `reset_pin`, stop returning PINs, stop writing `sos_` + resident id. Keep phone login working in the same revision.
3. Hash existing PINs without removing the column. Test one resident. Then switch comparison to the hash.
4. Gate or remove hosted demo users after checking they are not real residents.
5. Install missing SABHA write RPCs as a **diff** against the live database, on a branch database or a reviewed migration, never by replaying the full foundation file.
6. Create the two storage buckets with policies.
7. Apply navy, cyan, blue and white to the SABHA shell.
8. Account linking, one resident at a time, after password overwrite is gone.

## 9. Blockers and product decisions

1. **Secretary and finances.** Navigation hides finances from the secretary. RLS allows them. Should the database match the menu, or should the menu match the database?
2. **Treasurer mapping.** Should today's treasurer receive both `treasurer` and `committee_admin`, or only `treasurer`?
3. **Complaint privacy.** Residents can read every complaint in the society. Should that remain until concerns replace complaints, or should private complaints be locked now?
4. **Demo users.** May the five `@demo.sabha.app` Auth users be disabled on the hosted project? Confirm none of them share `residents.auth_user_id` with a real resident before anyone deletes them.
5. **PIN versus SMS.** Is committee-assisted PIN reset acceptable until SMS OTP exists, or is SMS a launch requirement for `sabhaapp.in`?
6. **Synthetic email.** May existing `phone@societyos.app` users keep that address as the Auth email after linking, or must each resident supply a real email before email recovery works?
7. **Empty legacy meetings.** There are no historical meeting rows. Is it acceptable to keep the legacy meetings screen on `legacy_meetings` and build new minutes only in SABHA, or must both screens show one list?
8. **Domain.** `sabhaapp.in` is not wired in this repository. Who sets DNS, the Pages custom domain, and the Supabase redirect allow-list?
9. **Missing write RPCs.** SABHA expense, collection and meeting **writes** still depend on functions that are not installed. Read paths and the legacy query fix do not install them. Which writes are in the first pilot?
10. **AI proxy.** Should `ai-proxy` be disabled until it checks a user JWT? Minutes generation in `Meetings.jsx` calls a browser endpoint today.

## Evidence

- Column lists, foreign keys, policies and row counts: read-only SQL on `wzchqxwwezklxsxmjvyt` during this pass (`information_schema.columns`, `pg_constraint`, `pg_policies`, `count(*)`). No `INSERT`, `UPDATE`, `DELETE`, `ALTER` or migration was sent.
- `storage.buckets` count was 0.
- Function bodies for `auth-login` and `ai-proxy` are in the repository. Hosted `verify_jwt` for those functions is UNKNOWN from this environment.
- `n_live_tup` was not used. Earlier estimates from that statistic were wrong; counts above are `count(*)`.

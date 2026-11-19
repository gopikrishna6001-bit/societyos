# SABHA authentication security assessment

Inspection date: 19 November 2026. Hosted project `wzchqxwwezklxsxmjvyt`, region ap-southeast-1. This was a read of policies, grants, function source, client queries, and the last 24 hours of logs. No hosted row was updated, deleted, or inserted.

Receiving an unsolicited OTP does not show that this database was read. This application has no SMS OTP integration. The findings below separate what was confirmed, what is a plausible path, and what is unknown.

## Conclusion

There is a confirmed design vulnerability in the phone and PIN login function, and a confirmed way for one linked super-admin session to read plaintext PINs. There is no evidence in the inspected logs or responses that resident phone numbers were returned to an anonymous caller, and there is no evidence that proves a breach.

The hosted `auth-login` function is still the previously deployed copy until that function is deployed on purpose. Changing this repository does not disable the live endpoint.

## Confirmed

### 1. Phone and PIN login is an unauthenticated account-management API — critical

The repository copy inspected at the start of this work, `supabase/functions/auth-login/index.ts`, did all of the following with the service-role client and without checking `Authorization`:

- `lookup` searched `residents` by phone and returned the resident id, name, flat, block, type, and whether the PIN had changed. It did not return the phone or the PIN. A different response for a known number and an unknown number lets a caller test whether a number is registered.
- `login` compared `residents.pin` to the request with a plaintext inequality, then created or signed in a synthetic Auth user and set that user's password from the resident id on every login.
- `set_pin` wrote a new PIN for any resident id the caller supplied.
- `reset_pin` set a PIN from the flat number and returned that PIN in the JSON body.
- The function had no rate limit. CORS allowed any origin.

The anon key is a client environment variable, so the function URL is knowable from the app. The repository has no `config.toml`. This inspection did not read the hosted `verify_jwt` switch. If that switch is off, the actions above are callable without a user session. If it is on, the gateway would reject calls that do not send a user JWT, which this client did not have before login.

This revision replaces that handler with an immediate HTTP 410. It does not read the body and does not open a database client. That disablement is not live until the function is deployed.

### 2. PINs are plaintext and readable by a privileged session — high

`public.residents` has `pin`, `pin_hash`, and `portal_pin`. On 19 November 2026:

- 10 resident rows, all with `pin` and `phone` populated
- 1 row with `pin_hash` populated
- 0 rows with `portal_pin` populated
- 0 rows with `id_number` populated
- 1 row with `auth_user_id`
- 1 row with `is_super_admin`, and that same row has `auth_user_id`
- 0 rows in `committee_members`

RLS is enabled on `residents` and is not forced. `anon` and `authenticated` have `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, and `TRIGGER` on the table. Column privileges are not narrowed, so `SELECT` includes `pin`.

The `read_own_resident` policy allows a row when `auth_user_id = auth.uid()` or when `is_committee()` is true and the society matches. `is_committee()` is security definer and is true when the caller’s resident row has `is_super_admin` or an active committee membership. The linked super-admin session therefore satisfies the policy for every resident in that society, and a `select *` returns `pin`.

`NULL = NULL` is not true, so an anonymous request does not match `auth_user_id = auth.uid()`. This inspection did not observe an anonymous query returning resident rows. Anonymous table grants are still too broad and should be revoked.

Client queries that used `select *` on `residents` would receive `pin` for whatever rows the policy allows. Those queries are narrowed in this revision. The column revoke is in `supabase/migrations/20261119120000_invitations.sql` and has not been applied to the hosted database.

### 3. Family members and flats are not anonymously readable under the current policies — medium grants, low demonstrated exposure

`family_members` has no phone column. Its policy is `resident_id = get_resident_id() OR is_committee()`. `flats` are readable when `society_id = get_my_society_id()`. Both tables have RLS enabled, not forced, and the same broad `anon` grants as `residents`. For an anonymous session, `auth.uid()` is null, `get_resident_id()` does not match a row, and `is_committee()` is false. That blocks anonymous reads. It does not stop the table owner, and PostgREST does not connect as the table owner.

`profiles` and `units` use the SABHA membership policies. A profile phone is visible to the profile owner and to committee, treasurer, auditor, and platform-admin members of the same community.

### 4. Anonymous execute is granted on older public functions — medium

Hosted `anon` can execute public functions including `account_balances`, `bank_balances`, `resident_dashboard`, `is_committee`, `is_super_admin`, `has_role`, `get_my_flat`, `get_my_society_id`, `get_resident_id`, `trigger_send_whatsapp`, `generate_invoice_number`, and `generate_ticket_number`.

The SABHA copies of `account_balances` and `resident_dashboard` raise `not authorized` unless `private.is_member` is true. The hosted bodies of the older helper functions were not all compared with the repository in this pass. `trigger_send_whatsapp` is not called by the client. The new migration revokes anonymous execute on the messaging and number-generator functions, and revokes anonymous execute on the policy helpers while leaving them available to signed-in users. That migration has not been applied.

### 5. No SMS OTP provider is present — confirmed absence

Repository search found no Twilio, MSG91, or other SMS OTP client. The login screen stated that it does not send an OTP. `supabase/functions/whatsapp-bot` calls the Meta WhatsApp Cloud API with the service role and reads resident phones for messages. That is not an OTP login. The bot source contained a hardcoded webhook-verify fallback. This revision removes the fallback so a missing environment variable fails closed. The hosted bot keeps the old source until it is deployed.

### 6. The last 24 hours of logs do not show `auth-login` traffic — confirmed for that window only

From 18 November 2026 10:35 UTC to 19 November 2026 10:35 UTC:

- `edge_logs`: 480 events
- events whose path contained `auth-login`: 0
- events whose path contained `functions`: 0
- `function_edge_logs`: 2 events for function id `ca0d847e-11a2-472b-a17e-55f062d90f37`, with an empty status

Request bodies were not read. The log API used here rejects a window longer than 24 hours, and an earlier day was not queried.

### 7. Auth and financial rows that a cleanup would touch — confirmed counts

| Object | Count on 19 Nov 2026 |
| --- | --- |
| `societies` | 1 |
| `residents` | 10 |
| `auth.users` | 10 (2 on the synthetic phone-login domain, 5 on the demo domain) |
| `community_memberships` | 5 |
| invoices with `resident_id` | 10 |
| payments with `resident_id` | 2 |
| `complaints` | 4, none with `raised_by` set |
| `family_members` | 2 |
| `visitors` | 1 |
| `legacy_expenses` | 3, no foreign key to `residents` |

Foreign keys pointing at `residents` are listed in `supabase/scripts/cleanup-test-residents.sql`. That script rolls back unless a reviewer sets `cleanup.confirm=approved`. It was not run.

## Plausible attack paths

These are consequences of the confirmed design. They are not proof that someone used them.

- If the hosted function does not require a JWT, a caller can test phone numbers through `lookup`, try four-digit PINs through `login`, and then hold a session whose password was overwritten from the resident id. `reset_pin` makes the new PIN predictable from the flat number and returns it.
- The linked super-admin session can request `pin` for every resident in the society, including with a modified client, until the column privilege is revoked.
- A committee membership added later gets the same resident read, including `pin` and `phone`. Committee screens already request `phone` for WhatsApp and finance workflows. The residents list masks the phone in the interface. The value is still in the response.

## Unknown

- The hosted `verify_jwt` value for `auth-login`, `invite-member`, `whatsapp-bot`, and `ai-proxy`.
- Whether the deployed function body still matches the vulnerable source. It was not downloaded from the hosted function API in this pass.
- Any `auth-login` call, lookup, or PIN guess before 18 November 2026 10:35 UTC.
- Whether a function log stored a request body. Bodies were not opened.
- Whether any phone number from this database was shown to an external person. Nothing inspected here shows that.
- Why an unsolicited OTP arrived. This codebase cannot send one.

## What this revision changes

- `auth-login` in the repository returns 410 and does not touch the database. The hosted function is unchanged until an approved deploy.
- Legacy and SABHA sign-in use Supabase email and password. There is no public `signUp`.
- Password recovery uses `resetPasswordForEmail` and always shows the same notice.
- Invitations are created by a committee admin or platform admin, stored as a SHA-256 hash, expire after 7 days, and are single-use. `accept_invitation` checks the signed-in email. Creation is limited to 10 invitations per admin per hour. Acceptance failures are limited to 8 per user per 15 minutes. Events record a type and an actor id, not a token, password, or email.
- `invite-member` sends the Supabase invite email. It is not deployed. Until it is deployed and the redirect URL is allow-listed, the invitation screen cannot deliver email.
- Resident reads no longer ask for `pin`, `pin_hash`, `portal_pin`, or identity-document columns. The hosted column revoke is in the unapplied migration.
- The cleanup script is prepared and not executed. It keeps the society, community configuration, and `legacy_expenses`.

## Fixes that still need approval

1. Deploy the disabled `auth-login` function, then confirm a call returns 410.
2. Apply `supabase/migrations/20261119120000_invitations.sql` to the hosted project. Do not replay `supabase/schema.sql` or `20261118120000_platform_foundation.sql`.
3. Deploy `invite-member`. Set `SITE_URL`. Add `/join` and `/reset` to the Auth redirect allow-list. Turn on leaked-password protection and the Auth CAPTCHA provider in the dashboard. No site key is in this repository, so the sign-in form uses a honeypot rather than a fake CAPTCHA.
4. Confirm Auth rate limits for sign-in and recovery in the dashboard. This client cannot see that setting.
5. After review, run `supabase/scripts/cleanup-test-residents.sql` with `cleanup.confirm=approved` if those 10 residents and their invoices and payments are still the test set. The script’s last statement is `ROLLBACK` until the reviewer changes it.
6. Rotate the WhatsApp webhook verify value if the old hardcoded fallback was ever used in a deployed environment.
7. Remove the demo Auth users as part of the cleanup. Do not print their password into a log or a screen.

## Acceptance mapping

| Check | Result in this revision |
| --- | --- |
| Anonymous users cannot enumerate residents or phones | True for current RLS. Grants remain too wide until the migration is applied. `auth-login` lookup is removed in source and still needs a hosted deploy. |
| Anonymous users cannot call account-management functions | `create_invitation` and `accept_invitation` revoke `anon`. The old function returns 410 in source only. |
| A resident cannot read another society | SABHA policies use `private.is_member` / `private.has_role`. The new SQL test covers invitation membership. Legacy tables still key off `get_my_society_id()`. |
| A resident cannot grant a role | No insert policy on `community_memberships`. `accept_invitation` writes only the invited role. SQL test covers a direct insert and a committee admin inviting a platform admin. |
| Invitation expiry and single use | SQL test. Not applied on the hosted database. |
| Password recovery | Client flow is implemented. Delivery depends on hosted Auth email and the redirect allow-list. |
| Phone and PIN endpoints disabled | Source only, until deploy. |
| No PINs in client queries or new public fields | Client selects exclude them. Hosted `residents.pin` still exists and is still readable by the super-admin policy until the migration and cleanup. |
| Sign-in, sign-out, session | Email session through Supabase Auth. Legacy shell no longer trusts `societyos_auth`. |
| Tests | `npm test`: 11 files, 26 tests, passed. `npm run build`: passed. `scripts/test-db.sh`: passed on a throwaway local database, including invitation expiry, reuse, rate limit, role denial, and anonymous execute denial. The hosted project was not migrated. |

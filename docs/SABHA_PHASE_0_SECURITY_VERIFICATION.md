# SABHA Phase 0 — security verification

Date: 20 November 2026 (Asia/Calcutta). Branch: `cursor/phase-0-security-remediation-fe89`. PR #9.

**Hosted project inspected (read-only):** `wzchqxwwezklxsxmjvyt` (Society OS, ap-southeast-1, ACTIVE_HEALTHY).

**This phase does not deploy.** CI green is not completion. Phase 0 completes only after approved function deploys + migration apply + independent hosted re-probe. **Do not request deployment approval until the checks in this document are marked complete** (WhatsApp hardening + SQL inventory + disposable DB evidence below are complete in-repo; hosted apply remains human-gated).

---

## Hosted baseline (before deploy)

| Object | Observed 20 Nov 2026 |
| --- | --- |
| Edge `auth-login` | ACTIVE, `verify_jwt=false`. Unauthenticated POST with anon key returned **HTTP 401** body `Phone number not registered…` — **legacy PIN lookup still live** (repo 410 not deployed). |
| Edge `ai-proxy` | ACTIVE, `verify_jwt=false`. Unauthenticated POST returned **HTTP 200** (Gemini model error text) — **open proxy**. |
| Edge `send-whatsapp` | ACTIVE, `verify_jwt=false`. Unauthenticated POST returned **HTTP 200** `no pending` — **open dispatcher with service role**. Hosted body still selects all `status=pending` rows (no society scope). |
| Edge `whatsapp-bot` | ACTIVE, `verify_jwt=false` (webhook). |
| Edge `invite-member` | Not listed on host (repo-only). |
| RPC `anon` EXECUTE | `true` for all listed Phase 0 functions (see privilege matrix). |
| `residents` secret columns | `anon`/`authenticated` still have SELECT on `pin`, `pin_hash`, `portal_pin`, `id_number`. |
| Hosted `trigger_send_whatsapp` | SECURITY DEFINER trigger posts to Edge with `Authorization: Bearer` + `current_setting('app.service_role_key')` and empty body `{}` — **cross-tenant + bypasses any future dispatch secret**. |

Probes used the project anon key and did **not** modify rows. Source-level migrations were **not** assumed equal to hosted grants.

---

## 1. WhatsApp dispatcher hardening (repo)

| Requirement | Implementation |
| --- | --- |
| Society / tenant scoping | `POST` body **requires** `society_id` (UUID). Claim RPC filters `WHERE society_id = p_society_id`. Edge rejects rows whose `society_id` ≠ request. |
| Atomic claim / no duplicate dispatch | Migration `20261120170000_whatsapp_dispatch_hardening.sql`: `claim_whatsapp_batch` uses `FOR UPDATE SKIP LOCKED`, sets `status='sending'`, `claim_token`, increments `attempt_count`. |
| Idempotent retries | `finalize_whatsapp_dispatch` updates only when `claim_token` + `society_id` + `status='sending'` match. Failures with `attempt_count < 5` return to `pending`; at 5 → `failed`. |
| Max batch + rate limit | Cap **25** messages/request; **200 ms** spacing between Graph API calls. |
| Unsuccessful API responses | Non-2xx or missing `messages[0].id` → finalize failure with redacted `last_error`. |
| No credential logging | Errors strip `Bearer`/`token`/`secret`/`apikey`/`password` patterns; function never logs `WA_*` or service role. |
| No browser invoke | Rejects `OPTIONS`, rejects `Origin` / non-`none` `Sec-Fetch-Site`, **no** `Access-Control-Allow-Origin`. Clients queue via `whatsapp_log` only (`WhatsAppCentre.jsx`). |
| Authorised dispatch | `Authorization: Bearer <WA_DISPATCH_SECRET>` with timing-safe compare; secret must be ≥32 chars. Service role used **only after** secret check, server-side. |
| DB trigger | Replaced with **queue-only** no-op (stops hosted HTTP + service-role Bearer). |

### WA_DISPATCH_SECRET — generate, store, rotate

1. **Generate** (operator machine, not in chat/repo): `openssl rand -base64 48`
2. **Store** only in Supabase Edge Function secrets for `send-whatsapp` (Dashboard → Edge Functions → Secrets). Also store in the cron/operator secret store that will call the function. **Never** in `VITE_*`, frontend, git, CI logs, or markdown.
3. **Invoke** (server-side only):
   ```bash
   curl -X POST "$SUPABASE_URL/functions/v1/send-whatsapp" \
     -H "Authorization: Bearer $WA_DISPATCH_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"society_id":"<uuid>","limit":20}'
   ```
4. **Rotate**: generate new secret → update Edge secret + cron env → confirm 401 with old secret → discard old. If compromise suspected, rotate immediately and re-queue only `pending`/`failed` rows after review.
5. **verify_jwt**: keep `false` for this function (dispatch secret is not a user JWT). Dashboard must **not** enable anonymous public invoke beyond the secret gate.

---

## 2. Function dependency inventory

Hosted signatures verified via read-only SQL on `wzchqxwwezklxsxmjvyt` (20 Nov 2026). Call sites searched across the full repository.

| Function (hosted) | security_definer | Callers | Client credential | RLS depends? | After phase0 grants | Server replacement? |
| --- | --- | --- | --- | --- | --- | --- |
| `public.trigger_send_whatsapp()` | true | DB trigger on WhatsApp insert (hosted); **not** called from JS | N/A (trigger) | No (trigger fn) | REVOKE anon+authenticated EXECUTE | **Yes** — migration replaces body with no-op; cron + `send-whatsapp` + secret |
| `public.generate_invoice_number()` | false | Invoice BEFORE INSERT trigger only | N/A | No | REVOKE anon+authenticated | None — trigger still fires as owner |
| `public.generate_ticket_number()` | false | Ticket BEFORE INSERT trigger only | N/A | No | REVOKE anon+authenticated | None |
| `public.is_committee()` | true | **Dozens** of legacy RLS policies (`committee_*`, bookings, notices, …) | Policies evaluate under table owner / invoker with authenticated JWT | **Yes — critical** | REVOKE anon; **GRANT authenticated** | Keep — do not revoke authenticated |
| `public.is_super_admin()` | true | RLS on `blocks`, `flats`, `roles`, `societies` | authenticated | **Yes** | REVOKE anon; GRANT authenticated | Keep |
| `public.has_role(text)` | true | Legacy helpers / some policies (distinct from `private.has_role(uuid,text[])`) | authenticated | Yes where referenced | REVOKE anon; GRANT authenticated | Keep public; SABHA uses `private.has_role` |
| `public.get_my_flat()` | true | RLS (`complaints` insert, `visitors`, `deliveries`, `invoices`) | authenticated | **Yes** | REVOKE anon; GRANT authenticated | Keep |
| `public.get_my_society_id()` | true | Most legacy society-scoped policies | authenticated | **Yes** | REVOKE anon; GRANT authenticated | Keep |
| `public.get_resident_id()` | true | RLS (`payments`, `vehicles`, `pets`, bookings, …) | authenticated | **Yes** | REVOKE anon; GRANT authenticated | Keep |
| `public.account_balances(uuid)` | true | `src/platform/screens.jsx` via `rpc()`; `resident_dashboard` SQL; ledger tests | **authenticated** (platform session) | Internal authz via `private.is_member` | REVOKE anon; GRANT authenticated | Keep |
| `public.resident_dashboard(uuid)` | true | `src/platform/screens.jsx` | authenticated | Membership check inside | REVOKE anon; GRANT authenticated | Keep |
| `public.bank_balances(uuid)` | true | Called from `account_balances` / dashboard SQL; docs/API | authenticated | Membership / role checks | REVOKE anon; GRANT authenticated | Keep |
| `private.has_role(uuid,text[])` | true | Foundation policies + RPCs (not in phase0 revoke list) | authenticated (limited GRANT) | **Yes (SABHA)** | Unchanged by phase0 | Keep |
| `public.claim_whatsapp_batch(...)` | true | Edge `send-whatsapp` only (new) | service_role | No client | REVOKE anon+authenticated; GRANT service_role | New |
| `public.finalize_whatsapp_dispatch(...)` | true | Edge `send-whatsapp` only (new) | service_role | No client | REVOKE anon+authenticated; GRANT service_role | New |

**JS note:** `whatsapp-bot` / `residentAccess.js` read `is_super_admin` as a **column**, not the RPC. `src/platform/api.js` wraps `supabase.rpc` for SABHA screens.

**Grant preservation conclusion:** Revoking anon EXECUTE on policy helpers does **not** break authenticated RLS (policies run with the signed-in role that still has EXECUTE). Revoking EXECUTE on trigger functions from clients does **not** stop triggers. Dashboard RPCs remain available to authenticated platform users. **No server-side replacement required** for the twelve named helpers except `trigger_send_whatsapp` (queue-only + cron).

---

## 3. Before / after privilege matrix

### Hosted before (live, read-only)

| Object | anon | authenticated |
| --- | --- | --- |
| `account_balances(uuid)` EXECUTE | true | true |
| `bank_balances(uuid)` EXECUTE | true | true |
| `resident_dashboard(uuid)` EXECUTE | true | true |
| `is_committee()` EXECUTE | true | true |
| `is_super_admin()` EXECUTE | true | true |
| `has_role(text)` EXECUTE | true | true |
| `get_my_flat()` EXECUTE | true | true |
| `get_my_society_id()` EXECUTE | true | true |
| `get_resident_id()` EXECUTE | true | true |
| `trigger_send_whatsapp()` EXECUTE | true | true |
| `generate_invoice_number()` EXECUTE | true | true |
| `generate_ticket_number()` EXECUTE | true | true |
| `residents.pin` SELECT | true | true |

### Disposable DB after migrations (evidence)

Script: `scripts/test-phase0-security.sh` → DB `societyos_phase0_test`.

Representative of hosted: foundation + invitations + **legacy stubs with hosted-like anon grants**, then `20261120163000_phase0_security.sql` + `20261120170000_whatsapp_dispatch_hardening.sql`.

| Object | anon | authenticated | security_definer |
| --- | --- | --- | --- |
| `account_balances` | false | true | true |
| `bank_balances` | false | true | true |
| `resident_dashboard` | false | true | true |
| `is_committee` | false | true | true |
| `is_super_admin` | false | true | true |
| `has_role` | false | true | true |
| `get_my_flat` | false | true | true |
| `get_my_society_id` | false | true | true |
| `get_resident_id` | false | true | true |
| `trigger_send_whatsapp` | false | false | true |
| `generate_invoice_number` | false | false | false |
| `generate_ticket_number` | false | false | false |
| `claim_whatsapp_batch` | false | false | true |
| `finalize_whatsapp_dispatch` | false | false | true |
| `residents.pin` SELECT | false | false | — |

**Authenticated workflow smoke:** under `SET ROLE authenticated` with JWT sub set, `create_community` + `account_balances` + `resident_dashboard` + `is_committee` + `get_my_society_id` succeeded. Atomic claim/finalize smoke passed (no duplicate claim).

**Read-only SQL for hosted re-check after apply:**

```sql
SELECT n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' AS sig,
       p.prosecdef,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('public')
  AND p.proname IN (
    'trigger_send_whatsapp','generate_invoice_number','generate_ticket_number',
    'is_committee','is_super_admin','has_role','get_my_flat','get_my_society_id','get_resident_id',
    'account_balances','resident_dashboard','bank_balances',
    'claim_whatsapp_batch','finalize_whatsapp_dispatch'
  )
ORDER BY 1;

SELECT column_name, grantee, privilege_type
FROM information_schema.column_privileges
WHERE table_schema='public' AND table_name='residents'
  AND column_name IN ('pin','pin_hash','portal_pin','id_number')
  AND grantee IN ('anon','authenticated','public');

SELECT polname, pg_get_expr(polqual, polrelid)
FROM pg_policy
WHERE polrelid = 'public.whatsapp_log'::regclass;
```

---

## Issue register (summary)

### 1–6 (prior Phase 0 items)

Unchanged intent: `auth-login` → 410; PIN column revoke; `ai-proxy` JWT + getUser; anon RPC revoke; demo flag off in production; see earlier sections in git history for full attack-path tables.

### 7. send-whatsapp (updated)

| Field | Detail |
| --- | --- |
| Previous | Open function; service role; all pending rows; hosted trigger uses service-role Bearer. |
| Repo fix | Secret gate + society scope + atomic claim/finalize + batch/rate limits + browser deny + trigger no-op. |
| Deploy required | Edge function **and** `20261120170000_whatsapp_dispatch_hardening.sql` **and** set `WA_DISPATCH_SECRET` **and** configure cron per society. |
| Remaining risk | Until deploy, open dispatcher remains. After deploy, misconfigured cron without `society_id` gets 400 (safe fail). |

---

## Remaining risks (explicit)

1. **Hosted still vulnerable** until human applies migrations + deploys functions — repo green ≠ production safe.
2. **Plaintext PIN values** remain in columns until a separate hashing migration; revoke only blocks PostgREST SELECT for anon/authenticated.
3. **Legacy RLS** still allows committee to read non-secret resident fields society-wide by design; multi-society adversarial tests are Phase 1.
4. **Cron must be society-scoped**; a single global cron without `society_id` will not send (by design).
5. **`WA_ACCESS_TOKEN` / phone id** remain Edge secrets; compromise of Meta token is outside this PR’s SQL work.
6. **Do not replay** full `platform_foundation` on hosted — apply only the Phase 0 / WhatsApp hardening migration files.

---

## Exact hosted deployment procedure (human; not executed by this agent)

**Stop:** Do not merge PR #9 or promote production Pages as part of this step. Keep production config unchanged until an explicit approval after the post-deploy probe table is filled.

1. Snapshot current Edge function versions and note DB migration history.
2. Set Edge secret `WA_DISPATCH_SECRET` (see generation steps above). Confirm it is absent from frontend env.
3. Deploy Edge functions from this branch: `auth-login`, `ai-proxy` (`verify_jwt=true`), `send-whatsapp` (`verify_jwt=false`).
4. Apply **only**:
   - `supabase/migrations/20261120163000_phase0_security.sql`
   - `supabase/migrations/20261120170000_whatsapp_dispatch_hardening.sql`
5. Configure operator/cron to POST per society with the dispatch secret (no browser).
6. Confirm Cloudflare production `VITE_ENABLE_DEMO_LOGIN` unset; rebuild Pages only when approved.
7. Re-run probes + privilege SQL; fill the table below.
8. Only then request formal deployment/sign-off for remaining production promotion if needed.

### Post-deploy results (fill after approval)

| Probe | Expected | Actual | Tester / time |
| --- | --- | --- | --- |
| auth-login unauthenticated | 410 | _pending_ | |
| ai-proxy unauthenticated | 401 | _pending_ | |
| send-whatsapp without secret | 401 | _pending_ | |
| send-whatsapp with Origin header | 403 | _pending_ | |
| send-whatsapp secret, no society_id | 400 | _pending_ | |
| anon `account_balances` EXECUTE | false | _pending_ | |
| authenticated `is_committee` EXECUTE | true | _pending_ | |
| anon select `residents.pin` | denied | _pending_ | |
| Demo login flag off (prod) | no password UI | _pending_ | |

---

## Explicit non-actions this PR

- No automatic merge.
- No automatic function deploy.
- No `apply_migration` on hosted Society OS.
- No deletion of demo Auth users or resident rows.
- No production Pages promotion.
- **No deployment approval requested** in this update — disposable checks are complete; hosted apply awaits a human.

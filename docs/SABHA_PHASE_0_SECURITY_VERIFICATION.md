# SABHA Phase 0 — security verification

Date: 20 November 2026 (Asia/Calcutta). Branch: `cursor/phase-0-security-remediation-fe89`. PR #9.

**Hosted project inspected (read-only):** `wzchqxwwezklxsxmjvyt` (Society OS, ap-southeast-1, ACTIVE_HEALTHY).

**This phase does not deploy.** CI green is not completion. Phase 0 completes only after approved function deploys + migration apply + independent hosted re-probe.

**In-repo corrections complete below**, including the table-level SELECT privilege fix (deployment blocker), lease renewal / execution bound, and `service_role` claim path tests. Hosted apply remains human-gated.

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
| `residents` table SELECT | **`anon` and `authenticated` have table-level SELECT** (plus INSERT/UPDATE/DELETE). Column-level REVOKE alone cannot protect secrets while this remains. |
| `residents` secret columns | Effective SELECT true for all six secrets via table privilege (`pin`, `pin_hash`, `portal_pin`, `id_number`, `id_document_url`, `id_type`). |
| Hosted `trigger_send_whatsapp` | SECURITY DEFINER trigger posts to Edge with `Authorization: Bearer` + `current_setting('app.service_role_key')` and empty body `{}` — **cross-tenant + bypasses any future dispatch secret**. |

Probes used the project anon key and did **not** modify rows. Source-level migrations were **not** assumed equal to hosted grants.

---

## 1. WhatsApp dispatcher hardening (repo)

| Requirement | Implementation |
| --- | --- |
| Society / tenant scoping | `POST` body **requires** `society_id` (UUID). Claim RPC filters `WHERE society_id = p_society_id`. Edge rejects rows whose `society_id` ≠ request. |
| Atomic claim / no duplicate dispatch | `claim_whatsapp_batch` uses `FOR UPDATE SKIP LOCKED`, sets `status='sending'`, `claim_token`, increments `attempt_count`. Concurrent dispatchers cannot take the same active row. |
| Stale claim recovery | Rows in `sending` with `claimed_at` older than the **claim lease** are reclaimable. Active leases are never reclaimed. Recovery increments `attempt_count`, rotates `claim_token`, writes `last_error` starting with `stale_claim_recovered:`. |
| Claim lease | Default **300s**, raised to cover batch size (`60 + limit×3`). Override via body `lease_seconds` (60–3600) or GUC `app.wa_claim_lease_seconds`. Reclaiming an active lease returns no row (idempotent). Uses `clock_timestamp()` so renewals advance inside a transaction. |
| Lease renewal | `renew_whatsapp_claims` (service_role only) advances `claimed_at` for rows still held by the claim token. Edge renews **before each send**. |
| Execution bound | Hard stop at **75% of lease** from dispatch start: remaining claimed rows are finalized back to `pending` (`lease_budget_exhausted`) so another worker cannot race an in-flight send after silent expiry. If renew returns 0, the worker aborts the remainder. |
| Attempt cap | `attempt_count < 5` required to claim or recover. At 5, finalize failure marks `failed`. |
| Idempotent finalize | Updates only when `claim_token` + `society_id` + `status='sending'` match. Failures with `attempt_count < 5` return to `pending`; at 5 → `failed`. |
| Finalize error handling | Edge inspects every RPC result. RPC errors, thrown failures, and `false` results go into redacted `diagnostics`; `finalize_issues` counted. Rows left in `sending` remain recoverable after lease expiry. |
| Delivery semantics | **At-least-once, not exactly-once.** If Graph accepts a message and finalize fails / response is lost, a later reclaim may send again (`at_least_once_risk` diagnostic). |
| Max batch + rate limit | Cap **25** messages/request; **200 ms** spacing between Graph API calls. |
| Unsuccessful API responses | Non-2xx or missing `messages[0].id` → finalize failure with redacted `last_error`. |
| No credential logging | Errors strip `Bearer`/`token`/`secret`/`apikey`/`password` patterns; function never logs `WA_*` or service role. |
| No browser invoke | Rejects `OPTIONS`, rejects `Origin` / non-`none` `Sec-Fetch-Site`, no CORS allow-origin. Clients queue via `whatsapp_log` only. |
| Authorised dispatch | `Authorization: Bearer <WA_DISPATCH_SECRET>` with timing-safe compare; secret ≥32 chars. Service role only after secret check. |
| DB trigger | Queue-only no-op (stops hosted HTTP + service-role Bearer). |

### Stale claim recovery design

1. Crash / timeout / failed finalize leaves `status='sending'` with `claimed_at` + `claim_token`.
2. While `clock_timestamp() - claimed_at < lease`, other workers skip the row.
3. The owning worker renews `claimed_at` before each Graph call so a healthy dispatch cannot outlive its lease and be reclaimed mid-send.
4. After true lease expiry (crashed worker), the next society-scoped claim may take the row, record `stale_claim_recovered…`, bump `attempt_count`, and assign a new token.
5. Recovery is society-isolated and subject to the five-attempt cap.
6. Finalize with a wrong/stale token returns `false` without mutating the row.

### Residents privilege fix (deployment blocker)

Hosted grants **table-level** `SELECT` to `anon` and `authenticated`. In PostgreSQL, that makes every column selectable; column-level `REVOKE SELECT (pin)` does **not** remove effective access.

Migration `20261120163000_phase0_security.sql` now:

1. `REVOKE SELECT ON TABLE public.residents FROM PUBLIC, anon, authenticated`
2. `REVOKE SELECT (secret)` per sensitive column
3. `GRANT SELECT (…all non-secret columns…)` to **`authenticated` only** (dynamic from `pg_attribute`, excluding the six secrets)
4. Leaves `anon` with no residents SELECT (table or column)

Legitimate committee/resident UI reads that use non-secret columns (and `RESIDENT_READ_COLUMNS`) keep working for signed-in users. `SELECT *` / selecting `pin` fails for clients.

### WA_DISPATCH_SECRET — generate, store, rotate

1. **Generate** (operator machine, not in chat/repo): `openssl rand -base64 48`
2. **Store** only in Supabase Edge Function secrets for `send-whatsapp` and the cron/operator store. **Never** in `VITE_*`, frontend, git, or CI logs.
3. **Invoke** (server-side only):
   ```bash
   curl -X POST "$SUPABASE_URL/functions/v1/send-whatsapp" \
     -H "Authorization: Bearer $WA_DISPATCH_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"society_id":"<uuid>","limit":20,"lease_seconds":300}'
   ```
4. **Rotate**: generate new → update Edge secret + cron env → confirm 401 with old → discard old.
5. **verify_jwt**: keep `false` (dispatch secret is not a user JWT).

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
| `residents` TABLE SELECT | true | true |
| `residents.pin` SELECT (effective) | true | true |
| `residents.pin_hash` SELECT | true | true |
| `residents.portal_pin` SELECT | true | true |
| `residents.id_number` SELECT | true | true |
| `residents.id_document_url` SELECT | true | true |
| `residents.id_type` SELECT | true | true |

### Disposable DB after migrations (evidence)

Script: `scripts/test-phase0-security.sh` → DB `societyos_phase0_test` (PostgreSQL 16).

**Baseline includes hosted-like `GRANT SELECT ON TABLE residents TO anon, authenticated`** (proves column-only REVOKE would be insufficient). Then:

- `20261120163000_phase0_security.sql`
- `20261120170000_whatsapp_dispatch_hardening.sql`

**Run result (20 Nov 2026, Asia/Calcutta):** `phase0 security assertions passed` / `phase0 disposable database tests passed`.

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
| `renew_whatsapp_claims` | false | false | true |
| `residents` TABLE SELECT | **false** | **false** | — |
| `residents.pin` SELECT | false | false | — |
| `residents.pin_hash` SELECT | false | false | — |
| `residents.portal_pin` SELECT | false | false | — |
| `residents.id_number` SELECT | false | false | — |
| `residents.id_document_url` SELECT | false | false | — |
| `residents.id_type` SELECT | false | false | — |
| `residents.name` SELECT | false | **true** | — |
| `residents.phone` SELECT | false | **true** | — |

### Authenticated regression (disposable)

| Check | Result |
| --- | --- |
| Policy helpers under `authenticated` | `is_committee`, `is_super_admin`, `has_role`, `get_my_*`, `get_resident_id` EXECUTE + call OK |
| Dashboard RPCs | `account_balances`, `resident_dashboard`, `bank_balances` OK after `create_community` |
| Invoice number trigger | INSERT assigns `INV/…` without client EXECUTE on generator |
| Ticket number trigger | INSERT assigns `TKT-…` without client EXECUTE on generator |
| WhatsApp queue insert | INSERT + no-op `trigger_send_whatsapp` OK |
| Effective pin deny | `SET ROLE authenticated; SELECT pin …` → permission denied; `SELECT name, phone` allowed |
| **`SET ROLE service_role` claim/renew/finalize** | Claim, renew advances `claimed_at`, wrong-token renew=0, active-lease block, stale recovery, attempt cap, society isolation OK |
| Client blocked from dispatch RPCs | `authenticated`/`anon` permission denied on claim/finalize/renew |

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

SELECT has_table_privilege('anon', 'public.residents', 'SELECT') AS anon_table,
       has_table_privilege('authenticated', 'public.residents', 'SELECT') AS auth_table;

SELECT col,
       has_column_privilege('anon', 'public.residents', col, 'SELECT') AS anon_sel,
       has_column_privilege('authenticated', 'public.residents', col, 'SELECT') AS auth_sel
FROM unnest(ARRAY['pin','pin_hash','portal_pin','id_number','id_document_url','id_type','name','phone']) AS col;

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
| Repo fix | Secret gate + society scope + atomic claim/finalize + **stale lease recovery** + finalize diagnostics + batch/rate limits + browser deny + trigger no-op. |
| Deploy required | Edge function **and** both Phase 0 SQL files **and** `WA_DISPATCH_SECRET` **and** per-society cron. |
| Remaining risk | Until deploy, open dispatcher remains. Duplicate WhatsApp delivery possible under at-least-once semantics (see §1). |

---

## Remaining risks (explicit)

1. **Hosted still vulnerable** until human applies migrations + deploys functions — repo green ≠ production safe.
2. **Plaintext PIN values** remain stored; privilege fix blocks PostgREST SELECT of secrets for anon/authenticated (table SELECT removed; non-secret columns re-granted to authenticated only).
3. **At-least-once WhatsApp delivery** — Graph accept + lost finalize can duplicate after lease reclaim. Not exactly-once.
4. **Legacy RLS** still allows committee to read non-secret resident fields society-wide; multi-society adversarial tests are Phase 1.
5. **Cron must be society-scoped**; missing `society_id` → 400.
6. **Do not replay** full `platform_foundation` on hosted — apply only the two Phase 0 migration files listed below.

---

## Exact hosted deployment procedure (human; not executed by this agent)

**Stop:** Do not merge PR #9 or change production Pages/config until an explicit human approval after post-deploy probes pass.

### Deploy order

1. Snapshot Edge function versions and DB migration history; export a logical backup of `whatsapp_log` / `residents` if required by ops policy.
2. Set Edge secret `WA_DISPATCH_SECRET` (generation above). Confirm absent from frontend env.
3. Apply SQL **in this order only** (do not replay foundation):
   1. `supabase/migrations/20261120163000_phase0_security.sql`
   2. `supabase/migrations/20261120170000_whatsapp_dispatch_hardening.sql`
4. Deploy Edge functions from this branch: `auth-login`, `ai-proxy` (`verify_jwt=true`), `send-whatsapp` (`verify_jwt=false`).
5. Configure operator/cron: one POST per society with secret (+ optional `lease_seconds`).
6. Confirm Cloudflare production `VITE_ENABLE_DEMO_LOGIN` unset; rebuild Pages only when approved.
7. Re-run probes + privilege SQL; fill the table below.
8. Only after green probes: human sign-off for any further production promotion.

### Rollback procedure

| Step rolled back | Action |
| --- | --- |
| Edge `send-whatsapp` | Redeploy previous function version from snapshot. Temporarily pause cron. Rows left in `sending` become reclaimable after lease once the new function returns, or manually set `status='pending'` / clear `claim_token` for known stuck ids (ops SQL, society-scoped). |
| Edge `auth-login` / `ai-proxy` | Redeploy previous versions from snapshot. Prefer keeping 410/authz fixes if rollback is only for WhatsApp. |
| SQL privilege revokes | Re-grant only with explicit incident approval (`GRANT EXECUTE … TO anon` / column SELECT). Prefer forward-fix over broad re-grants. |
| Claim columns / new RPCs | Leave columns in place (additive). `DROP FUNCTION` claim/finalize only if Edge is rolled back and no cron depends on them. Restore prior `trigger_send_whatsapp` body **only** if accepting the old service-role HTTP risk (not recommended). |
| Secret compromise | Rotate `WA_DISPATCH_SECRET` immediately; update cron; do not put the new value in chat/git. |

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
| anon/auth SELECT on all six secret columns | denied | _pending_ | |
| Demo login flag off (prod) | no password UI | _pending_ | |

---

## Explicit non-actions this PR

- No automatic merge.
- No automatic function deploy.
- No `apply_migration` on hosted Society OS.
- No deletion of demo Auth users or resident rows.
- No production Pages promotion.
- **Human deployment approval may be requested only after this reliability pass** (complete in-repo); hosted apply still requires a separate human decision.

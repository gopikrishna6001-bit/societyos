# SABHA Phase 0 — security verification

Date: 20 November 2026 (Asia/Calcutta). Branch: `cursor/phase-0-security-remediation-fe89`.

**Hosted project inspected (read-only):** `wzchqxwwezklxsxmjvyt` (Society OS, ap-southeast-1, ACTIVE_HEALTHY).

**This phase does not deploy.** CI green is not completion. Phase 0 completes only after approved function deploys + migration apply + independent hosted re-probe.

---

## Hosted baseline (before deploy)

| Object | Observed 20 Nov 2026 |
| --- | --- |
| Edge `auth-login` | ACTIVE, `verify_jwt=false`. Unauthenticated POST with anon key returned **HTTP 401** body `Phone number not registered…` — **legacy PIN lookup still live** (repo 410 not deployed). |
| Edge `ai-proxy` | ACTIVE, `verify_jwt=false`. Unauthenticated POST returned **HTTP 200** (Gemini model error text) — **open proxy**. |
| Edge `send-whatsapp` | ACTIVE, `verify_jwt=false`. Unauthenticated POST returned **HTTP 200** `no pending` — **open dispatcher with service role**. |
| Edge `whatsapp-bot` | ACTIVE, `verify_jwt=false` (webhook). |
| Edge `invite-member` | Not listed on host (repo-only). |
| RPC `anon` EXECUTE | `true` for `account_balances`, `resident_dashboard`, `trigger_send_whatsapp`, `generate_invoice_number`, `generate_ticket_number`, `is_committee`, `is_super_admin`. |
| `residents` policies | `read_own_resident` SELECT, committee UPDATE, superadmin INSERT (roles `{public}`). PIN column revoke **not applied** on host (invitations migration not applied). |

Probes used the project anon key and did **not** modify rows.

---

## Issue register

### 1. auth-login / phone PIN

| Field | Detail |
| --- | --- |
| Previous vulnerability | Unauthenticated lookup/login/`set_pin`/`reset_pin` via service role; enumerable phones; plaintext PIN compare. |
| Attack path | `POST /functions/v1/auth-login` + anon `apikey` → body actions without user JWT (`verify_jwt=false`). Confirmed live lookup response. |
| Exact fix (repo) | Handler returns **410** before body/DB (`supabase/functions/auth-login/index.ts`). UI does not call it. |
| Hosted object | Edge Function `auth-login` |
| Deploy required | **Yes — replace hosted function with repo 410.** Prefer keep `verify_jwt=false` so OPTIONS/410 work without a user token; security is the handler itself. |
| Test performed | Source regression (no `set_pin`/`createClient`). Hosted probe (baseline). |
| Actual result | Repo PASS. Hosted still vulnerable until deploy. |
| Remaining risk | Until deploy, PIN API remains exploitable. After deploy, re-probe must return **410** for every action including `lookup`/`set_pin`. |

### 2. PIN storage / column exposure

| Field | Detail |
| --- | --- |
| Previous vulnerability | `residents.pin` (and related) readable by sessions that pass `read_own_resident` / committee policies; clients historically `select *`. |
| Attack path | Authenticated committee/super-admin `select` including `pin`. |
| Exact fix (repo) | Clients use `RESIDENT_READ_COLUMNS` / `withoutResidentSecrets`. Migration `20261120163000_phase0_security.sql` (and prior invitations file) `REVOKE SELECT` on secret columns from PUBLIC/anon/authenticated. |
| Hosted object | Table `public.residents` columns `pin`, `pin_hash`, `portal_pin`, … |
| Deploy required | **Yes — apply phase0 migration with approval.** Does not delete PIN values. |
| Test performed | Unit tests for secret stripping; migration source assertions. |
| Actual result | Repo PASS. Hosted revoke **not applied**. |
| Remaining risk | Plaintext PINs remain stored until a separately approved hashing/cleanup. Column revoke stops PostgREST reads for those roles. |

### 3. ai-proxy authz

| Field | Detail |
| --- | --- |
| Previous vulnerability | No user check; CORS `*`; leaked Gemini error JSON; billable key abuse. |
| Attack path | Unauthenticated POST → Gemini. Confirmed HTTP 200. |
| Exact fix (repo) | Require `Authorization: Bearer`; `auth.getUser()`; reject 401; sanitize upstream errors. Clients attach session token via `aiRequestHeaders()` when endpoint is a Supabase function. |
| Hosted object | Edge Function `ai-proxy` |
| Deploy required | **Yes.** Set `verify_jwt=true` in dashboard **and** deploy new handler (JWT alone is insufficient without getUser). |
| Test performed | Source asserts bearer + getUser; no raw Gemini error passthrough. |
| Actual result | Repo PASS. Hosted open until deploy. |
| Remaining risk | Legitimate AI features need `VITE_AI_ENDPOINT` pointing at the function + signed-in session. |

### 4. Publicly callable sensitive functions

| Field | Detail |
| --- | --- |
| Previous vulnerability | `anon` EXECUTE on messaging helper, number generators, policy helpers, and dashboard RPCs. |
| Attack path | PostgREST `/rest/v1/rpc/...` with anon key. |
| Exact fix (repo) | `20261120163000_phase0_security.sql` revokes anon (and where appropriate authenticated) executes; re-grants authenticated for policy helpers and dashboard RPCs. |
| Hosted object | Functions listed in baseline table |
| Deploy required | **Yes — migration apply.** |
| Test performed | Migration source tests. Hosted SQL baseline. |
| Actual result | Hosted still grants anon EXECUTE. |
| Remaining risk | After apply, re-run `has_function_privilege('anon', …)` must be false for listed names. Cross-society isolation still needs Phase 1 RLS adversarial tests. |

### 5. Resident data / RLS

| Field | Detail |
| --- | --- |
| Previous vulnerability | Broad grants + PIN columns; dual app surfaces. |
| Attack path | Privileged select; shell confusion. |
| Exact fix (repo) | Column revoke + client column allowlists. Shell unification is **not** Phase 0. |
| Hosted object | `residents` RLS policies |
| Deploy required | Migration (column revoke). No policy rewrite in this PR without disposable testing. |
| Test performed | Read-only policy inventory. |
| Actual result | Policies unchanged; revoke pending. |
| Remaining risk | Committee can still read non-secret resident fields across society by design of legacy policies. Multi-society isolation **NOT TESTED**. |

### 6. Demo credentials

| Field | Detail |
| --- | --- |
| Previous vulnerability | Shared password embedded when demo UI is enabled. |
| Attack path | Production build with `VITE_ENABLE_DEMO_LOGIN=true` exposes emails + shared password. |
| Exact fix (repo) | Demo list loads only when `VITE_ENABLE_DEMO_LOGIN === "true"` (dynamic import). Production Pages should leave flag unset. Demo emails still isolate to DemoApp when used. |
| Hosted object | Cloudflare Pages env `VITE_ENABLE_DEMO_LOGIN` |
| Deploy required | Confirm production env **unset**. Preview may set for QA. |
| Test performed | Source assertion on Platform gate. |
| Actual result | Mainline gate present. |
| Remaining risk | Accounts exist in Auth; password rotation is a separate ops task (not done here; no account deletion). |

### 7. send-whatsapp open dispatcher (additional P0)

| Field | Detail |
| --- | --- |
| Previous vulnerability | Unauthenticated function uses service role to send WhatsApp. |
| Attack path | Confirmed POST → 200 without user auth. |
| Exact fix (repo) | Require `Authorization: Bearer <WA_DISPATCH_SECRET>`. Client no longer calls the function; queues only. |
| Hosted object | Edge Function `send-whatsapp` |
| Deploy required | **Yes** + set secret `WA_DISPATCH_SECRET`. |
| Test performed | Source + WhatsAppCentre no longer references function URL. |
| Actual result | Repo PASS. Hosted open until deploy. |
| Remaining risk | Secret must be rotated if ever leaked; cron must be configured out-of-band. |

---

## Approved deploy checklist (human)

1. Snapshot / note current function versions.
2. Deploy `auth-login` → expect **410** on probe.
3. Deploy `ai-proxy` with `verify_jwt=true` → expect **401** without user JWT; **200/502** with valid user session when Gemini configured.
4. Deploy `send-whatsapp` + set `WA_DISPATCH_SECRET` → expect **401** without secret.
5. Apply `20261120163000_phase0_security.sql` only (not full foundation replay).
6. Confirm Cloudflare production `VITE_ENABLE_DEMO_LOGIN` unset; rebuild.
7. Re-run probes; attach results below.

### Post-deploy results (fill after approval)

| Probe | Expected | Actual | Tester / time |
| --- | --- | --- | --- |
| auth-login unauthenticated | 410 | _pending_ | |
| ai-proxy unauthenticated | 401 | _pending_ | |
| send-whatsapp unauthenticated | 401 | _pending_ | |
| anon `account_balances` EXECUTE | false | _pending_ | |
| anon select `residents.pin` | denied | _pending_ | |
| Demo login with flag off (prod) | no password UI | _pending_ | |
| Demo login with flag on (preview) | still works | _pending_ | |

---

## Explicit non-actions this PR

- No automatic merge.
- No automatic function deploy.
- No `apply_migration` on hosted Society OS.
- No deletion of demo Auth users or resident rows.
- No production Pages promotion.

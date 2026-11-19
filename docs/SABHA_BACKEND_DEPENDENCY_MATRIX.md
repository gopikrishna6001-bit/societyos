# SABHA backend dependency matrix

Maps every screen/feature to its data source from repository code. Migrations inspected: `supabase/migrations/20261118120000_platform_foundation.sql`, `supabase/migrations/20261119120000_invitations.sql`. Edge functions: `supabase/functions/{ai-proxy,auth-login,invite-member,send-whatsapp,whatsapp-bot}`.

Statuses: **PASS** / **FAIL** / **BLOCKED** / **NOT TESTED** / **DEMO ONLY** — aligned with `docs/IMPLEMENTATION_STATUS.md` hosted notes and code isolation rules.

---

## 1. Isolation rules (code)

| Rule | Evidence | Effect |
| --- | --- | --- |
| Demo emails never hit community reads/writes | `Platform.jsx` `isDemoEmail` → `DemoApp`; `isDemoEmail` checks `@demo.sabha.app` in `demo/data.js` | **DEMO ONLY** — `useReducer` + fixtures; notices say ledger / membership / email not updated |
| Demo reducer actions | `DemoApp.jsx` actions: `month`, `approve`, `vote`, `book`, `visitor`, `reply`, `pay`, `raise`, `expense`, `observe`, `invite` | In-memory only; no `supabase.from` / `rpc` |
| Live Platform data path | `platform/api.js` `rpc()` / `rows(supabase.from())` | Requires foundation (and invitations) RPCs/tables on the project |
| Hosted foundation gap | `IMPLEMENTATION_STATUS.md`: tables/RLS/home dashboard + DEMO accounts on Society OS; write RPCs (open fund, expense, concern, etc.) still need applying; do not replay whole migration | Live **writes** **BLOCKED** until functions exist |
| Legacy vs SABHA tables | `lib/legacyTables.js` | Legacy UI uses `legacy_*` and `society_id` tables; live Platform uses `community_id` SABHA tables |

---

## 2. Auth and session

| Feature | Client | Backend | Status |
| --- | --- | --- | --- |
| Platform sign-in | `Platform.jsx` `signInWithPassword` | Supabase Auth | **PASS** (form + DEMO accounts on host) |
| Legacy sign-in | `Login.jsx` `signInWithPassword` | Supabase Auth | **PASS** form; needs `residents` link |
| Phone/PIN login | Not used by UI | Edge `auth-login` returns **410** discontinued | **FAIL** if called; intentionally retired |
| Password reset | `AccountRecovery.jsx` | Auth `resetPasswordForEmail` / `updateUser` | **NOT TESTED** mail delivery |
| Accept invite | `JoinCommunity` | Auth `updateUser` + RPC `accept_invitation` | **BLOCKED** without invitations objects |
| Demo picker | `demoAccounts.js` when `VITE_ENABLE_DEMO_LOGIN=true` | Auth users only; no community RPC | **DEMO ONLY** |

---

## 3. Live Platform → tables / RPCs / storage / edges

### 3.1 Shell / membership

| Feature | Reads | Writes / RPC | Status |
| --- | --- | --- | --- |
| Load memberships | `community_memberships` + embed `communities` | — | **PASS** when tables exist (DEMO community) |
| Create community | — | RPC `create_community` | **BLOCKED** if RPC missing on host |
| Sign out | — | Auth `signOut` | **PASS** |

### 3.2 Home

| Feature | Reads | Writes / RPC | Status |
| --- | --- | --- | --- |
| Home dashboard | RPC `resident_dashboard` | — | **PASS** empty/read on DEMO community |

### 3.3 Finance

| Feature | Reads | Writes / RPC | Status |
| --- | --- | --- | --- |
| Fund balances | RPC `account_balances`; `accounts` | RPC `open_fund`, `reverse_entry` | Read **PASS** empty; write **BLOCKED** |
| Collections | `collection_periods`, `maintenance_demands`, RPC `collection_summary` | RPC `open_collection_period`, `record_collection` | Write **BLOCKED** |
| Expenses list / approve / pay | `expenses` (+ `expense_categories`) | RPC `create_expense`, `decide_expense`, `pay_expense`, `review_subject` | Write **BLOCKED** |
| Reconciliation | `bank_reconciliations` | RPC `start_reconciliation`, `import_statement_lines`, `match_statement_line`, `complete_reconciliation` | Write **BLOCKED** |
| Audit reviews list | `audit_reviews` | (expense/statement review RPCs above) | **NOT TESTED** |
| Statements | `financial_statements` | RPC `close_month`, `submit_statement`, `review_statement`, `publish_statement`, `append_statement_version` | Write **BLOCKED** |
| CSV export balances | Client-side from `account_balances` | None | **PASS** (client only) |

### 3.4 Concerns / meetings / documents / units / notifications / settings / history

| Feature | Reads | Writes / RPC / other | Status |
| --- | --- | --- | --- |
| Concerns | `tickets`, `ticket_updates` | RPC `create_ticket`, `transition_ticket` | Write **BLOCKED** |
| Meetings | `meetings` | RPC `create_meeting` | Write **BLOCKED** |
| Resolutions / votes | `resolutions` | RPC `propose_resolution`, `cast_vote`, `close_vote` | Write **BLOCKED** |
| Documents list / open | `documents`; Storage signed URL | Storage `upload` + RPC `register_document` | Write **BLOCKED** if storage/RPC incomplete |
| Units / occupancy | `units` | RPC `add_unit`, `add_occupancy` | Write **BLOCKED** |
| Notifications | `notifications` | Direct update `read_at` | In-app only; email/WhatsApp **FAIL** (not sent) |
| Settings | `community_settings` | No edit UI | Read **NOT TESTED**; governed change not on screen |
| Invite member | — | Edge `invite-member` → RPC `create_invitation` + Auth admin invite | **BLOCKED** without migration/function |
| Audit history | `audit_logs` | Written by DB triggers / RPCs | **NOT TESTED** |
| Profile | Session only | Auth `signOut` | **PASS** |

---

## 4. DemoApp → fixtures / reducer (no ledger)

| Feature | Source | Backend writes | Status |
| --- | --- | --- | --- |
| Home metrics, charts | `data.js` (`funds`, `months`, `community`, invoices snapshot) | None | **DEMO ONLY** |
| Community tabs | Fixtures + reducer `vote` / `book` / `visitor` | None | **DEMO ONLY** |
| Finance tabs | Fixtures + reducer `pay` / `approve` / `expense` / `observe` | None — explicit “ledger was not changed” | **DEMO ONLY** |
| Concerns | Fixture concerns + `raise` / `reply` | None — “ticket register” not written | **DEMO ONLY** |
| More / invitations | Fixture docs + reducer `invite` | None — no email, no membership | **DEMO ONLY** |
| More / assistant | Static `ANSWERS` in `More.jsx` | No AI edge / model | **DEMO ONLY** |

---

## 5. Legacy SocietyOS → `society_id` / `legacy_*` tables / edges

| Screen | Primary tables / services | Notes | Status |
| --- | --- | --- | --- |
| SocietyOS bootstrap | `residents`, `committee_members`, `societies` | Role via `roleFromResident` | **NOT TESTED** in this audit |
| Dashboard | `societies`, `complaints`, `invoices`, `maintenance_tasks`, `polls`, `visitors`, `deliveries`, `notices`, `volunteers` | Aggregate reads | **NOT TESTED** |
| Complaints | `complaints`, `complaint_comments`, `complaint_history` | Realtime channel | **NOT TESTED** |
| Finances | `societies`, `invoices`, `payments`, **`legacy_expenses`**, `charge_heads`, `residents`, `whatsapp_log` | Not SABHA `expenses` | **NOT TESTED** |
| Maintenance | `maintenance_tasks`, `assets`, `vendors`, `preventive_schedule`, `amc_contracts` | | **NOT TESTED** |
| Residents | `residents`, `invoices`, `complaints`, `roles`, `user_roles`, `vehicles`, `family_members` | | **NOT TESTED** |
| Notices | `notices` | | **NOT TESTED** |
| Polls | `polls` | | **NOT TESTED** |
| Meetings | **`legacy_meetings`** | Renamed clash table | **NOT TESTED** |
| Committee | `committee_members`, `residents`, `audit_log` (+ summaries) | Legacy `audit_log` ≠ SABHA `audit_logs` | **NOT TESTED** |
| Super Admin | `societies`, `blocks`, `flats`, `roles`, `maintenance_models`, `residents`, `invoices`, `complaints` | | **NOT TESTED** |
| Resident portal | `residents`, `invoices`, `complaints`, `notices`, `polls`, `amenities`, `amenity_bookings` | | **NOT TESTED** |
| Gate | `visitors`, `deliveries`, `staff`, `staff_attendance`, `blacklist`, `frequent_visitors`, `security_incidents` | Off primary nav | **NOT TESTED** |
| Amenities | `amenities`, `amenity_bookings` | Off primary nav | **NOT TESTED** |
| Volunteers | `volunteers`, `volunteer_tasks`, `appreciations`, `campaigns`, `campaign_joins` | Off primary nav | **NOT TESTED** |
| WhatsApp centre | `whatsapp_log`, `message_templates`, `residents`, `societies` + edge `send-whatsapp` | Delivery not guaranteed | **NOT TESTED** / outbound **FAIL** per product docs |
| AI assistant | `societies` + HTTP `VITE_AI_ENDPOINT` / Anthropic | Edge `ai-proxy` (Gemini) exists but is **not** called from this component | **NOT TESTED** |

---

## 6. Migration catalog (foundation + invitations)

### 6.1 Tables (`20261118120000_platform_foundation.sql`)

`communities`, `community_settings`, `profiles`, `units`, `unit_occupancies`, `community_memberships`, `bank_accounts`, `accounts`, `journal_entries`, `journal_lines`, `expense_categories`, `expenses`, `expense_approvals`, `collection_periods`, `maintenance_demands`, `collections`, `bank_reconciliations`, `bank_statement_lines`, `financial_statements`, `financial_statement_versions`, `audit_reviews`, `auditor_elections`, `auditor_ballots`, `auditor_terms`, `tickets`, `ticket_counters`, `ticket_updates`, `ticket_status_history`, `meetings`, `resolutions`, `resolution_votes`, `contribution_campaigns`, `documents`, `document_versions`, `notifications`, `audit_logs`.

### 6.2 Public RPCs used or defined for live Platform

| RPC | Used by UI | Hosted note |
| --- | --- | --- |
| `resident_dashboard` | Home | Applied for DEMO home (**PASS** read) |
| `account_balances` | Finance funds | Read path for empty funds |
| `create_community` | Setup | Write **BLOCKED** until present |
| `open_fund`, `reverse_entry` | Funds | Write **BLOCKED** |
| `open_collection_period`, `record_collection`, `collection_summary` | Collections | Write **BLOCKED** / summary read depends on apply |
| `create_expense`, `decide_expense`, `pay_expense`, `review_subject` | Expenses | Write **BLOCKED** |
| `start_reconciliation`, `import_statement_lines`, `match_statement_line`, `complete_reconciliation` | Reconciliation | Write **BLOCKED** |
| `close_month`, `submit_statement`, `review_statement`, `publish_statement`, `append_statement_version` | Statements | Write **BLOCKED** |
| `create_ticket`, `transition_ticket` | Concerns | Write **BLOCKED** |
| `create_meeting`, `propose_resolution`, `cast_vote`, `close_vote` | Decisions | Write **BLOCKED** |
| `register_document` | Documents | Write **BLOCKED** |
| `add_unit`, `add_occupancy` | Units | Write **BLOCKED** |
| `post_journal`, `bank_balances`, `add_bank_account`, `grant_role`, auditor election RPCs, `record_minutes`, … | Defined in migration; **not** all wired in `screens.jsx` | Schema present in repo; host apply incomplete |

Also defined: `statement_due_on`, storage helper `storage_community`, private helpers under `private.*` (not called directly from the client except via security-definer RPCs).

### 6.3 Invitations (`20261119120000_invitations.sql`)

| Object | Role |
| --- | --- |
| Tables `invitations`, `auth_events` | Invite lifecycle / audit of auth events |
| RPC `create_invitation` | Called from edge `invite-member` |
| RPC `accept_invitation` | Called from `/join` |

Status: **BLOCKED** for live invite flow until applied and function deployed with service role + mail.

---

## 7. Edge functions

| Function | Path | Callers in repo | Depends on | Status |
| --- | --- | --- | --- | --- |
| `invite-member` | `supabase/functions/invite-member` | Live `InviteResident.jsx` | Auth bearer, `create_invitation`, Auth admin invite API | **BLOCKED** until deployed + secrets |
| `auth-login` | `supabase/functions/auth-login` | None (legacy PIN retired) | Returns 410 JSON error | **FAIL** for PIN login (by design) |
| `send-whatsapp` | `supabase/functions/send-whatsapp` | Legacy `WhatsAppCentre.jsx` (hardcoded project URL) | `whatsapp_log`, WA Graph API env | **NOT TESTED** / product says not delivered |
| `whatsapp-bot` | `supabase/functions/whatsapp-bot` | WhatsApp webhook (not Platform UI) | WA + optional Gemini; legacy `SOCIETY_ID` | **NOT TESTED** |
| `ai-proxy` | `supabase/functions/ai-proxy` | Not referenced by Platform/Demo; legacy AI uses Anthropic/`VITE_AI_ENDPOINT` | `GEMINI_API_KEY` | **NOT TESTED** / unused by current live shell |

---

## 8. Matrix summary by surface

| Surface | Data plane | Ledger writes | Status headline |
| --- | --- | --- | --- |
| Auth (`/`, `/reset`, `/join`) | Supabase Auth (+ invite RPC) | N/A | Sign-in **PASS**; invite **BLOCKED** |
| DemoApp (`@demo.sabha.app`) | Fixtures + `useReducer` | **Never** | **DEMO ONLY** |
| Live Platform shell | `rpc` + `supabase.from` + storage | Yes, via RPCs | Reads partial **PASS**; writes **BLOCKED** on host |
| Legacy `/legacy/*` | `society_id` + `legacy_*` tables; some edges | Yes, direct table mutations | **NOT TESTED** in Platform audit; separate schema from SABHA ledger |

---

## 9. Feature → source quick index

| Feature | Source type |
| --- | --- |
| Palm Court demo figures | Static fixtures in `src/platform/demo/data.js` |
| Demo mutations | `useReducer` in `DemoApp.jsx` |
| Live balances / statements / tickets / meetings | Foundation tables + RPCs |
| Live invite email | Edge `invite-member` |
| Legacy expenses / meetings | `legacy_expenses` / `legacy_meetings` |
| Legacy invoices / complaints / notices / polls / gate / amenities / volunteers | Original `society_id` tables in hosted Society OS schema |
| WhatsApp outbound | Edge `send-whatsapp` + `whatsapp_log` |
| Discontinued PIN auth | Edge `auth-login` (410) |

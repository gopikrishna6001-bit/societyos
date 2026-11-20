# SABHA screen inventory

Inventory from repository inspection on branch `cursor/sabha-functional-audit-fe89` (19 November 2026, Asia/Calcutta). Statuses use: **PASS** / **FAIL** / **BLOCKED** / **NOT TESTED** / **DEMO ONLY**. Demo routes were browser-exercised in this audit; live write paths and most legacy modules remain blocked or not tested. See `SABHA_FUNCTIONAL_AUDIT.md` and `SABHA_SMOKE_TEST_REPORT.md`.

Routing root: `src/main.jsx`.

| Parent route | Element |
| --- | --- |
| `/reset` | `ResetPassword` from `src/components/AccountRecovery.jsx` |
| `/join` | `JoinCommunity` from `src/components/AccountRecovery.jsx` |
| `/legacy/*` | `SocietyOS` from `src/SocietyOS.jsx` |
| `/*` | `Platform` from `src/platform/Platform.jsx` |

Demo isolation: if the signed-in email ends with `@demo.sabha.app`, `Platform` renders `DemoApp` and does **not** load `community_memberships` or call live community RPCs/tables. Demo mutations use `useReducer` only; notices say the community ledger is not changed.

---

## 1. Auth

| Screen | Parent route | Nav entry | Component path | Data source | Intended roles | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Sign in (live / demo picker) | `/` (unauthenticated `Platform`) | — (default) | `src/platform/Platform.jsx` → `AuthScreen` | Supabase Auth `signInWithPassword`; demo accounts always listed from `src/demoAccounts.js` (tap role to sign in) | Any issued email; demo personas always offered | **PASS** for email/password form; hosted session path documented as working for DEMO accounts |
| Config required | `/` when Supabase env missing | Link “Open the earlier screens” → `/legacy` | `src/platform/Platform.jsx` → `ConfigRequired` | Static / env (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) | Anyone | **PASS** (empty-state UI) |
| Reset password | `/reset` | “Forgot password” from sign-in | `src/components/AccountRecovery.jsx` → `ResetPassword` | Supabase Auth `resetPasswordForEmail`, `updateUser({ password })` | Account holders | **NOT TESTED** end-to-end on hosted mail delivery |
| Accept invitation | `/join?invite=…` | Invitation email link | `src/components/AccountRecovery.jsx` → `JoinCommunity` | Supabase Auth session + `rpc("accept_invitation")`; invitations created via edge `invite-member` | Invitees | **BLOCKED** on hosted if invitation migration / function incomplete |
| Legacy sign in | `/legacy` (no session) | — | `src/components/Login.jsx` | Supabase Auth `signInWithPassword` (no phone/PIN; `auth-login` edge returns 410) | Legacy resident-linked users | **PASS** for form; resident link depends on `residents` row |

---

## 2. Live Platform shell

Shell: `src/platform/Platform.jsx` → `LiveCommunity` → `Shell` / `Screen`. Screens: `src/platform/screens.jsx`. Invite UI: `src/platform/InviteResident.jsx` (embedded in Settings).

Role gate (`canSee` in `Platform.jsx`):

| Nav id | Visible when |
| --- | --- |
| `home`, `finance`, `concerns`, `decisions`, `documents`, `notifications`, `profile` | All active membership roles |
| `collections`, `funds` | `committee_admin` / `platform_admin` / `treasurer` |
| `reconciliation`, `expenses`, `reviews`, `history` | finance ops above **or** `resident_auditor` |
| `units`, `settings` | `committee_admin` / `platform_admin` only |

Primary nav: Home, Finance, Concerns, Meetings (`decisions`). Overflow “More”: Documents, Notifications, Profile, Collections, Expenses, Funds, Reconciliation, Reviews, Residents and Units, Settings, Audit History.

| Screen / focus | Parent route | Nav entry | Component path | Data source | Intended roles | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Community setup | `/` (no membership) | — | `Platform.jsx` → `Setup` | RPC `create_community` | First-time creator (becomes community admin via RPC) | **BLOCKED** on hosted if write RPCs not fully applied |
| Home | `/` shell page `home` | Home | `screens.jsx` → `HomeScreen` | RPC `resident_dashboard` | All members | **PASS** for empty/read path on DEMO community; write paths N/A |
| Finance overview | page `finance` | Finance | `FinanceScreen` (`focus=finance` → section Funds) | RPC `account_balances`; tables `accounts`, `expenses`, `collection_periods` | All members (section depth role-gated) | Reads **PASS** empty; writes **BLOCKED** hosted |
| Funds | page `funds` or Finance section | Funds / Finance | `FinanceScreen` | RPC `account_balances`, `open_fund`, `reverse_entry` | View: members; post: `treasurer` | Write **BLOCKED** hosted |
| Collections | page `collections` | Collections | `FinanceScreen` | Tables `collection_periods`, `maintenance_demands`; RPC `collection_summary`, `open_collection_period`, `record_collection` | Finance ops; record payment: `treasurer` | Write **BLOCKED** hosted |
| Expenses | page `expenses` | Expenses | `FinanceScreen` | Table `expenses` (+ `expense_categories`); RPC `create_expense`, `decide_expense`, `pay_expense`, `review_subject` | Finance ops / auditor reviews | Write **BLOCKED** hosted |
| Reconciliation | page `reconciliation` | Reconciliation | `FinanceScreen` | Table `bank_reconciliations`; RPC `start_reconciliation`, `import_statement_lines`, `match_statement_line`, `complete_reconciliation` | Treasurer / committee / auditor / platform admin | Write **BLOCKED** hosted |
| Reviews | page `reviews` | Reviews | `FinanceScreen` | Table `audit_reviews` | Finance ops / auditor | Read **NOT TESTED** hosted; depends on foundation |
| Statements (Finance section) | Finance → Statements | (inside Finance) | `FinanceScreen` | Table `financial_statements`; RPC `close_month`, `submit_statement`, `review_statement`, `publish_statement`, `append_statement_version` | Treasurer post; auditor review | Write **BLOCKED** hosted |
| Concerns | page `concerns` | Concerns | `ConcernsScreen` | Tables `tickets`, `ticket_updates`; RPC `create_ticket`, `transition_ticket` | All members; status manage: committee | Write **BLOCKED** hosted |
| Meetings / decisions | page `decisions` | Meetings | `DecisionsScreen` | Tables `meetings`, `resolutions`; RPC `create_meeting`, `cast_vote`, `close_vote`, `propose_resolution` | All members; schedule/propose: committee | Write **BLOCKED** hosted |
| Documents | page `documents` | Documents | `DocumentsScreen` | Table `documents`; Storage buckets `community-published` / `community-originals`; RPC `register_document` | All read; upload: treasurer / committee / platform admin | Upload **BLOCKED** if storage policies / RPCs missing |
| Residents and Units | page `units` | Residents and Units | `UnitsScreen` | Table `units`; RPC `add_unit`, `add_occupancy` | Committee / platform admin | Write **BLOCKED** hosted |
| Notifications | page `notifications` | Notifications | `NotificationsScreen` | Table `notifications` (update `read_at`) | All members | **NOT TESTED** hosted delivery (in-app rows only; email/WhatsApp not sent) |
| Settings | page `settings` | Settings | `SettingsScreen` | Table `community_settings` (read-only UI) | Committee / platform admin | Read **NOT TESTED**; edit intentionally not on this screen |
| Invite member | Settings embed | (under Settings) | `InviteResident.jsx` | Edge function `invite-member` → `create_invitation` + Auth invite | `committee_admin` / `platform_admin` | **BLOCKED** without invitations migration + function secrets |
| Audit History | page `history` | Audit History | `HistoryScreen` | Table `audit_logs` | Finance ops / auditor | **NOT TESTED** hosted |
| Profile | page `profile` | Profile | `ProfileScreen` | Session email + roles (static); `signOut` | All members | **PASS** |

---

## 3. DemoApp (`@demo.sabha.app`)

Mounted from `Platform` when `isDemoEmail(session.user.email)`. Router: nested under `/` via `src/platform/demo/DemoApp.jsx` (`Routes` with relative paths). Data: `src/platform/demo/data.js` fixtures + `useReducer` in `DemoApp.jsx`. **Never** calls `rpc` / `supabase.from` for community ledger.

| Screen | Parent route | Nav entry | Component path | Data source | Intended roles | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Home | `/` | Home | `DemoApp.jsx` → `HomeScreen` | Fixtures: `funds`, `months`, `meetings`, `notices`, reducer `state` | Demo personas from email local-part | **DEMO ONLY** |
| Community | `/community` | Community | `demo/Community.jsx` | Fixtures + reducer (`vote`, `book`, `visitor`) | All demo personas | **DEMO ONLY** |
| — Directory | `/community` | tab Directory | same | Fixture directory | same | **DEMO ONLY** |
| — Units | `/community?tab=Units` | tab Units | same | Fixture units | same | **DEMO ONLY** |
| — Committee | `/community?tab=Committee` | tab Committee | same | Fixture committee | same | **DEMO ONLY** |
| — Staff | `/community?tab=Staff` | tab Staff | same | Fixture staff | same | **DEMO ONLY** |
| — Notices | `/community?tab=Notices` | tab Notices | same | Fixture `notices` | same | **DEMO ONLY** |
| — Meetings | `/community?tab=Meetings` | tab Meetings | same | Fixture `meetings` | same | **DEMO ONLY** |
| — Polls | `/community?tab=Polls` | tab Polls | same | Reducer `vote` on fixture polls | same | **DEMO ONLY** |
| — Amenities | `/community?tab=Amenities` | tab Amenities | same | Reducer `book` | same | **DEMO ONLY** |
| — Visitors | `/community?tab=Visitors` | tab Visitors | same | Reducer `visitor` | same | **DEMO ONLY** |
| Finance | `/finance` | Finance | `demo/Finance.jsx` | Fixtures + reducer (`pay`, `approve`, `expense`, `observe`) | Role-specific actions in UI | **DEMO ONLY** |
| — Overview | `/finance` | tab Overview | same | Fixture funds / months | same | **DEMO ONLY** |
| — Transactions | `/finance?tab=Transactions` | tab Transactions | same | Reducer expenses | same | **DEMO ONLY** |
| — Maintenance | `/finance?tab=Maintenance` | tab Maintenance | same | Reducer invoices | same | **DEMO ONLY** |
| — Reports | `/finance?tab=Reports` | tab Reports | same | Fixture reports / statement | same | **DEMO ONLY** |
| Concerns | `/concerns` | Concerns | `demo/Concerns.jsx` | Reducer `raise` / `reply` on fixture concerns | All; manage notes: committee/admin | **DEMO ONLY** |
| More | `/more` | More | `demo/More.jsx` | Fixtures + reducer `invite`; local Q&A answers (no model) | All; Invitations tab: `platform_admin` only | **DEMO ONLY** |
| — Profile | `/more` section | tab Profile | same | Persona static | same | **DEMO ONLY** |
| — Documents | `/more` | tab Documents | same | Fixture `documents`, `statement` | same | **DEMO ONLY** |
| — Invitations | `/more` | tab Invitations | same | Reducer only (no email) | `platform_admin` | **DEMO ONLY** |
| — Assistant | `/more` | tab Assistant | same | Static answer map in `More.jsx` | All | **DEMO ONLY** |
| — Settings | `/more` | tab Settings | same | Static copy | All | **DEMO ONLY** |
| Header notifications / profile | any DemoApp route | Bell / avatar | `DemoApp.jsx` → `Shell` | Fixture `notices`; persona; `onSignOut` → Auth signOut | All | **DEMO ONLY** |

Demo personas (`personaFromEmail`): `resident`, `treasurer`, `auditor` → `resident_auditor`, `committee` → `committee_admin`, `admin` → `platform_admin` (`*@demo.sabha.app`).

---

## 4. Legacy SocietyOS (`/legacy/*`)

Shell: `src/SocietyOS.jsx`. Auth bootstrap: `residents` (+ `committee_members`) by `auth_user_id`, society name from `societies`. Role nav: `ROLE_NAV`. Resident/tenant roles skip committee shell and open `ResidentPortal` only.

Deferred modules (`amenities`, `volunteers`, `whatsapp`, `ai`, `staff`/Gate) remain in `renderTab` but are **off** primary `ROLE_NAV` menus; still reachable only if `tab` is set programmatically (not listed in role menus). Inventory includes every component under `src/components/` used by legacy.

### 4.1 `ROLE_NAV` screens

| Screen | Parent route | Nav entry (`ROLE_NAV` id) | Component path | Data source | Intended roles (nav) | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Dashboard | `/legacy` | Dashboard (`dashboard`) | `src/components/Dashboard.jsx` | `societies`, `complaints`, `invoices`, `maintenance_tasks`, `polls`, `visitors`, `deliveries`, `notices`, `volunteers` (`society_id`) | super_admin, president, secretary, treasurer, committee | **NOT TESTED** as live Platform audit focus |
| Complaints | `/legacy` | Complaints (`conflicts`) | `src/components/Complaints.jsx` | `complaints`, `complaint_comments`, `complaint_history` (+ realtime) | super_admin, president, secretary, committee | **NOT TESTED** |
| Finances | `/legacy` | Finances (`finances`) | `src/components/Finances.jsx` | `societies`, `invoices`, `payments`, **`legacy_expenses`**, `charge_heads`, `residents`, `whatsapp_log` | super_admin, president, treasurer | **NOT TESTED** |
| Maintenance | `/legacy` | Maintenance (`maintenance`) | `src/components/Maintenance.jsx` | `maintenance_tasks`, `assets`, `vendors`, `preventive_schedule`, `amc_contracts` | super_admin, president, secretary | **NOT TESTED** |
| Residents | `/legacy` | Residents (`residents`) | `src/components/Residents.jsx` | `residents`, `invoices`, `complaints`, `roles`, `user_roles`, `vehicles`, `family_members` | super_admin, president, secretary, treasurer | **NOT TESTED** |
| Notices | `/legacy` | Notices (`notices`) | `src/components/Notices.jsx` | `notices` | super_admin, president, secretary, committee | **NOT TESTED** |
| Polls | `/legacy` | Polls (`voting`) | `src/components/Polls.jsx` | `polls` | super_admin, president, committee | **NOT TESTED** |
| Meetings | `/legacy` | Meetings (`meetings`) | `src/components/Meetings.jsx` | **`legacy_meetings`** | super_admin, president, secretary, committee | **NOT TESTED** |
| Committee | `/legacy` | Committee (`committee`) | `src/components/Committee.jsx` | `committee_members`, `residents`, `audit_log`, plus summary reads on `complaints` / `invoices` / `maintenance_tasks` | super_admin, president | **NOT TESTED** |
| Super Admin | `/legacy` | Super Admin (`admin`) | `src/components/SuperAdmin.jsx` | `societies`, `blocks`, `flats`, `roles`, `maintenance_models`, `residents`, destructive deletes on `invoices` / `complaints` | super_admin only | **NOT TESTED** |
| Resident portal | `/legacy` | (auto for resident/tenant; Preview for admin) | `src/components/ResidentPortal.jsx` | `residents`, `invoices`, `complaints`, `notices`, `polls`, `amenities`, `amenity_bookings` | resident, tenant; preview: super_admin/secretary | **NOT TESTED** |

### 4.2 Deferred / non-menu components still under `src/components/`

| Screen | Parent route | Nav entry | Component path | Data source | Intended roles | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Gate / staff | `/legacy` tab `staff` | Not in `ROLE_NAV` | `src/components/Gate.jsx` | `visitors`, `deliveries`, `staff`, `staff_attendance`, `blacklist`, `frequent_visitors`, `security_incidents` | Deferred ops | **NOT TESTED** |
| Amenities | `/legacy` tab `amenities` | Not in `ROLE_NAV` | `src/components/Amenities.jsx` | `amenities`, `amenity_bookings` | Deferred | **NOT TESTED** |
| Volunteers | `/legacy` tab `volunteers` | Not in `ROLE_NAV` | `src/components/Volunteers.jsx` | `volunteers`, `volunteer_tasks`, `appreciations`, `campaigns`, `campaign_joins`, `residents` | Deferred | **NOT TESTED** |
| WhatsApp centre | `/legacy` tab `whatsapp` | Not in `ROLE_NAV` | `src/components/WhatsAppCentre.jsx` | `whatsapp_log`, `message_templates`, `residents`, `societies`; HTTP POST to edge `send-whatsapp` | Deferred | **NOT TESTED** / delivery **FAIL** per docs (not delivered) |
| AI assistant | `/legacy` tab `ai` | Not in `ROLE_NAV` | `src/components/AIAssistant.jsx` | Read `societies`; `fetch` to `VITE_AI_ENDPOINT` or Anthropic URL (repo also has edge `ai-proxy` for Gemini, not wired from this component) | Deferred | **NOT TESTED** |
| Login | `/legacy` | — | `src/components/Login.jsx` | Auth only | Unauthenticated | See Auth |
| Account recovery | `/reset`, `/join` | — | `src/components/AccountRecovery.jsx` | Auth + `accept_invitation` | Invitees / recovery | See Auth |
| Query status | (helper) | — | `src/components/QueryStatus.jsx` | None (loading/error UI) | — | N/A |

---

## 5. Screen counts (this inventory)

| Surface | Count basis | Count |
| --- | --- | --- |
| Auth / entry | Sign-in, Config, Reset, Join, Legacy login | 5 |
| Live Platform shell pages | home, finance, collections, expenses, funds, reconciliation, reviews, concerns, decisions, documents, units, notifications, settings (+ invite embed), history, profile, plus Setup | 16 (+ Setup) |
| Finance internal sections | Funds, Collections, Expenses, Reconciliation, Reviews, Statements | 6 (nested under Finance / focus nav) |
| DemoApp top routes | Home, Community, Finance, Concerns, More | 5 |
| Demo Community tabs | 9 | 9 |
| Demo Finance tabs | 4 | 4 |
| Demo More sections | Profile, Documents, Invitations, Assistant, Settings | 5 |
| Legacy ROLE_NAV + ResidentPortal | 11 | 11 |
| Legacy deferred screens | Gate, Amenities, Volunteers, WhatsApp, AI | 5 |
| Legacy helpers listed | Login, AccountRecovery, QueryStatus | 3 |

**Distinct user-facing screens documented above (auth + live + demo routes/tabs + legacy components, excluding QueryStatus helper): 68.**

---

## 6. Cross-cutting notes

- Live Platform and DemoApp share the `/` router; email domain selects the app.
- Hosted project may lack full foundation write RPCs; `IMPLEMENTATION_STATUS.md` states open fund / expense / concern writes still need remaining database functions — treat live write screens as **BLOCKED** until those RPCs exist on the host.
- Legacy renamed clash tables: `legacy_expenses`, `legacy_meetings`, `legacy_notifications`, `legacy_resolutions`, `legacy_bank_accounts`, `legacy_expense_categories` (`src/lib/legacyTables.js`). SABHA live screens use community_id tables of the original names.
- Edge functions present under `supabase/functions/`: `ai-proxy`, `auth-login`, `invite-member`, `send-whatsapp`, `whatsapp-bot`. Only `invite-member` is invoked from the live Platform UI; legacy WhatsApp centre calls `send-whatsapp`; `auth-login` is discontinued (410).

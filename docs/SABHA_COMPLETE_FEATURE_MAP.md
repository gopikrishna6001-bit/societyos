# SABHA complete feature map

Audited 20 November 2026 (Asia/Calcutta). This is the single map of **what should work**, **what is demo-only**, **what is blocked live**, and **what was skipped from the old SocietyOS app**.

Statuses:

| Status | Meaning |
| --- | --- |
| **WORKS (demo)** | Palm Court `@demo.sabha.app` — in-memory only; never writes the community ledger |
| **WORKS (live)** | Hosted Platform UI works for that path when Auth + memberships exist |
| **BLOCKED (live)** | UI exists; hosted write RPCs / migrations incomplete |
| **PARTIAL** | List or nav works; detail, write, or role depth incomplete |
| **SKIPPED** | Present in old SocietyOS (`/legacy` or API) and **not** rebuilt as a SABHA Platform primary feature |
| **DEFERRED** | Explicitly deferred in `PRODUCT_REQUIREMENTS.md`; still reachable under `/legacy` |

---

## 1. How the three surfaces relate

| Surface | Entry | Purpose |
| --- | --- | --- |
| **DemoApp** | Sign in as `*@demo.sabha.app` | Walkthrough with filled Palm Court fixtures |
| **Live Platform** | Any other issued email with membership | Real ledger / tickets / meetings (writes mostly blocked on host) |
| **Legacy SocietyOS** | `/legacy` | Full apartment-ops suite from the old product |

SABHA’s product scope (PRD) is **governance & transparency** (ten resident questions), not a full society-ops suite. Ops modules stay on `/legacy`.

---

## 2. DemoApp — every feature and drill-down that should work

Nav: Home · Community · Finance · Concerns · More.

### 2.1 Home → drill-downs

| Control | Opens | Status |
| --- | --- | --- |
| Collected | Finance → Maintenance · Paid | **WORKS (demo)** |
| Outstanding | Finance → Maintenance · Due | **WORKS (demo)** |
| Expenses | Finance → Transactions | **WORKS (demo)** |
| Bank balance | Finance → Overview | **WORKS (demo)** |
| Corpus / Reserve | Finance → Reports | **WORKS (demo)** |
| Collection progress CTA | Finance → Maintenance | **WORKS (demo)** |
| Income / expenditure CTA | Finance → Reports | **WORKS (demo)** |
| Recent transaction row | Finance → Transactions · expense detail | **WORKS (demo)** |
| Announcement | Community → Notices · notice detail | **WORKS (demo)** |
| Upcoming meeting | Community → Meetings · meeting detail | **WORKS (demo)** |
| Open concerns | Concerns register | **WORKS (demo)** |
| Bell / avatar | Notice list / sign out | **WORKS (demo)** |

### 2.2 Community tabs

| Tab | Features / drill-downs | Status |
| --- | --- | --- |
| Directory | Search; person → detail card | **WORKS (demo)** |
| Units | Occupancy list; CTA → Directory | **PARTIAL** (no unit-level expense/dues detail) |
| Committee | Member → detail (title, flat, focus) | **WORKS (demo)** |
| Staff | Member → detail (role) | **WORKS (demo)** (directory only; no attendance) |
| Notices | Row → body | **WORKS (demo)** |
| Meetings | Row → agenda, resolutions, actions | **WORKS (demo)** (view; no create-meeting form) |
| Polls | Vote yes (local) | **WORKS (demo)** |
| Amenities | Book clubhouse (local) | **WORKS (demo)** |
| Visitors | Expect a guest (local) | **WORKS (demo)** |

### 2.3 Finance tabs

| Tab | Features / drill-downs | Status |
| --- | --- | --- |
| Overview | Fund table; CTAs → Maintenance / Transactions | **WORKS (demo)** |
| Transactions | Search/filter; row → expense detail; approve; submit expense | **WORKS (demo)** (treasurer / committee / admin for create & approve) |
| Maintenance | Invoice list; flat → invoice detail; record demo payment | **WORKS (demo)** (resident pays own flat; others can pay any flat) |
| Reports | Charts/tables; auditor observation | **WORKS (demo)** (observation: auditor only) |

### 2.4 Concerns

| Feature | Status |
| --- | --- |
| Status filter; row → detail + replies | **WORKS (demo)** |
| Raise concern (public/private) | **WORKS (demo)** |
| Reply | **WORKS (demo)** |
| Resident sees Public + own flat only | **WORKS (demo)** |

### 2.5 More

| Section | Features | Status |
| --- | --- | --- |
| Profile | Persona + sign out | **WORKS (demo)** |
| Documents | Row → document detail; November draft summary | **WORKS (demo)** (no file download) |
| Invitations | Create local invite (platform admin only) | **WORKS (demo)** (no email) |
| Assistant | Keyword FAQ from fixtures | **WORKS (demo)** (no LLM) |
| Settings | Static Palm Court copy | **WORKS (demo)** (read-only) |

### 2.6 Demo mutations (all local; toast says ledger/email unchanged)

| Action | Who |
| --- | --- |
| Pay invoice | Own flat (any role); other flats (non-resident) |
| Approve expense / submit expense | Treasurer, committee admin, platform admin |
| Auditor observation | Resident auditor |
| Raise / reply concern | All (visibility filtered) |
| Vote / book / visitor | All |
| Invite | Platform admin |

---

## 3. Live Platform — what should work vs blocked

Primary nav: Home, Finance, Concerns, Meetings. More: Documents, Notifications, Profile, plus role tools.

| Screen | Read | Write / action | Drill-downs |
| --- | --- | --- | --- |
| Home | **WORKS (live)** empty/dashboard | N/A | Statement → Finance; concerns → Concerns; meeting → Meetings; fund/collection/expense shortcuts |
| Finance / Funds / Collections / Expenses / Reconciliation / Statements / Reviews | Lists **WORKS (live)** when tables exist | **BLOCKED (live)** on hosted RPCs | Inline expand (no separate URL detail routes) |
| Concerns | **WORKS (live)** empty | **BLOCKED (live)** create/transition | Row → updates panel |
| Meetings (Decisions) | **WORKS (live)** empty | **BLOCKED (live)** schedule/vote/propose | Inline |
| Documents | **PARTIAL** open signed URL | **BLOCKED (live)** upload | Open file |
| Units | **PARTIAL** | **BLOCKED (live)** add/link | — |
| Notifications | **PARTIAL** mark read | Email/WhatsApp **not sent** | — |
| Settings + Invite | Settings read-only | Invite **BLOCKED (live)** | — |
| Audit History / Profile | **PARTIAL** / **WORKS (live)** | Sign out works | — |
| Community setup | — | **BLOCKED (live)** if `create_community` missing | — |

Live Home balance rows (Available / Receipts / Payments) are summary only — they do not open filtered ledgers the way Demo Home metrics do.

---

## 4. Role matrix (short)

### Demo personas (`*@demo.sabha.app`)

| Role | Email | Extra |
| --- | --- | --- |
| Resident | `resident@…` | Own dues / private concerns for A-402 |
| Treasurer | `treasurer@…` | Approve + create expense; all concerns |
| Auditor | `auditor@…` | Observation on Reports |
| Committee (“Secretary”) | `committee@…` | Approve + create expense |
| Platform admin | `admin@…` | Same + Invitations |

Shared password (shown on sign-in): `Sabha-Demo-2026`. Tap a role to sign in.

### Live membership roles

| Nav | Resident | Treasurer | Auditor | Committee | Platform admin |
| --- | --- | --- | --- | --- | --- |
| Home / Finance / Concerns / Meetings / Docs / Notifications / Profile | ✓ | ✓ | ✓ | ✓ | ✓ |
| Collections / Funds | | ✓ | | ✓ | ✓ |
| Expenses / Reconciliation / Reviews / History | | ✓ | ✓ | ✓ | ✓ |
| Units / Settings | | | | ✓ | ✓ |

There is **no** live `secretary` role name — committee persona maps to `committee_admin`.

---

## 5. Features skipped from the old SocietyOS repo

Old app: `/legacy` → `src/SocietyOS.jsx` + `src/components/*` + `src/lib/supabase.js` modules.

### 5.1 Explicitly deferred (PRD) — still on `/legacy`, not SABHA primary nav

| Old feature | Legacy file | SABHA today |
| --- | --- | --- |
| Gate (visitors check-in/out, deliveries, blacklist, incidents) | `Gate.jsx` | Demo “expect a guest” only; **SKIPPED** live |
| Staff attendance / ops | `Gate.jsx` | Demo staff list only; **SKIPPED** live |
| Amenities register & bookings | `Amenities.jsx` | Demo book clubhouse only; **SKIPPED** live |
| Volunteers / campaigns / hero points | `Volunteers.jsx` | **SKIPPED** |
| WhatsApp Centre + broadcast | `WhatsAppCentre.jsx` | **SKIPPED** (future notify channel only) |
| AI Assistant (LLM) | `AIAssistant.jsx` | Demo keyword FAQ only; **SKIPPED** live LLM |

### 5.2 Ops / admin modules not rebuilt on Platform

| Old feature | Legacy location | Notes |
| --- | --- | --- |
| Super Admin (blocks, flats, roles, maintenance models, danger deletes) | `SuperAdmin.jsx` | Replaced by thin `create_community` + Units (blocked writes) |
| Maintenance tasks / assets / vendors / AMC / preventive schedule | `Maintenance.jsx` | **SKIPPED** — “Maintenance” in SABHA means **dues**, not facility work orders |
| Complaints neighbor votes / SLA / AI mediation | `Complaints.jsx` | Redesigned as Concerns (tickets); votes/SLA/AI **SKIPPED** |
| Standalone polls module (live) | `Polls.jsx` | Demo has polls; live uses **resolutions** only |
| Notice board CRUD (live) | `Notices.jsx` | Demo has notices; live uses **in-app notifications** |
| Resident portal UPI pay (hardcoded VPA) | `ResidentPortal.jsx` | **SKIPPED** — demo “pay” flag only; no UPI deep-link |
| Charge heads / bulk invoice gen / cheque bounce | `Finances.jsx` / Financials API | **SKIPPED** — ledger/demands model instead |
| Harmony score / SocietyOS health formula | Dashboard / Residents | **SKIPPED** — fund transparency dashboard instead |
| AI minutes / AI committee reports / AI mediation | Meetings / Committee / Complaints | **SKIPPED** |
| WhatsApp payment reminders | Finances | **SKIPPED** |

### 5.3 API-only in old repo (never had a full Platform screen; still not in SABHA)

| Capability | `supabase.js` module | Status |
| --- | --- | --- |
| Pets | Residents | **SKIPPED** |
| Resident documents / emergency contacts / move history | Residents | **SKIPPED** |
| Staff leaves / salary / duty log | Staff | **SKIPPED** |
| Budget lines | Financials | **SKIPPED** |
| Forum topics / replies | Community | **SKIPPED** |
| Classifieds | Community | **SKIPPED** |

### 5.4 Coverage matrix (old → new)

| Area | Old `/legacy` | DemoApp | Live Platform |
| --- | --- | --- | --- |
| Dashboard / home | Yes | Yes + drill-downs | Yes (empty/read; writes N/A) |
| Collections / dues | Yes | Yes | UI yes · writes **BLOCKED** |
| Expenses | Yes | Yes | UI yes · writes **BLOCKED** |
| Bank recon / statements / auditors | Weak / different model | Reports + observe | UI yes · writes **BLOCKED** |
| Complaints → Concerns | Yes | Yes | UI yes · writes **BLOCKED** |
| Meetings / resolutions | Meetings yes | Yes | UI yes · writes **BLOCKED** |
| Polls | Yes | Yes | Resolutions only |
| Notices | Yes | Yes | Notifications only |
| Residents / units | Yes | Directory / Units | Units (admin) · writes **BLOCKED** |
| Documents / invites | Weak | Yes | UI yes · invite **BLOCKED** |
| Gate / deliveries / blacklist | Yes | Thin visitor | **SKIPPED** |
| Staff HR / attendance | Partial | List | **SKIPPED** |
| Amenities | Yes | Thin book | **SKIPPED** |
| Volunteers / campaigns | Yes | No | **SKIPPED** |
| Forum / classifieds / pets | API only | No | **SKIPPED** |
| WhatsApp / LLM AI | Yes | FAQ only | **SKIPPED** |
| UPI resident pay | Yes (hardcoded) | Demo pay | **SKIPPED** |
| Assets / AMC / vendors | Yes | No | **SKIPPED** |
| Super Admin society builder | Yes | No | Partial setup only |

---

## 6. Intentionally not claimed as “should work” yet

1. Live write workflows on hosted Supabase (funds, expenses, collections, recon, statements, tickets, meetings, invites).
2. Outbound email / WhatsApp delivery.
3. Full end-to-end smoke of every `/legacy` module (inventoried; not retested in this pass).
4. Meeting **create** form inside DemoApp (view + vote/book exist).
5. Demo document **file download** (detail view only).
6. Unit-level dues drill-down from Units tab.

---

## 7. Related docs

- `SABHA_SCREEN_INVENTORY.md` — route/component inventory  
- `SABHA_FUNCTIONAL_AUDIT.md` — pass/fail evidence  
- `SABHA_ROLE_ACCESS_MATRIX.md` — roles  
- `SABHA_BACKEND_DEPENDENCY_MATRIX.md` — RPCs / tables  
- `SABHA_RELEASE_READINESS_REPORT.md` — go / no-go  
- `PRODUCT_REQUIREMENTS.md` — in-scope vs deferred  

---

## 8. How to walk the demo (should-work path)

1. Open the branch preview (or local Vite with env set).  
2. Tap **Resident** (or another role) — signs in with shared password.  
3. On Home, tap each metric and list row — each must open Finance/Community/Concerns detail.  
4. Finance → Maintenance → open A-402 → record demo payment.  
5. Concerns → raise → open → reply.  
6. Community → Notices / Meetings / Directory / Committee / Staff → open a row.  
7. More → Documents → open a document.  
8. Sign out and try Treasurer (expense), Auditor (observation), Admin (invitation).

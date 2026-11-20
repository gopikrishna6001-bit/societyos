# SABHA screen audit

Date: 20 November 2026 (Asia/Calcutta). Branch: `cursor/sabha-functional-audit-fe89`. Evidence: Playwright against preview `https://cursor-sabha-functional-audi.societyos.pages.dev/`, computer-use screenshots in `docs/audit-evidence/master-audit/`, Vitest.

Statuses: **DEMO WORKING** · **LIVE READ WORKING** · **LIVE WRITE BLOCKED** · **NOT IMPLEMENTED** · **NOT TESTED** · **FAIL**.

A screen that renders is not complete. A button that exists is not a workflow.

---

## 1. Routes discovered

| Route | Component | Surface |
| --- | --- | --- |
| `/` unauthenticated | `Platform` → `AuthScreen` | Auth |
| `/` demo session | `DemoApp` | Demo |
| `/` live session | `LiveCommunity` → `screens.jsx` | Live |
| `/community`, `/finance`, `/concerns`, `/more` | DemoApp nested routes | Demo |
| `/reset`, `/join` | `AccountRecovery` | Auth |
| `/legacy/*` | `SocietyOS` | Legacy |

---

## 2. Auth

| Check | Result | Evidence |
| --- | --- | --- |
| Sign-in form renders | **DEMO WORKING** / **LIVE READ WORKING** | Preview login screenshot |
| Demo role tap signs in | **DEMO WORKING** | Playwright `resident-signin` PASS |
| Network retry / clearer error | Present in code | Auth hardening commit |
| Reset password E2E mail | **NOT TESTED** | No mail capture |
| Join invitation | **LIVE WRITE BLOCKED** | Invitations RPC/edge |

---

## 3. DemoApp (Palm Court)

### Home `/`

| Check | Result |
| --- | --- |
| Metrics drill (Collected/Outstanding/Expenses/Bank) | **DEMO WORKING** (Playwright + browser) |
| Transaction → expense detail | **DEMO WORKING** |
| Announcement → notice (title/body no collision after fix) | **DEMO WORKING** after title/body break fix |
| Meeting / concerns CTAs | **DEMO WORKING** |
| Create/edit/delete | N/A (dashboard) |
| Mobile 390 | No overflow observed in prior UI audit |

### Community `/community`

| Tab | Render | Drill-down | Actions | Status |
| --- | --- | --- | --- | --- |
| Directory | Yes | Person detail | Search | **DEMO WORKING** |
| Units | Yes | CTA → Directory only | Search | Partial — no unit dues detail |
| Committee / Staff | Yes | Member detail | — | **DEMO WORKING** |
| Notices / Meetings | Yes | Full detail | — | **DEMO WORKING** |
| Polls | Yes | — | Vote yes | **DEMO WORKING** |
| Amenities / Visitors | Yes | — | Book / expect guest | **DEMO WORKING** |

Tab clicks **PASS** in Playwright; computer-use reported FAIL (interaction flake — not reproduced in Playwright).

### Finance `/finance`

| Tab | Result |
| --- | --- |
| Overview / Transactions / Maintenance / Reports | **DEMO WORKING** |
| Invoice A-402 → Record demo payment | **DEMO WORKING** (Playwright `finance-invoice-pay` PASS) |
| Expense approve / submit (treasurer+) | **DEMO WORKING** (prior role smoke; re-run recommended) |
| Auditor observation | **DEMO WORKING** (prior) |
| Export | Not implemented |
| Attachments | Fixture text only |

### Concerns `/concerns`

| Check | Result |
| --- | --- |
| List + filter + row detail | **DEMO WORKING** |
| Raise form (title/description/category/visibility) | **DEMO WORKING** after label/textarea fix; retest required on deploy |
| Reply | **DEMO WORKING** |
| SLA / assignment / reopen | **NOT IMPLEMENTED** in demo |

### More `/more`

| Section | Result |
| --- | --- |
| Profile / Settings | **DEMO WORKING** |
| Documents → detail | **DEMO WORKING** (Playwright PASS) |
| Invitations (admin) | **DEMO WORKING** local only |
| Assistant | **DEMO WORKING** keyword FAQ |

---

## 4. Live Platform (page state, not URL tabs)

| Screen | Read | Write | Drill-down | Status |
| --- | --- | --- | --- | --- |
| Home | Empty/dashboard | N/A | Nav to Finance/Concerns/Meetings | **LIVE READ WORKING** / writes N/A |
| Finance sections | Lists when tables exist | RPC writes | Inline only | **LIVE WRITE BLOCKED** |
| Concerns / Meetings / Docs / Units | UI present | RPCs | Partial | **LIVE WRITE BLOCKED** |
| Notifications | In-app | Mark read | — | Partial; outbound **FAIL** |
| Invite | UI | Edge | — | **LIVE WRITE BLOCKED** |
| Setup community | UI | `create_community` | — | **LIVE WRITE BLOCKED** if missing |

Live Home Available/Receipts/Payments rows remain summary-only (no filtered ledger drill like demo).

---

## 5. Legacy `/legacy`

| Module | In ROLE_NAV | Browser this pass | Status |
| --- | --- | --- | --- |
| Login | — | Opens; unlinked Auth shows empty state | Form **LIVE READ WORKING**; full resident link **NOT TESTED** |
| Dashboard, Complaints, Finances, Maintenance, Residents, Notices, Polls, Meetings, Committee, SuperAdmin, ResidentPortal | Yes | **NOT TESTED** end-to-end | Present in code |
| Gate, Amenities, Volunteers, WhatsApp, AI | Deferred tabs | **NOT TESTED** | Reachable via `setTab` / Dashboard shortcuts |

---

## 6. Defects logged this pass

| ID | Severity | Finding | Status |
| --- | --- | --- | --- |
| A1 | P1 | Announcement title+body collided visually | Fixed (`<br />`) |
| A2 | P2 | Concern description was single-line input | Fixed (textarea + stable ids) |
| A3 | P1 | Live writes blocked on host | Open (backend) |
| A4 | P0 | Dual shell (`/` vs `/legacy`) | Open (roadmap) |
| A5 | P2 | Computer-use false negatives on tabs/payment | Not a product defect; Playwright contradicted |

---

## 7. Definition gaps vs master brief

Not complete until also verified: pagination, sorting, attachments, activity history on every entity, multi-society isolation, and full legacy module smoke. Those remain **NOT TESTED** or **NOT IMPLEMENTED** as marked above.

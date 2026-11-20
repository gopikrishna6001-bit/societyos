# SABHA functional audit

Audited on 19 November 2026 (Asia/Calcutta). Evidence: Vitest, Playwright browser runs against local Vite with hosted Auth for `@demo.sabha.app`, screenshots in `docs/audit-evidence/`.

Statuses: **PASS** / **FAIL** / **BLOCKED** / **NOT TESTED** / **DEMO ONLY**.

## Summary

| Area | Result |
| --- | --- |
| Demo shell routes (Home, Community, Finance, Concerns, More) | **DEMO ONLY** — load, navigate, and mutate in memory |
| Demo Home drill-downs | **PASS** after remediation (metrics and lists open detail routes) |
| Live Platform reads | **PASS** empty/dashboard path on DEMO community when memberships exist |
| Live Platform writes | **BLOCKED** — foundation write RPCs not fully on hosted project |
| Legacy `/legacy` modules | **NOT TESTED** end-to-end workflows; login screen opens; emoji-icon nav remains |
| Decorative controls (pre-fix) | Home metrics were non-interactive → **FAIL**, fixed to clickable drill-downs |

## A. Screen rendering

| Screen | Loads | Mobile/desktop | Icons | Empty/error | Status |
| --- | --- | --- | --- | --- | --- |
| Auth `/` | Yes | Aligned column after login-alignment | Mark present | Auth errors visible | **PASS** |
| Demo Home | Yes | No horizontal overflow at 6 viewports | Lucide nav | N/A (fixture filled) | **DEMO ONLY** |
| Demo Community tabs | Yes | Tabs scroll; lists readable | Lucide | Search empty states present | **DEMO ONLY** |
| Demo Finance tabs | Yes | Table scrolls inside `.app-scroll` | Lucide | Filter empty states | **DEMO ONLY** |
| Demo Concerns | Yes | Detail + compose forms | Lucide | Empty filter state | **DEMO ONLY** |
| Demo More | Yes | Profile/docs/assistant/settings/invites | Lucide | N/A | **DEMO ONLY** |
| Live Home | Yes when configured | Shell exists | Text cards | “No fund balances yet” | **PASS** read / empty |
| Live Finance/Concerns/Meetings | Code present | Role-gated nav | Text | PageStatus loading/error/retry | Writes **BLOCKED** |
| `/legacy` | Login renders | Desktop-oriented | Emoji ROLE_NAV | QueryStatus on some screens | **NOT TESTED** full module set |

## B. Navigation and drill-down

| Element | Expected | Before | After | Status |
| --- | --- | --- | --- | --- |
| Home Collected | Maintenance paid list | Decorative | → Finance Maintenance `Paid` | **PASS** / **DEMO ONLY** |
| Home Outstanding | Unpaid/partial invoices | Decorative | → Finance Maintenance `Due` | **PASS** / **DEMO ONLY** |
| Home Expenses | Expense register | Decorative | → Finance Transactions | **PASS** / **DEMO ONLY** |
| Home Bank / Corpus / Reserve | Fund detail | Decorative | → Overview / Reports | **PASS** / **DEMO ONLY** |
| Recent transactions | Expense detail | Plain list | Opens Transactions + expense id | **PASS** / **DEMO ONLY** |
| Announcement / meeting | Notice / meeting detail | Plain text | → Community Notices / Meetings | **PASS** / **DEMO ONLY** |
| Invoice rows | Invoice detail + payment | Table text only | Clickable flat → detail | **PASS** / **DEMO ONLY** |
| Directory people | Person detail | Plain list | Opens person card | **PASS** / **DEMO ONLY** |
| Live Home statement/concerns/meeting | Open target screens | Mostly static copy | Buttons call `onOpen` | **PASS** (navigation only; data may be empty) |

## C. Detail pages

| Record | Demo detail | Live detail | Status |
| --- | --- | --- | --- |
| Expense | Yes — history, approve | Inline expand + RPC actions | Demo **DEMO ONLY**; live write **BLOCKED** |
| Invoice | Yes — amounts, receipt, pay | Collections demand rows | Demo **DEMO ONLY** |
| Concern | Yes — responses, reply | Ticket + updates | Demo **DEMO ONLY**; live write **BLOCKED** |
| Meeting | Yes — agenda, resolutions, actions | Meeting list + create | Demo **DEMO ONLY**; create live **BLOCKED** |
| Notice | Yes | Legacy notices only | Demo **DEMO ONLY** |
| Resident | Lightweight card (no phone) | Units list | Demo **DEMO ONLY** |

Back controls use explicit “Back to …” buttons (no breadcrumb trail component).

## D. CRUD and actions

| Feature | Create | View | Edit/Delete | Approve/Reject | Search/Filter | Export | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Demo expense | Yes (treasurer+) | Yes | No delete | Approve demo | Yes | No | **DEMO ONLY** |
| Demo invoice payment | Pay remaining | Yes | No | N/A | Due/Paid/… | No | **DEMO ONLY** |
| Demo concern | Raise public/private | Yes | Reply only | N/A | Status filter | No | **DEMO ONLY** |
| Demo poll vote | Vote yes | Yes | No | N/A | N/A | No | **DEMO ONLY** |
| Demo booking/visitor | Yes | Yes | No | N/A | N/A | No | **DEMO ONLY** |
| Demo invitation | Platform admin local list | Yes | No email | N/A | N/A | No | **DEMO ONLY** |
| Demo audit observation | Auditor note | Yes | History list | No certification publish | N/A | No | **DEMO ONLY** |
| Live ledger actions | Forms present | Lists | Reverse/pay/decide | Yes in UI | Expense filters | CSV balances | Writes **BLOCKED** |
| Legacy modules | Many forms | Yes | Varies | Varies | Tabs | No | **NOT TESTED** |

Unavailable backend operations must not fake success. Demo actions always show a **DEMO ONLY** toast stating the ledger/email/membership was not changed.

## Remediation in this pass

1. Home metrics and summary rows became clickable drill-downs.
2. Finance/Community accept `?tab=` / detail query params.
3. Invoice detail + demo payment; A-402 partial so resident payment works without breaking November totals.
4. Raise concern; treasurer expense submit; auditor observation; platform-admin demo invitation.
5. Live Home summary rows navigate to Finance / Concerns / Meetings / Funds / Collections / Expenses.

## Still incomplete

- Full live write workflows (expense publish, statement certification, invitation email) remain **BLOCKED** on hosted RPCs.
- Legacy module smoke not executed screen-by-screen.
- No universal breadcrumb component; back buttons are local.
- Meeting/resolution **create** in demo is still fixture-only (view + vote/book exist; no “create meeting” demo form).

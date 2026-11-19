# SABHA smoke test report

Executed 19 November 2026 (Asia/Calcutta) against local Vite (`127.0.0.1:5192`) with hosted Supabase Auth for `@demo.sabha.app` accounts. Demo mutations stay in `useReducer` memory. **No production ledger rows were written.**

Raw results: `docs/audit-evidence/smoke-final.json`. Screenshots: `docs/audit-evidence/w*.png`, `resident-payment.png`, `committee-private.png`, etc.

Statuses: **PASS** / **FAIL** / **BLOCKED** / **NOT TESTED** / **DEMO ONLY**.

## Workflow 1 — Resident payment

| Step | Result | Status |
| --- | --- | --- |
| Login as Resident | Home “Kabir, November is 88.9% collected.” | **DEMO ONLY** |
| Open Outstanding | Finance → Maintenance, filter `Due` | **PASS** |
| Open invoice A-402 | Invoice detail with partial balance | **PASS** |
| Record demo payment | Toast: payment recorded; ledger not updated | **DEMO ONLY** |
| Dashboard reflects demo state | Home “89.4% collected.” | **DEMO ONLY** |

## Workflow 2 — Expense approval

| Step | Result | Status |
| --- | --- | --- |
| Login as Treasurer | Demo shell | **DEMO ONLY** |
| Create demo expense | “Smoke generator service” ₹2500 submitted | **DEMO ONLY** |
| Approve | “community ledger was not changed” | **DEMO ONLY** |
| Login as Committee Admin to approve | Same approve control available; exercised as treasurer in this run | **DEMO ONLY** |
| Resident published expense visibility | Live publish path not available | **BLOCKED** (live); demo expenses visible in Transactions to all personas |

## Workflow 3 — Financial statement review

| Step | Result | Status |
| --- | --- | --- |
| Treasurer monthly statement publish | Live RPC `publish_statement` | **BLOCKED** hosted |
| Auditor observation | Reports tab → observation saved locally | **DEMO ONLY** |
| Treasurer respond / certify | No demo certification publish; live certify | **BLOCKED** / **NOT TESTED** |

## Workflow 4 — Concern management

| Step | Result | Status |
| --- | --- | --- |
| Resident raises public concern | Saved on device | **DEMO ONLY** |
| Resident raises private concern | Saved on device | **DEMO ONLY** |
| Resident cannot see B-702 private | Hidden | **PASS** |
| Committee sees private + replies | Visible; reply saved locally | **PASS** / **DEMO ONLY** |

## Workflow 5 — Meetings and resolutions

| Step | Result | Status |
| --- | --- | --- |
| Create meeting | No demo create form; fixtures only | **NOT TESTED** create |
| Open published/upcoming meeting | Agenda + Resolutions detail | **DEMO ONLY** |
| Vote on open poll | Vote yes stays on device | **DEMO ONLY** (separate Community → Polls) |
| Assign action owner / progress | Fixture action list view only | **NOT TESTED** mutate |

## Workflow 6 — Resident onboarding

| Step | Result | Status |
| --- | --- | --- |
| Platform admin demo invitation | Stored locally; no email; no membership | **DEMO ONLY** |
| Live invitation + `/join` activation | Edge `invite-member` + `accept_invitation` | **BLOCKED** |
| Cross-society denial | Not exercised on host | **NOT TESTED** |

## Automated unit coverage added/kept

- `npm test` — 35 tests passing after drill-down/payment cases (see CI on PR).
- Existing DemoApp navigation + approval tests remain green.

## Not executed as live hosted workflows

Any step requiring hosted write RPCs (collections, expense posting to journal, statement publish/certify, invitation email) is **BLOCKED**, not marked passed.

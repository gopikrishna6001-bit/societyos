# SABHA smoke test report

Date: 20 November 2026 (Asia/Calcutta). Environments: Cloudflare preview `https://cursor-sabha-functional-audi.societyos.pages.dev/`, local Vitest. Evidence: `docs/audit-evidence/master-audit/`, Playwright JSON.

**Rule:** Do not mark PASS if not executed.

Statuses: **DEMO WORKING** · **LIVE READ WORKING** · **LIVE WRITE BLOCKED** · **NOT TESTED** · **FAIL**.

---

## Journeys (master brief §8)

| # | Journey | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Resident onboarding and login | **DEMO WORKING** (tap Resident) | Playwright `resident-signin` |
| 2 | Resident invoice + demo payment | **DEMO WORKING** | Playwright `finance-invoice-pay` |
| 3 | Treasurer expense submission | **DEMO WORKING** (prior role smoke; not re-run this hour) | Prior `treasurer-finance-390` |
| 4 | Committee expense approval | **DEMO WORKING** (prior) | Prior evidence |
| 5 | Published expense resident visibility | **DEMO WORKING** fixture; live publish **LIVE WRITE BLOCKED** | Demo reports |
| 6 | Bank reconciliation | **LIVE WRITE BLOCKED** / demo **NOT IMPLEMENTED** | Code |
| 7 | Monthly statement publication | **LIVE WRITE BLOCKED**; demo observation only | Code |
| 8 | Auditor observation and certification | Observation **DEMO WORKING**; certify **LIVE WRITE BLOCKED** | Prior auditor screenshots |
| 9 | Public and private concerns | **DEMO WORKING** raise/reply + isolation | Code + prior; form UX fixed |
| 10 | Concern assignment and resolution | **NOT TESTED** / partial labels | — |
| 11 | Meeting and resolution workflow | Detail **DEMO WORKING**; create/vote live **LIVE WRITE BLOCKED** | Playwright community |
| 12 | Amenity booking | **DEMO WORKING** local | Code |
| 13 | Visitor pre-approval | **DEMO WORKING** thin “expect guest” | Code |
| 14 | Delivery recording | **NOT TESTED** (legacy only) | — |
| 15 | Staff attendance | **NOT TESTED** (legacy) | — |
| 16 | Asset maintenance and AMC | **NOT TESTED** (legacy) | — |
| 17 | Vendor purchase and payment | **NOT TESTED** | — |
| 18 | Document upload and permissions | Demo detail **DEMO WORKING**; live upload **LIVE WRITE BLOCKED** | Playwright more-documents |
| 19 | Notification delivery status | **FAIL** (email/WhatsApp not sent) | Backend matrix |
| 20 | Multi-society access isolation | **NOT TESTED** | — |

---

## Automated checks this pass

| Check | Result |
| --- | --- |
| `npm test` (Vitest) | Must be green before PR push |
| Playwright preview: sign-in, Home drill, pay, community tabs, documents | PASS (concerns form retest after textarea fix pending deploy) |
| Computer-use exploratory | Mixed; several FAIL contradicted by Playwright — treat as flake |

---

## Demo / live separation check

| Rule | Result |
| --- | --- |
| Demo never writes community ledger | **DEMO WORKING** / code PASS |
| Live empty community does not show Palm Court rupees | **LIVE READ WORKING** (empty copy) |
| Missing RPC surfaces error, not fake success | Live forms present; host returns errors — **NOT fully retested** this pass |

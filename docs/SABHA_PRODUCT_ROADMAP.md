# SABHA product roadmap

Date: 20 November 2026 (Asia/Calcutta). Goal: **one integrated community platform** upgrading SocietyOS → SABHA. No production deploy or merge is implied by this plan.

Phases are technical workstreams, not calendar estimates.

---

## Phase 0 — Safety (must before scale)

| Work | Outcome | Depends |
| --- | --- | --- |
| Deploy `auth-login` 410 (or replacement) with approval | Close unauthenticated PIN API | Function deploy |
| Apply PIN column revoke / stop selecting secrets | Reduce PIN exposure | Migration approval |
| Harden `ai-proxy` auth | Stop open proxy | Edge deploy |
| Keep demo ledger isolation | No silent production writes | Code discipline |

**Exit:** Security audit P0 items mitigated on the chosen environment.

---

## Phase 1 — Honest live Platform (finance + governance)

| Work | Outcome |
| --- | --- |
| Diff-apply missing foundation write RPCs on disposable project first | Live writes work in test |
| Prove RLS: resident / treasurer / auditor / committee | Permission matrix DB-tested |
| Storage buckets + register_document | Invoices/statements attach |
| Invitation edge + `/join` | Onboarding path |
| Feature-flag blocked actions on production host until proven | No fake success |

**Exit:** Resident dues view, treasurer expense, auditor review, statement publish work on a **non-production** project.

---

## Phase 2 — Shell unification (ops into SABHA)

Port legacy modules into SABHA navigation (reuse components first):

1. Notices + Polls (live)
2. Residents directory (family/vehicles with privacy)
3. Gate / visitors / deliveries (software only)
4. Staff attendance
5. Complaints → merge with Concerns (SLA)
6. Maintenance tasks / assets / AMC
7. Amenities bookings
8. Super Admin → Platform Admin society setup

`/legacy` remains until each module is verified, then retire.

**Exit:** Committee can run daily ops without opening `/legacy`.

---

## Phase 3 — Collections & payments

| Work | Outcome |
| --- | --- |
| Charge heads, penalties, arrears, receipts | Billing parity |
| Payment gateway + webhook recon | Online pay |
| Bank statement import UX polish | Recon usable |
| Defaulter / collection efficiency reports | MC reporting |

**Exit:** Resident can pay; treasurer can reconcile.

---

## Phase 4 — Competitive depth (selective)

| Work | Priority |
| --- | --- |
| GST/TDS reports + Tally-compatible export | P2 |
| Move-in/out + lease expiry | P2 |
| Vendor PO / quotations | P2 |
| Masked guard directory | P1 (with Gate) |
| Email + WhatsApp with delivery status | P1 |
| Role dashboard widgets | P2 |
| Optional: pets, classifieds, forum | P4 |

---

## Phase 5 — Release readiness

| Gate | Requirement |
| --- | --- |
| Security | P0 closed on host |
| Smoke | Journeys 1–20 in master brief executed or explicitly deferred |
| UI | Six viewports on primary routes |
| Data | No demo numbers on live empty communities |
| Ops | `/legacy` removed or documented temporary |
| Deploy | Explicit human approval only |

---

## Near-term implementation order (this branch / next PRs)

1. Keep demo drill-downs honest and green (done / in progress).
2. Document gaps + competitive map (this PR).
3. Next PR: live write enablement on **disposable** Supabase only.
4. Next PR: Notices/Polls/Gate entry points inside SABHA More/Community.
5. Do not replay full foundation migration on hosted Society OS.

---

## Explicit non-goals for early phases

- Hardware barrier/RFID installs
- Ad-funded marketplace
- Replacing competitor AI marketing features
- Automatic production promotion

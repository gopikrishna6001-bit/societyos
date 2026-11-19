# SABHA release readiness report

Date: 19 November 2026 (Asia/Calcutta). Branch: `cursor/sabha-functional-audit-fe89`. **No merge and no production deploy were performed for this audit.**

Companion docs: `SABHA_SCREEN_INVENTORY.md`, `SABHA_FUNCTIONAL_AUDIT.md`, `SABHA_ROLE_ACCESS_MATRIX.md`, `SABHA_SMOKE_TEST_REPORT.md`, `SABHA_UI_AUDIT.md`, `SABHA_BACKEND_DEPENDENCY_MATRIX.md`. Evidence: `docs/audit-evidence/`.

Statuses: **PASS** / **FAIL** / **BLOCKED** / **NOT TESTED** / **DEMO ONLY**.

## Counts

| Metric | Count |
| --- | --- |
| Screens / major surfaces identified (auth + live + demo tabs + legacy) | 60+ (see inventory) |
| Demo primary routes audited in browser | 5 (`/`, `/community`, `/finance`, `/concerns`, `/more`) |
| Demo screens passed for load + navigation | 5 |
| Demo screens failed load | 0 |
| Live write workflows passed on host | 0 |
| Live write workflows **BLOCKED** | Expense post, collection, statement publish/certify, invite email, ticket create |
| Legacy module workflows fully smoke-tested | 0 (**NOT TESTED**) |
| Features with drill-down after remediation (demo Home/Finance/Community) | Covered for listed metrics/lists |
| Role personas exercised in demo | 5 / 5 |
| Smoke workflows executed | 6 (results mix **DEMO ONLY** / **PASS** / **BLOCKED** / **NOT TESTED**) |
| UI viewport checks (5 routes × 6 sizes) | 30 / 30 overflow **PASS** |
| Unit tests | 35 passing (`npm test`) |
| Production build | `npm run build` required green before PR |

## Drill-down coverage

| Surface | Status |
| --- | --- |
| Demo Home metrics → Finance/Community | **PASS** |
| Demo recent transactions → expense detail | **PASS** |
| Demo invoices → detail + payment | **PASS** / **DEMO ONLY** |
| Demo concerns list → detail | **PASS** |
| Live Home summary → Finance/Concerns/Meetings | **PASS** navigation |
| Live empty fund cards → deeper ledgers | **PASS** navigation when funds exist |

## Role access results

| Role | Demo smoke | Live enforcement proven on host |
| --- | --- | --- |
| Resident | **DEMO ONLY** + private isolation **PASS** | RLS **NOT TESTED** |
| Treasurer | **DEMO ONLY** expense create/approve | Writes **BLOCKED** |
| Auditor | **DEMO ONLY** observation | Writes **BLOCKED** |
| Committee | **PASS** private visibility + reply **DEMO ONLY** | Writes **BLOCKED** |
| Platform admin | **DEMO ONLY** invitation | Edge invite **BLOCKED** |

## Smoke-test results (headline)

| Workflow | Status |
| --- | --- |
| 1 Resident payment | **DEMO ONLY** (dashboard updated locally) |
| 2 Expense approval | **DEMO ONLY** |
| 3 Statement review/certify | Observation **DEMO ONLY**; publish/certify **BLOCKED** |
| 4 Concerns | Raise/reply **DEMO ONLY**; isolation **PASS** |
| 5 Meetings | Detail **DEMO ONLY**; create **NOT TESTED** |
| 6 Onboarding | Demo invite **DEMO ONLY**; live **BLOCKED** |

## UI defects

| Item | Status |
| --- | --- |
| Horizontal overflow on demo routes | **PASS** |
| Decorative Home metrics | **FAIL** → fixed |
| Legacy emoji nav | **FAIL** vs SABHA icon standard (legacy only) |
| Auth alignment | **PASS** (prior fix on main) |

## Backend blockers

1. Hosted project missing full foundation write RPC set (`IMPLEMENTATION_STATUS.md`).
2. Invitation edge + migration completeness for production onboarding.
3. Email/WhatsApp delivery not implemented (in-app notifications only).
4. Storage redaction is a flag/second file, not an engine.
5. Demo must remain the only path that claims filled Palm Court figures without a ledger.

## Security findings

| Finding | Status |
| --- | --- |
| Demo never writes community ledger | **PASS** (code + toast evidence) |
| Resident cannot see other-flat private demo concerns | **PASS** (browser) |
| Nav hiding ≠ authorization | Documented; hosted RLS walk **NOT TESTED** |
| Phone/PIN auth-login returns 410 | Intentional retirement |
| No fake success on demo actions | **PASS** (explicit demo-only copy) |

## Fixed in this audit branch

- Demo Home/Finance/Community/Concerns/More drill-downs and missing demo workflows (pay, raise, expense, observe, invite).
- Live Home click-through to related sections.
- Resident A-402 partial invoice so payment smoke keeps November totals.
- Audit documentation set + browser evidence.

## Outstanding before production readiness

1. Apply remaining foundation RPCs to a dedicated empty project (not Yasvik); run hosted RLS suite.
2. Walk live resident/treasurer/auditor write paths on that project.
3. Complete invitation email + `/join` activation test.
4. Smoke legacy modules or formally defer them behind `/legacy` with product sign-off.
5. Replace legacy emoji nav if `/legacy` remains user-facing.
6. Do **not** treat CI green or demo screenshots as production financial readiness.

## Production readiness assessment

**Not production-ready** for live community financial operations.

**Demo-ready** for Palm Court isolated walkthroughs: navigation, drill-downs, role-differentiated visibility, and explicit non-persistence of mutations.

Use **DEMO ONLY** builds for stakeholder demos. Keep `VITE_ENABLE_DEMO_LOGIN` off in production Pages. Do not merge this audit’s conclusions into a claim of hosted ledger completeness.

# SABHA role permission audit

Date: 20 November 2026 (Asia/Calcutta). Evidence: demo UI role smoke (prior + Playwright), code gates in `Platform.jsx` `canSee`, `demo/data.js` helpers, RLS notes from `AUTH_SECURITY_ASSESSMENT.md` / foundation migration. **Hosted RLS was not re-proven with adversarial sessions in this pass.**

Statuses: **ALLOWED (demo)** · **DENIED (demo)** · **ALLOWED (live UI)** · **DENIED (live UI)** · **DB NOT TESTED** · **BLOCKED**.

---

## 1. Role identities

| Role | Demo email | Live membership role |
| --- | --- | --- |
| Resident | `resident@demo.sabha.app` | `resident` |
| Treasurer | `treasurer@demo.sabha.app` | `treasurer` |
| Resident auditor | `auditor@demo.sabha.app` | `resident_auditor` |
| Committee admin | `committee@demo.sabha.app` | `committee_admin` |
| Platform admin | `admin@demo.sabha.app` | `platform_admin` |

Legacy SocietyOS still uses `super_admin` / `president` / `secretary` / … — separate model. Unification is a roadmap item.

Hidden nav is **not** access control. Live writes must fail closed in RPCs/RLS even if UI is forced.

---

## 2. Permission matrix (product intent × current enforcement)

| Capability | Resident | Treasurer | Auditor | Committee | Platform admin | Enforcement today |
| --- | --- | --- | --- | --- | --- | --- |
| View own dues / invoices | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | Demo yes; live collections gated |
| Pay own dues | ALLOW (demo) | ALLOW | ALLOW | ALLOW | ALLOW | Demo local; live **BLOCKED** |
| View published funds / statements | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | Demo yes; live read when data |
| Create expense | DENY | ALLOW | DENY | ALLOW | ALLOW | Demo `canApprove` path; live **BLOCKED** |
| Approve expense | DENY | ALLOW | DENY | ALLOW | ALLOW | Demo; live **BLOCKED** |
| Auditor observation / certify | DENY | DENY | ALLOW (observe demo) | DENY | DENY | Certify live **BLOCKED** |
| Raise public/private concern | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | Demo; live **BLOCKED** |
| See other flats’ private concerns | DENY | ALLOW | ALLOW | ALLOW | ALLOW | Demo `visibleConcerns` **PASS** |
| Manage tickets / meetings | DENY | DENY | DENY | ALLOW | ALLOW | Live UI; writes **BLOCKED** |
| Units / settings / invite | DENY | DENY | DENY | ALLOW | ALLOW | Live UI; invite **BLOCKED** |
| Collections / funds nav | DENY | ALLOW | DENY | ALLOW | ALLOW | `canSee` |
| Expenses / recon / reviews / history | DENY | ALLOW | ALLOW | ALLOW | ALLOW | `canSee` |
| Gate / staff attendance / AMC | — | — | — | — | — | Legacy only; **NOT** in Platform matrix |
| Cross-community data | DENY | DENY | DENY | DENY | Platform scope TBD | **DB NOT TESTED** |

---

## 3. Demo isolation tests

| Test | Result |
| --- | --- |
| Resident cannot see other flats’ private concerns | **ALLOWED/DENIED as designed** (prior smoke) |
| Demo mutations do not call `supabase.from` / `rpc` for ledger | Code path **PASS** |
| Toast states ledger/email unchanged | Present |

---

## 4. Live UI vs database

| Layer | Finding |
| --- | --- |
| UI `canSee` | Hides nav for non-finance roles |
| UI finance actions | Treasurer post / auditor review buttons |
| Hosted RLS / RPC auth | Foundation designed with `private.is_member` / roles; **DB NOT TESTED** this pass on host |
| Known risk | Legacy `residents` PIN column / broad grants (see security audit) — separate from SABHA membership tables |

---

## 5. Gaps vs master brief

| Required | Status |
| --- | --- |
| Full resident family/vehicles/docs permissions | Legacy / not in Platform |
| Treasurer budgets & Tally exports | Not implemented |
| Auditor certification path live | **BLOCKED** |
| Committee staff/vendors/facilities in Platform | Legacy only |
| Platform multi-society admin | Partial setup only |
| UI + DB dual verification for every cell | Incomplete — mark **DB NOT TESTED** |

---

## 6. Recommendations

1. Treat Platform membership roles as the only live authority; map legacy roles during shell merge.
2. Add forced-route tests (deep-link page ids) that expect RPC denial for residents.
3. Do not ship live writes until hosted RLS assertions run on a disposable project.

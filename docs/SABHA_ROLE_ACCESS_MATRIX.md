# SABHA role access matrix

Audited 19 November 2026 (Asia/Calcutta). Demo personas use `@demo.sabha.app` and `DemoApp` (client isolation). Live Platform roles come from `community_memberships.role` and `canSee` in `Platform.jsx`. Hosted RLS lives in `supabase/migrations/20261118120000_platform_foundation.sql` but has **not** been fully proven on the hosted project for every write path.

Statuses: **PASS** / **FAIL** / **BLOCKED** / **NOT TESTED** / **DEMO ONLY**.

## Personas tested

| Role | Demo email | Demo person | Live role key |
| --- | --- | --- | --- |
| Resident | `resident@demo.sabha.app` | Kabir Menon, A-402 | `resident` |
| Treasurer | `treasurer@demo.sabha.app` | Leela Iyer, C-302 | `treasurer` |
| Resident auditor | `auditor@demo.sabha.app` | Sana Qureshi, B-101 | `resident_auditor` |
| Committee admin | `committee@demo.sabha.app` | Vikram Shah, B-204 | `committee_admin` |
| Platform admin | `admin@demo.sabha.app` | Ananya Rao, A-101 | `platform_admin` |

## Demo matrix (executed in browser)

| Capability | Resident | Treasurer | Auditor | Committee | Platform admin |
| --- | --- | --- | --- | --- | --- |
| Home dashboard | **DEMO ONLY** | **DEMO ONLY** | **DEMO ONLY** | **DEMO ONLY** | **DEMO ONLY** |
| Own flat invoice + demo pay | **DEMO ONLY** | N/A (collection OK) | N/A | N/A | N/A |
| Other-flat private dues | Read-only list; pay blocked for resident | Can record demo collection | View | View | View |
| Public concerns | See + raise | See + raise | See + raise | See + raise | See + raise |
| Own private concerns | See | See all | See all | See all | See all |
| Other-flat private concerns | Hidden **PASS** | Visible | Visible | Visible **PASS** | Visible |
| Approve pending expense | No | Yes **DEMO ONLY** | No | Yes | Yes |
| Submit demo expense | No | Yes | No | Yes | Yes |
| Audit observation | No | No | Yes **DEMO ONLY** | No | No |
| Demo invitation UI | No | No | No | No | Yes **DEMO ONLY** |
| Vote / book / visitor | Yes | Yes | Yes | Yes | Yes |

Hiding a nav item is **not** claimed as server enforcement for demo (there is no server). Live Platform must rely on RLS + `private.has_role` inside security-definer RPCs.

## Live Platform nav visibility (`canSee`)

| Nav | Resident | Treasurer | Auditor | Committee | Platform admin |
| --- | --- | --- | --- | --- | --- |
| Home, Finance, Concerns, Meetings, Documents, Notifications, Profile | Yes | Yes | Yes | Yes | Yes |
| Collections, Funds | No | Yes | No | Yes | Yes |
| Expenses, Reconciliation, Reviews, Audit History | No | Yes | Yes | Yes | Yes |
| Residents and Units, Settings | No | No | No | Yes | Yes |

## Live feature expectations vs evidence

### Resident

| Requirement | Evidence | Status |
| --- | --- | --- |
| Home / profile / own unit | Home + Profile screens; units via occupancy | Read **PASS** empty; occupancy linking **BLOCKED** write |
| Own invoices / payments / receipts | Collections UI when periods exist | **BLOCKED** write / **NOT TESTED** with real demands |
| Published statements / redacted docs | Statements + Documents | Publish **BLOCKED**; storage redaction is a second file flag |
| Community directory / committee / notices / meetings / polls | Decisions + Documents; directory is committee Units | Partial — no full resident directory on live shell |
| Public + own private concerns | ConcernsScreen + RLS | UI **PASS**; create **BLOCKED** hosted |
| Cannot see others’ private dues/concerns | RLS in migration | **NOT TESTED** on hosted RLS run |

### Treasurer

| Requirement | Evidence | Status |
| --- | --- | --- |
| Billing, collections, expenses, journals, banks, statements | FinanceScreen sections + RPCs | UI present; writes **BLOCKED** hosted |
| Approvals within limits | `decide_expense` / settings thresholds | **BLOCKED** / **NOT TESTED** |
| Exports | CSV of balances | Client **PASS** |
| Cannot silently skip auditor rules | Migration review findings fixed in SQL | SQL **PASS** locally historically; hosted **NOT TESTED** |

### Resident auditor

| Requirement | Evidence | Status |
| --- | --- | --- |
| Statements, reviews, observations | Finance Reviews/Statements; `review_statement` | UI present; writes **BLOCKED** |
| Cannot modify ledger amounts | `review_subject` does not change amounts | Code **PASS**; hosted **NOT TESTED** |

### Committee admin

| Requirement | Evidence | Status |
| --- | --- | --- |
| Residents/units, notices, meetings, polls, concerns, docs | Units, Decisions, Concerns, Documents | UI present; writes **BLOCKED** |
| Vendors/assets/AMC/volunteers | Legacy modules only (`/legacy`) | **NOT TESTED** on SABHA shell |

### Platform admin

| Requirement | Evidence | Status |
| --- | --- | --- |
| Society/membership/roles/invites | Settings + InviteResident + `grant_role` / invitations | Invite edge **BLOCKED** without secrets/migration completeness |
| Governance/financial policies | Settings read-only display | Change path not on screen |
| Cross-society isolation | Membership query scoped; RPCs take `p_community` | **NOT TESTED** cross-community attack on host |

## Enforcement notes

1. Demo access control is client-side (`visibleConcerns`, `canApprove`, `canReview`).
2. Live nav hiding is client-side; server must deny via RLS/RPC — full hosted RLS walk remains outstanding per `IMPLEMENTATION_STATUS.md`.
3. Legacy `/legacy` uses a different role model (`super_admin`, `president`, …) from `residents` / `committee_members`, not the SABHA membership roles.

# SABHA delivery status

Single status file for architecture recovery and MVP delivery.  
Branch: `cursor/sabha-product-delivery-fe89`  
Updated: 20 November 2026 (Asia/Calcutta)

## Current milestone

**Milestone 4 — Maintenance billing and payment** (disposable DB journey green)  
Architecture shell/demo separation done; preview verified.

## Preview / production

| Surface | URL | Status |
| --- | --- | --- |
| Branch preview | https://cursor-sabha-product-deliver.societyos.pages.dev | **Verified** — commit `07e0b2a` deployed; login UI readable; 0 console errors ([Browser-test SABHA preview](bc-d5454e17-59c9-5943-9227-fa169464b6e3)) |
| Commit preview | https://20156864.societyos.pages.dev | Same deploy as branch tip |
| Production | https://societyos.pages.dev | Not promoted from this branch |
| Hosted Supabase | `wzchqxwwezklxsxmjvyt` | Reachable; delivery migrations **not applied** without authorization |

### Preview failure root cause (resolved)

1. Assets/Auth were fine; shell used light text on white panels → looked blank.
2. Fixed in `07e0b2a` (ivory/ink shell + dark controls). Browser recheck: sign-in form visible, no JS errors.
3. Palm Court DemoApp remains isolated at `/demo`.

## Stage 0 recovery inventory (concise)

| Area | Classification | Notes |
| --- | --- | --- |
| Auth email/password (Platform) | Working | Supabase Auth; demo password panel gated by `VITE_ENABLE_DEMO_LOGIN` |
| Legacy phone/PIN (`/legacy`) | Partial / secure-path retired | auth-login returns 410 for PIN; do not reintroduce |
| Society membership context | Working | `community_memberships` → Shell |
| Platform Home / action centre | Partial → repairing | Drill-downs + register RPCs; contrast fix |
| Payment proofs + treasurer verify | Working (code) | Needs hosted migration apply |
| Expenses / concerns / meetings / notices | Partial–Working | Platform RPCs exist; legacy screens still available at `/legacy` |
| Visitors / amenities / staff / assets | Partial | Platform tables+UI on branch; hosted migrate pending |
| Palm Court DemoApp | Demo-only | Isolated `/demo` when flag on |
| Double financial models | Compatibility | Platform ledger authoritative for new writes; `legacy_*` for SocietyOS history |
| PR #9 security | Code on delivery branch | Hosted grants not re-verified this session |

## Completed on this branch

- Demo/prod separation (`/` live, `/demo` fixture).
- Payment proof workflow + action centre.
- Notices, visitors, amenities, staff, assets, auditor observations, settings, Razorpay boundary, assistant facts.
- Collection register + ledger transaction RPCs/UI.
- Shell contrast / readable controls (this commit).

## Remaining (ordered)

1. Redeploy preview and smoke-test sign-in visually.
2. Authorize hosted migrations through `20261120210000_…`.
3. End-to-end payment journey on a disposable society.
4. Expense → approve → pay → publish.
5. Concern full lifecycle.
6. Notices/meetings governance polish.
7. PR #9 hosted grant verification.
8. Production promote only with authorization.

## Tests (local)

- `npm test` — expect green after contrast commit.
- `npm run test:db` — disposable Postgres.
- `npm run build` — required before push.

## Payment journey evidence (disposable DB)

`supabase/tests/payment_proofs.sql` asserts: invoice demand → resident `submit_payment_proof` (stays pending) → resident blocked from verify → treasurer `review_payment_proof` → receipt + journal entry → `period_collection_register` + resident `my_unit_demands` updated.

## Exact next implementation task

Expense workflow E2E (create → approve → pay → ledger) on disposable DB; then concerns lifecycle. Hosted migration apply still needs authorization.

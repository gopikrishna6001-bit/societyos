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
| Production | https://societyos.pages.dev | Frontend still on `main` until PR #10 merges. Hosted DB now has delivery RPCs (`action_centre`, etc.). iPhone home-screen apps keep the old cached icon until removed and re-added after UI promote. |
| Hosted Supabase | `wzchqxwwezklxsxmjvyt` | Delivery migrations applied 21 Nov 2026 (Asia/Calcutta): payment proofs, action centre, notices/visitors/amenities, governance ops, period registers, my_memberships |

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

## Membership load hang (user report)

Symptom: stuck on “Loading your communities…”.
Fix on branch: `my_memberships` RPC + 10s timeout + Retry/Sign out + empty membership → setup (demo users get `/demo` link). Nested `communities(name)` embed removed from the critical path.

## Why societyos.pages.dev looks unchanged

Cloudflare production tracks **`main`**. All SABHA delivery work is on PR branch `cursor/sabha-product-delivery-fe89` and only appears on:

- https://cursor-sabha-product-deliver.societyos.pages.dev

Hosted migrations are applied. Until PR #10 is merged (or production is pointed at this branch), production Pages will not show the polished shell — only the older `main` frontend.

**iPhone shortcut icon:** iOS caches PWA icons aggressively. After production is updated, delete the home-screen icon and Add to Home Screen again. Cache-bust query `?v=20261121` is on icons/manifest for the next deploy.

## Hosted schema + DEMO seed (21 Nov 2026, Asia/Calcutta)

- Applied missing foundation write RPCs (`open_fund`, `create_ticket`, `create_meeting`, `collection_summary`, `record_collection`, …).
- Seeded DEMO · Palm Court (`20261121123000_seed_demo_palm_court.sql`): funds, bank, Nov dues (101 outstanding / 102 paid), expenses, concerns, meetings, resolution, notice, amenity booking, visitor pass, staff, asset.

## Exact next implementation task

Merge PR #10 so production Pages picks up the polished `app-shell` UI. Refresh the live site and sign in with demo roles to exercise seeded records.

# SABHA delivery status

Single status file for architecture recovery and MVP delivery.  
Branch: `cursor/sabha-product-delivery-fe89`  
Updated: 20 November 2026 (Asia/Calcutta)

## Current milestone

**Milestone 1 — Architecture stabilization** (in progress)  
Next product workflow after shell is usable: **maintenance billing and payment** (Milestone 4).

## Preview / production

| Surface | URL | Status |
| --- | --- | --- |
| Branch preview | https://cursor-sabha-product-deliver.societyos.pages.dev | Cloudflare deploy OK; shell contrast fixed on this branch (awaiting redeploy) |
| Commit preview | https://05793404.societyos.pages.dev | Prior commit until Pages rebuilds |
| Production | https://societyos.pages.dev | Not promoted from this branch |
| Hosted Supabase | `wzchqxwwezklxsxmjvyt` | Reachable; delivery migrations **not applied** without authorization |

### Preview failure root cause (diagnosed)

1. HTML/JS assets returned HTTP 200; Supabase URL + anon key are embedded; Auth settings respond.
2. Live Platform shell used `bg-slate-950 text-slate-100` with `bg-white` panels and `control` inputs also `text-slate-100` → **near-invisible UI** (looked “not working”).
3. Palm Court DemoApp had been the default for `@demo.sabha.app` (fixed earlier: live `/`, demo only `/demo`).

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

## Exact next implementation task

After contrast fix lands on Pages: sign in on preview with a real (non-demo-fixture) community account, confirm Action centre is readable, then run payment journey against disposable DB / authorized staging society.

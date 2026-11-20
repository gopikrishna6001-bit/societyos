# SABHA release evidence

Branch: `cursor/sabha-product-delivery-fe89`  
PR: https://github.com/gopikrishna6001-bit/societyos/pull/10  
Date: 20 November 2026 (Asia/Calcutta)

## What shipped (code)

Unified SABHA Platform at `/` with operational workflows:

| Area | Status |
| --- | --- |
| Payment proofs (no auto-ledger) + treasurer verify | Done |
| Action centre | Done |
| Notices, visitors, amenities | Done |
| Staff attendance, asset register | Done |
| Auditor observations raise/respond/resolve | Done |
| Society settings + auditor seats | Done |
| Razorpay config boundary (no secret storage) | Done |
| Permission-bound society assistant facts | Done |
| Phase 0 security (PR #9 lineage on branch) | In code; **not applied to hosted DB** |

## Quality gates run on this branch

- `npm test` — 38 passed
- `npm run test:db` — foundation + invitations + payment proofs + governance ops
- `npm run build` — succeeded

## Migrations to apply (hosted, in order) — needs production authorization

1. `20261120163000_phase0_security.sql`
2. `20261120170000_whatsapp_dispatch_hardening.sql`
3. `20261120180000_payment_proofs_action_centre.sql`
4. `20261120190000_notices_visitors_amenities.sql`
5. `20261120200000_governance_ops_assistant.sql`

Edge Functions (after authorization): `ai-proxy`, `send-whatsapp`, any payment webhook when credentials exist.

## Production / preview status

| Surface | Status |
| --- | --- |
| Local production build | Verified |
| Local Vite preview (`127.0.0.1:4173`) | Available in agent environment |
| Cloudflare Pages production | Existing SocietyOS/SABHA deploy path; **not redeployed by this agent** without authorization |
| Hosted Supabase migrations | **Not applied** — requires explicit production authorization |

## Single external actions still required

1. Authorize and apply the five migrations above to project `wzchqxwwezklxsxmjvyt` (or current hosted project).
2. Deploy updated Edge Functions and set secrets (`WA_DISPATCH_SECRET`, `GEMINI_API_KEY`, Razorpay webhook secret when going live).
3. Confirm Cloudflare Pages deploy of this branch / merge to production base.
4. Run production smoke of Journeys 1–8 on a non-production test society after migrate.

## Deferred (post-release backlog)

- Live Razorpay checkout + webhook posting (credentials)
- Generative AI with PII under approved DPA (record-facts assistant ships)
- Deep vendor quote/PO and PM work-order automation
- Utility sensor integrations (manual entry path only)

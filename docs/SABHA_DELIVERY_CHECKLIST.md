# SABHA delivery checklist

Single consolidated checklist. Updated as work lands. Branch: `cursor/sabha-product-delivery-fe89`.

## Stage A — Stabilize and secure

- [x] Phase 0 security on branch (auth-login 410, ai-proxy JWT, WA dispatch hardening, table-level residents SELECT fix)
- [x] Disposable DB privilege + service_role claim tests
- [ ] Hosted apply of Phase 0 migrations + Edge deploys (**requires production authorization**)
- [x] Primary product surface is SABHA Platform at `/` (legacy retained at `/legacy`)

## Stage B — Core transactions

- [x] Resident sees unit dues (RPC + Home/Finance)
- [x] Resident submits payment proof without auto-posting ledger
- [x] Treasurer verifies/rejects proof; approve posts collection via existing `record_collection`
- [x] Concerns raise/track/transition (existing platform tickets)
- [x] Expenses create/decide/pay (existing platform RPCs)
- [x] Documents register + signed URL (existing)
- [x] Notices publish in Platform (`community_notices` + `publish_community_notice`)
- [x] Unified Action Centre (Home)

## Stage C — Operations

- [x] Platform visitor passes + check-in/out (Gate remains available at `/legacy`)
- [x] Platform amenity catalogue + booking RPC
- [x] Staff directory + attendance in Platform
- [x] Community assets register in Platform (vendors/PM deep schedules deferred)

## Stage D — Governance

- [x] Meetings / resolutions / votes (existing platform Decisions)
- [x] Auditor statement review/publish (existing)
- [x] Auditor observation workflow table + UI
- [x] Configurable auditor seats via `update_community_settings`

## Stage E — Modern capabilities

- [x] Society configuration UI (`update_community_settings` + audit log)
- [x] Razorpay gateway boundary (`payment_gateway_settings`; no secret key storage)
- [x] Permission-bound society assistant (`society_assistant_facts`)
- [x] Release evidence doc (`docs/SABHA_RELEASE_EVIDENCE.md`); local preview verified

## Release gates

- [x] `npm test` green on delivery branch
- [x] `npm run test:db` / phase0 disposable green
- [x] `npm run build` green
- [x] Local preview (`npm run preview` → HTTP 200 on `/`)
- [ ] Production deploy authorized and smoke-tested

## Deferred / external

- Live Razorpay webhook + secret key (needs credentials)
- Third-party generative AI with society PII (needs approved data-handling config; record facts path ships)
- Hosted Phase 0 + delivery migrations apply (**production authorization**)
- Deep vendor/PM work-order automation beyond asset register

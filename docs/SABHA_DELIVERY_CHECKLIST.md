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
- [ ] Notices publish in Platform (legacy Notices still at `/legacy`)
- [x] Unified Action Centre (Home)

## Stage C — Operations

- [ ] Platform visitor/guard workspace (Gate remains `/legacy`)
- [ ] Platform amenity booking (ResidentPortal note still points to secretary)
- [ ] Staff attendance in Platform
- [ ] Assets / vendors / PM schedules in Platform

## Stage D — Governance

- [x] Meetings / resolutions / votes (existing platform Decisions)
- [x] Auditor statement review/publish (existing)
- [ ] Auditor observation workflow table + UI
- [ ] Configurable election seats > 1

## Stage E — Modern capabilities

- [ ] Society configuration UI beyond create_community limits
- [ ] Razorpay gateway (boundary only until credentials)
- [ ] AI assistant permission-bound live queries
- [ ] Preview + production release evidence

## Release gates

- [ ] `npm test` green on delivery branch
- [ ] `npm run test:db` / phase0 disposable green
- [ ] `npm run build` green
- [ ] Preview URL verified
- [ ] Production deploy authorized and smoke-tested

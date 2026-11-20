# SABHA gap analysis

Date: 20 November 2026 (Asia/Calcutta). Inputs: verified demo/live code, competitive benchmark, prior audits, PR #3 (merged) and PR #8 (open).

**Scope correction:** Earlier docs treated SocietyOS ops modules as permanently deferred. Product direction is now **one complete community platform**. Gaps below treat ops modules as **required roadmap**, not voluntary exclusions.

Status vocabulary: Complete · Partially complete · UI only · Demo only · Live read only · Live write blocked · Not implemented · Not tested · Legacy only.

---

## 1. Executive gaps

| Gap | Why it matters | Priority | Effort |
| --- | --- | --- | --- |
| Dual shell (`/` Platform vs `/legacy`) | Residents/committee must not learn two products | P0 | Large |
| Live write RPCs missing on host | UI implies product that cannot mutate | P0 | Medium (ops) + Large (verify) |
| Auth/PIN/edge security not fully deployed | Account takeover / PIN exposure risk | P0 | Medium |
| No payment gateway | Competitors bill+collect; demo-only pay | P1 | Large |
| Gate/visitor not in SABHA shell | Core Indian RWA expectation | P1 | Large |
| Helpdesk SLA/assignment incomplete | Ops load | P1 | Medium |
| GST/TDS/Tally depth | MC/auditor expectation | P2 | Large |
| Hardware (RFID/barriers) | Optional | P3 | Large + vendor |

---

## 2. Domain scoring (A–L)

### A. Home / dashboard

| Item | Status | Priority | Value | Effort | Dependencies |
| --- | --- | --- | --- | --- | --- |
| Demo metric drill-downs | Demo only (working) | — | High | Done | — |
| Live role dashboards / widgets | Live read only / empty | P1 | High | Medium | `resident_dashboard` |
| Security / ops alerts on Home | Not implemented in Platform | P2 | Med | Medium | Gate data |
| Configurable widgets | Not implemented | P3 | Med | Large | Settings |

### B. Residents / property

| Item | Status | Priority | Effort | Dependencies |
| --- | --- | --- | --- | --- |
| Units hierarchy | Live write blocked; demo units list | P1 | Medium | RPCs |
| Owners/tenants/families/vehicles | Legacy only / API | P1 | Large | Schema unify |
| Invitations / onboarding | Demo local; live blocked | P1 | Medium | Edge + migration |
| Move-in/out / lease alerts | Not implemented | P2 | Large | Docs storage |
| Parking allocation | Not implemented | P2 | Medium | Units |

### C. Finance / accounting

| Item | Status | Priority | Effort | Dependencies |
| --- | --- | --- | --- | --- |
| Double-entry / funds / statements design | Partially complete (writes blocked) | P0 | Medium apply | Hosted RPCs |
| Billing charge heads / penalties / advances | Legacy / not in Platform | P1 | Large | Billing engine |
| Online payments | Not implemented | P1 | Large | Gateway |
| Bank recon | UI only / blocked | P1 | Medium | CSV import RPC |
| Budget vs actual / TB / daybook | Not implemented | P2 | Large | COA |
| GST/TDS / Tally export | Not implemented | P2 | Large | Tax rules |

### D. Transparency / governance

| Item | Status | Priority | Effort |
| --- | --- | --- | --- |
| Published expenses / redacted invoices | Designed; storage blocked | P1 | Medium |
| Auditor election / certification | Designed; blocked | P1 | Medium |
| Meetings / resolutions / quorum | Demo view; live blocked | P1 | Medium |
| Immutable audit history | Partial | P1 | Small–Medium |

### E. Visitor / security

| Item | Status | Priority | Effort |
| --- | --- | --- | --- |
| Pre-approve / logs / deliveries / blacklist | Legacy only (+ demo thin) | P1 | Large to port |
| Guard dashboard | Legacy | P1 | Large |
| Hardware access control | Not implemented | P3 | External |

### F. Helpdesk

| Item | Status | Priority | Effort |
| --- | --- | --- | --- |
| Public/private concerns | Demo working; live blocked | P1 | Medium |
| SLA / escalation / feedback | Not implemented | P1 | Medium |
| Assignment to staff/vendor | Legacy complaints partial | P1 | Medium |

### G–H. Facilities / staff / vendors

| Item | Status | Priority | Effort |
| --- | --- | --- | --- |
| Amenities bookings | Demo thin; legacy full | P2 | Medium |
| Assets / AMC | Legacy only | P2 | Large |
| Staff attendance | Legacy partial | P1 | Medium |
| Vendor PO / quotations | Not implemented | P2 | Large |

### I–J. Communication / engagement

| Item | Status | Priority | Effort |
| --- | --- | --- | --- |
| Notices / polls | Demo + legacy; live weak | P1 | Medium |
| Email/WhatsApp delivery | Fail / not sent | P1 | Medium + vendor |
| Classifieds / pets / marketplace | API or none | P4 | Medium |

### K–L. Documents / platform admin

| Item | Status | Priority | Effort |
| --- | --- | --- | --- |
| Versioned docs + redaction | Partial / blocked | P1 | Medium |
| Multi-society admin | Partial | P2 | Large |
| Feature flags / policy config | Partial settings | P2 | Medium |

---

## 3. Broken / incomplete vs competitors

| Competitor strength | SABHA gap |
| --- | --- |
| One resident app for pay+gate+helpdesk | Split + blocked writes |
| Payment + auto recon | Demo pay only |
| Guard privacy (masked numbers) | Not implemented |
| Deep GST/Tally | Not implemented |
| Hardware gate | Out of scope until software |

| SABHA potential strength | Gap to close |
| --- | --- |
| Auditor certification + published transparency | Live write path + storage |
| Private concerns model | Live RLS proof |
| Demo honesty (no fake ledger writes) | Keep while unifying ops |

---

## 4. Unnecessary / deprioritise

- COVID safety modules (competitor legacy).
- Marketplace/eCommerce infra (ad conflict risk).
- AI marketing features before P0 security and shell merge.
- RFID/tanker monitors until core ops ship.

---

## 5. Scoring method used

Priority P0–P4 as defined in the master brief. Effort Small/Medium/Large relative to current codebase (reuse legacy screens inside SABHA shell preferred over rewrite).

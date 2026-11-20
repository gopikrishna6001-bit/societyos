# SABHA complete feature map

Updated: 20 November 2026 (Asia/Calcutta). Branch: `cursor/sabha-functional-audit-fe89`.

This inventory is the **starting map**, not proof that a feature works. Verification lives in `SABHA_SCREEN_AUDIT.md`, `SABHA_SMOKE_TEST_REPORT.md`, and `SABHA_ROLE_PERMISSION_AUDIT.md`.

**Product direction:** SABHA is one integrated community platform. SocietyOS operational modules are **in scope** for the roadmap. They must not remain permanently stranded on `/legacy`.

Statuses: **DEMO WORKING** · **LIVE READ WORKING** · **LIVE WRITE BLOCKED** · **LEGACY ONLY** · **NOT IMPLEMENTED** · **NOT TESTED**.

---

## 1. Surfaces

| Surface | Entry | Role |
| --- | --- | --- |
| DemoApp | `*@demo.sabha.app` | Isolated Palm Court fixtures (`useReducer`) |
| Live Platform | Issued email + membership | SABHA ledger / tickets / meetings |
| Legacy SocietyOS | `/legacy` | Full ops suite until ported into SABHA shell |

---

## 2. Domain map (A–L)

### A. Home and dashboard

| Feature | Demo | Live | Legacy | Target |
| --- | --- | --- | --- | --- |
| Community overview metrics | DEMO WORKING + drill-downs | LIVE READ WORKING (empty) | Dashboard | Keep + enrich ops alerts |
| Outstanding / expenses / bank / corpus | DEMO WORKING | Summary only | Finances widgets | Unified drills |
| Open concerns / meetings / notices | DEMO WORKING | Nav only | Yes | Role widgets |
| Security alerts | NOT IMPLEMENTED | NOT IMPLEMENTED | Gate shortcuts | P2 |
| Configurable widgets | NOT IMPLEMENTED | NOT IMPLEMENTED | Partial | P3 |

### B. Residents and property

| Feature | Demo | Live | Legacy | Target |
| --- | --- | --- | --- | --- |
| Directory / units | DEMO WORKING | Units LIVE WRITE BLOCKED | Residents | Merge |
| Families / vehicles | NOT IMPLEMENTED | NOT IMPLEMENTED | Yes | Port |
| Invitations / onboarding | DEMO WORKING (local) | LIVE WRITE BLOCKED | — | P1 |
| Move-in/out / leases | NOT IMPLEMENTED | NOT IMPLEMENTED | API/hooks | P2 |
| Parking | NOT IMPLEMENTED | NOT IMPLEMENTED | Partial | P2 |

### C. Finance and accounting

| Feature | Demo | Live | Legacy | Target |
| --- | --- | --- | --- | --- |
| Maintenance invoices / pay | DEMO WORKING | Collections UI BLOCKED | Finances | Gateway P1 |
| Expenses + approval | DEMO WORKING | LIVE WRITE BLOCKED | legacy_expenses | Unify |
| Funds / journal / reverse | Reports demo | LIVE WRITE BLOCKED | Weak | Differentiator |
| Bank reconciliation | NOT IMPLEMENTED demo | LIVE WRITE BLOCKED | — | P1 |
| Statements / publish | Observation demo | LIVE WRITE BLOCKED | — | P1 |
| Charge heads / penalties / GST / Tally | NOT IMPLEMENTED | NOT IMPLEMENTED | Partial charge heads | P1–P2 |
| Budgets | NOT IMPLEMENTED | NOT IMPLEMENTED | API only | P2 |

### D. Transparency and governance

| Feature | Demo | Live | Notes |
| --- | --- | --- | --- |
| Published visibility / auditor observe | DEMO WORKING | LIVE WRITE BLOCKED | Keep as differentiator |
| Meetings / resolutions / votes | View + poll vote | LIVE WRITE BLOCKED | |
| Quorum / election certify | Fixture | Designed / BLOCKED | |
| Audit history | Observation list | History screen NOT TESTED | |

### E. Visitor and security

| Feature | Demo | Live | Legacy |
| --- | --- | --- | --- |
| Expect guest | DEMO WORKING thin | NOT IMPLEMENTED | Gate full |
| Deliveries / blacklist / incidents | NOT IMPLEMENTED | NOT IMPLEMENTED | Yes |
| Guard dashboard | NOT IMPLEMENTED | NOT IMPLEMENTED | Yes |
| Hardware integrations | — | — | Optional P3 |

### F. Helpdesk / concerns

| Feature | Demo | Live | Legacy |
| --- | --- | --- | --- |
| Public/private raise/reply | DEMO WORKING | LIVE WRITE BLOCKED | Complaints |
| SLA / escalation / feedback | NOT IMPLEMENTED | NOT IMPLEMENTED | Partial SLA view |
| Assignment | Label only | Transition BLOCKED | Assign UI |

### G. Facilities / amenities / assets

| Feature | Demo | Live | Legacy |
| --- | --- | --- | --- |
| Book amenity | DEMO WORKING thin | NOT IMPLEMENTED | Amenities |
| Assets / AMC / vendors / PM | NOT IMPLEMENTED | NOT IMPLEMENTED | Maintenance |

### H. Staff and vendors

| Feature | Demo | Live | Legacy |
| --- | --- | --- | --- |
| Staff directory | DEMO WORKING | NOT IMPLEMENTED | Gate/staff |
| Attendance / shifts | NOT IMPLEMENTED | NOT IMPLEMENTED | Attendance UI |
| Vendor PO / contracts | NOT IMPLEMENTED | NOT IMPLEMENTED | Vendors partial |

### I. Communication

| Feature | Demo | Live | Legacy |
| --- | --- | --- | --- |
| Notices / polls | DEMO WORKING | Notifications only | Notices/Polls |
| Meetings minutes | View | BLOCKED | Meetings + AI draft |
| Email / WhatsApp delivery | NOT IMPLEMENTED | NOT sent | WhatsApp centre FAIL delivery |
| Volunteers / campaigns | NOT IMPLEMENTED | NOT IMPLEMENTED | Volunteers |

### J. Community engagement (optional)

| Feature | Status | Priority |
| --- | --- | --- |
| Classifieds / forum / pets | API only or none | P4 |

### K. Documents / compliance

| Feature | Demo | Live |
| --- | --- | --- |
| Document list/detail | DEMO WORKING (no download) | Storage LIVE WRITE BLOCKED |
| Redaction engine | NOT IMPLEMENTED | Flag/second file only |

### L. Platform administration

| Feature | Demo | Live | Legacy |
| --- | --- | --- | --- |
| Community settings | Static | Read-only | Super Admin |
| Multi-society | Persona only | Partial setup | Societies |
| Roles / policies | Fixture | Membership roles | Roles UI |

---

## 3. Demo drill-downs that must keep working

| From | To |
| --- | --- |
| Home Collected / Outstanding | Finance Maintenance Paid / Due |
| Home Expenses / Bank / Corpus / Reserve | Transactions / Overview / Reports |
| Home transaction row | Expense detail |
| Home announcement / meeting | Notice / meeting detail |
| Invoice / expense / concern / person / document / committee / staff rows | Detail views |

---

## 4. Related docs

Competitive: `SABHA_COMPETITIVE_BENCHMARK.md`  
Screens: `SABHA_SCREEN_AUDIT.md`  
Roles: `SABHA_ROLE_PERMISSION_AUDIT.md`  
Gaps: `SABHA_GAP_ANALYSIS.md`  
Roadmap: `SABHA_PRODUCT_ROADMAP.md`  
Security: `SABHA_SECURITY_AUDIT.md`  
Backend: `SABHA_BACKEND_DEPENDENCY_MATRIX.md`  
Release: `SABHA_RELEASE_READINESS_REPORT.md`

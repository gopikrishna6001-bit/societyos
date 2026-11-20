# SABHA competitive benchmark

Date: 20 November 2026 (Asia/Calcutta). Sources are **official product/marketing pages** only. Claims are not independently verified as shipped product behaviour.

| Platform | Primary sources |
| --- | --- |
| MyGate | https://mygate.com/ · https://mygate.com/offerings/ |
| ADDA | https://ind.adda.io/ · https://ind.adda.io/pricing |
| NoBrokerHood | https://www.nobrokerhood.com/solutions/nobrokerhood-features |
| ApnaComplex (Anacity) | https://www.apnacomplex.com/ · https://www.apnacomplex.com/pricing |

**Relevance rule:** SABHA’s end goal is **one complete community platform** (SocietyOS ops + SABHA transparency). Features are scored for resident value, ops value, differentiation, cost, security, and maintenance — not copied blindly.

Status codes for SABHA today: **Demo only** · **Live read** · **Live write blocked** · **Legacy only (`/legacy`)** · **API only** · **Not implemented** · **Partial**.

---

## 1. Category matrix

| Category | MyGate | ADDA | NoBrokerHood | ApnaComplex | SABHA today | Relevant? | Priority | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Resident app (dues, visitors, bookings, complaints) | Yes | Yes | Yes | Yes | Demo + live shell (writes blocked) | Yes | P1 | Must feel one app, not two shells |
| Society admin ERP | Yes | Yes (tiered) | Yes | Yes | Split: Platform + `/legacy` | Yes | P0 | Unify into SABHA shell |
| Accounting / chart of accounts / journals | Deep (GST/TDS/Tally) | ADDA Books | Double-entry + GST/TDS | GST billing | Live ledger model (writes blocked); legacy finances separate | Yes | P1 | Differentiator if transparency + books |
| Maintenance billing | Area/fixed, penalties, advances | Yes | 350+ formulas claimed | Automated billing | Demo invoices; live collections UI blocked | Yes | P1 | |
| Online payments / gateway | Yes + auto recon | Yes | Yes | Zero convenience claim | Demo pay only; no gateway | Yes | P1 | Needs provider + recon |
| Bank reconciliation | Auto + manual | Auditor-focused | Yes | Auto recon claim | Live UI blocked | Yes | P1 | SABHA already designed this |
| Financial reporting (P&L, BS, TB) | Yes | 150+ reports claim | Yes | Accounting module | Demo reports; live statements blocked | Yes | P1 | |
| Resident financial transparency | Marketing weaker | Privacy-first messaging | Ops-focused | Accounting clarity | **Strong demo + designed live** | Yes | P0 | Keep as SABHA differentiator |
| Auditor / governance / certification | Audit trails | Govern tier | Audit-ready claims | Permissioned accounts | Demo observe; live certify blocked | Yes | P1 | Differentiator |
| Visitor / gate / deliveries | Strong (guard apps) | Gatekeeper | GuardHood | Intelligent gate | Legacy Gate + demo thin visitor | Yes | P1 | Bring into SABHA; hardware optional |
| Staff / domestic help | Yes | Yes | OTP/passcode help | Staff mgmt | Legacy Gate/staff; demo list | Yes | P1 | |
| Helpdesk / SLA | Digital helpdesk | AI Desk | Complaints | Custom helpdesk | Demo concerns; live tickets blocked; legacy complaints | Yes | P1 | Merge models carefully |
| Amenities / bookings | Deep | Amenities & events | Yes | Facility reservation | Demo book; legacy Amenities | Yes | P2 | |
| Assets / AMC / inventory | Yes | Govern tier | Preventive maint | Assets/inventory | Legacy Maintenance only | Yes | P2 | |
| Vendors / PO / quotations | Vendor payments | Expense/vendor | Purchase lifecycle | Facility/vendor | Legacy vendors; no PO | Yes | P2 | |
| Notices / polls / meetings | Yes | Forums + polls | Emails/push | Forums + polls | Demo yes; live meetings blocked; legacy notices/polls | Yes | P1 | |
| Documents / access control | Flat/society docs | Document mgmt | Tenant docs | Collaboration | Demo detail; live storage blocked | Yes | P1 | |
| Directory / privacy | Resident mgmt | DPDP-first | Masked directory | Data mgmt | Demo directory; live units | Yes | P1 | Privacy critical |
| Move-in / move-out / tenants | Digital MIO | Govern tier | Agreements + alerts | Partial | API/hooks only | Yes | P2 | |
| Vehicles / parking | Yes | Security packages | Vehicle logs | Vehicle Sentry (RFID) | Legacy vehicles UI; no parking alloc | Yes | P2 | Hardware separate |
| Emergency alerts | Security features | Gate AI claims | Investigation logs | Security | Legacy incidents | Yes | P2 | |
| Community engagement (classifieds, pets, marketplace) | Pet + marketplace | Forums/interest | Engagement | Forums | API pets/classifieds; demo none | Optional | P3–P4 | Keep optional |
| Analytics / dashboards | Custom dashboard | Real-time MC dash | Reports | Reports | Demo Home; live empty dash | Yes | P2 | Role widgets |
| Mobile experience | Resident + guard + admin apps | Super app | Multi-app | App | Responsive web PWA | Yes | P1 | Web-first OK short term |
| Integrations (Tally, barriers, WhatsApp) | Tally, devices, payments | 50+ integrations | Gate automation | RFID/tankers | WhatsApp edge present, delivery fail; no Tally | Selective | P2 | WhatsApp/email first |
| Privacy / security / DPDP | Claimed | DPDP certified claim | Masked numbers | Accounting permissions | Known auth/edge issues (see security audit) | Yes | P0 | Fix before scale |

---

## 2. Feature-level notes (high value)

### MyGate — what matters for SABHA

| Feature | What it does (claimed) | SABHA | Priority | Source |
| --- | --- | --- | --- | --- |
| Full-stack RWA ERP | Accounting + ops + security in one | Split shells | P0 unify | mygate.com |
| Area/fixed billing + penalties + advances | Flexible CAM | Partial / blocked | P1 | offerings |
| GST/TDS + Tally export | Statutory books | Not implemented | P2 | offerings |
| Auto bank reconciliation | Match online payments | Designed, blocked | P1 | offerings |
| Guard + resident visitor flow | Pre-approve, IVR, stay alerts | Legacy + demo thin | P1 | offerings |
| Helpdesk assignment / roster | Ticket ops | Partial | P1 | offerings |
| Amenities rules/pricing/approvals | Deep facility ops | Demo thin | P2 | offerings |
| Assets/inventory + AMC | Lifecycle | Legacy only | P2 | offerings |
| Pet directory / marketplace | Engagement | API / none | P4 | offerings |

### ADDA — what matters for SABHA

| Feature | What it does (claimed) | SABHA | Priority | Source |
| --- | --- | --- | --- | --- |
| Tiered Connect/Manage/Govern | Package by community size | No packaging | P3 | pricing |
| ADDA Books auditor accounting | Full BS/P&L | Partial design | P1 | ind.adda.io |
| Privacy / no ads / DPDP | Trust positioning | Needs work | P0 | ind.adda.io |
| AI helpdesk / invoice extract | Automation | Demo FAQ only | P3 | ind.adda.io |
| Gatekeeper privacy-conscious gate | Gate without leaking phones | Legacy Gate | P1 | ind.adda.io |
| Forums / polls / notices | Engagement | Partial | P2 | FAQ |

### NoBrokerHood — what matters for SABHA

| Feature | What it does (claimed) | SABHA | Priority | Source |
| --- | --- | --- | --- | --- |
| Configurable billing formulas | Complex CAM | Not implemented | P2 | features page |
| Masked resident directory for guards | Privacy at gate | Not implemented | P1 | features |
| Tenant docs + lease expiry alerts | Tenant ops | API only | P2 | features |
| Staff shifts + attendance | Ops | Legacy partial | P1 | features |
| Purchase requisition lifecycle | Vendor spend control | Not implemented | P2 | features |
| Guard / resident / admin apps | Multi-stakeholder | Web only | P2 | features |

### ApnaComplex / Anacity — what matters for SABHA

| Feature | What it does (claimed) | SABHA | Priority | Source |
| --- | --- | --- | --- | --- |
| GST billing + collection gateway | Collections | Demo only | P1 | apnacomplex.com |
| Intelligent gate + vehicle sentry | Security + RFID | Legacy / hardware | P2 software / P3 hardware | home |
| Helpdesk | Complaints | Partial | P1 | home |
| Facility + tanker monitor | Ops niche | Not implemented | P4 | home |
| Unit-based pricing plans | Commercial packaging | N/A product | P3 | pricing |

---

## 3. Differentiation recommendation

Competitors win on **ops breadth**, **gate hardware**, and **payment rails**. SABHA should win by combining:

1. **SocietyOS operational coverage** inside one SABHA shell (not `/legacy` forever).
2. **Published financial transparency** with auditor certification (weak or absent as a first-class product story on most competitor pages).
3. **Privacy-first directory and private concerns** (align with DPDP expectations competitors market).

Do **not** chase RFID barriers, marketplace ads, or AI marketing features before P0/P1 integrity and shell unification.

---

## 4. Limitations of this benchmark

- Marketing pages overstate completeness; shipping quality unknown.
- Hardware integrations (RFID, boom barriers, guard devices) are optional and out of scope until software workflows work.
- Pricing plans change frequently; treat as packaging hints only.
- Context.dev research was declined; sources are official pages via web fetch/search on 20 Nov 2026.

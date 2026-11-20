# SABHA UI audit

Date: 20 November 2026 (Asia/Calcutta). Prior viewport matrix retained; this pass adds master-audit notes.

Viewports required: 360×800, 390×844, 430×932, 768×1024, 1366×768, 1440×900.

---

## 1. Results summary

| Surface | Overflow | Nav | Forms | Tables | Status |
| --- | --- | --- | --- | --- | --- |
| Auth sign-in | PASS (prior) | — | Aligned inputs | — | PASS |
| Demo Home / Finance / Community / Concerns / More @ 390 | PASS (prior + Playwright) | Bottom nav | OK | Scroll | PASS |
| Live shell | PASS structure | Role nav | — | Empty states | PASS chrome |
| `/legacy` | Desktop-oriented | Emoji ROLE_NAV | Dense | Wide tables | FAIL vs SABHA mobile standard |

---

## 2. Defects

| ID | Viewport | Issue | Severity | Status |
| --- | --- | --- | --- | --- |
| U1 | 390 | Announcement title ran into body | P2 | Fixed (`<br />`) |
| U2 | All | Concern description single-line | P2 | Fixed (textarea) |
| U3 | Legacy | Emoji nav / dark slate interiors | P2 | Open until shell merge |
| U4 | Live | Decorative Available/Receipts/Payments (no drill) | P2 | Open |
| U5 | — | Computer-use reported dead tabs | — | Not reproduced in Playwright |

---

## 3. Accessibility / interaction notes

| Check | Result |
| --- | --- |
| Touch targets demo primary/text buttons | ≥44px CSS |
| Keyboard | **NOT TESTED** systematically |
| Icon consistency (Lucide demo vs emoji legacy) | Split |
| Loading / error | Live PageStatus present; demo Notice toasts |

---

## 4. Evidence

- `docs/audit-evidence/` prior UI captures
- `docs/audit-evidence/master-audit/` 20 Nov screenshots
- Playwright 390 viewport smoke

Full six-viewport re-grid of every legacy module remains **NOT TESTED**.

# SABHA UI and responsiveness audit

Audited 19 November 2026 (Asia/Calcutta) with Playwright Chromium. Viewports: 360×800, 390×844, 430×932, 768×1024, 1366×768, 1440×900.

Evidence: `docs/audit-evidence/ui-*-390.png`, `docs/audit-evidence/ui-overflow.json`, workflow screenshots.

Statuses: **PASS** / **FAIL** / **BLOCKED** / **NOT TESTED** / **DEMO ONLY**.

## Horizontal overflow (demo routes, resident session)

| Route | 360 | 390 | 430 | 768 | 1366 | 1440 |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** |
| `/community` | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** |
| `/finance` | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** |
| `/concerns` | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** |
| `/more` | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** |

`document.documentElement.scrollWidth <= clientWidth + 1` on every cell above.

## Shell and navigation

| Check | Result | Status |
| --- | --- | --- |
| Mobile bottom nav 5 items | Present; only selected route renders | **PASS** |
| Desktop sidebar ≥1024 | Present in CSS/shell | **PASS** (code + 1366/1440 overflow) |
| Header notifications/profile popovers | Open/close | **PASS** (manual earlier; not re-clicked every viewport) |
| Auth sign-in alignment | Fields and Sign in share edges | **PASS** (prior PR #7) |
| Metric cards clickable | Cursor/button metrics | **PASS** after remediation |
| Maintenance wide table | Scrolls inside `.app-scroll`, page does not | **PASS** |
| Modals/drawers | Popovers only in demo header | **PASS** for popovers; no drawer component |
| Legacy `/legacy` | Login chrome renders at 1440 | **PASS** open; interior modules **NOT TESTED** at all six sizes |

## Defects found and fixed this pass

| Defect | Severity | Fix |
| --- | --- | --- |
| Home metrics decorative | High (functional UX) | Converted to buttons with route drill-downs |
| Invoice rows not openable | High | Clickable flat → detail |
| Outstanding filter hid resident’s partial invoice | High | `Due` filter = Partial + Outstanding; A-402 partial fixture |
| Directory rows not openable | Medium | Person detail card |

## Remaining UI issues

| Issue | Status |
| --- | --- |
| Legacy emoji icons in ROLE_NAV | **FAIL** vs SABHA Lucide standard (legacy surface only) |
| Live Platform still uses older slate card chrome vs demo shell | Inconsistent, not broken — **NOT TESTED** as visual redesign |
| No breadcrumb trail on nested demo details | Acceptable with Back buttons — note only |
| Keyboard roving on tablists | Native buttons; full a11y audit **NOT TESTED** |
| Chart hit-targets | Decorative bars; open Reports via text control — **PASS** for overflow |

## Screenshot index

- `ui-home-390.png`, `ui-community-390.png`, `ui-finance-390.png`, `ui-concerns-390.png`, `ui-more-390.png`
- `w1-resident.png`, `w2-treasurer.png`, `w3-auditor.png`, `w5-meeting.png`, `w6-admin.png`
- `resident-payment.png`, `committee-private.png`, `legacy-1440.png`

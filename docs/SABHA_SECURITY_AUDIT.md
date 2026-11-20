# SABHA security audit

Date: 20 November 2026 (Asia/Calcutta). Combines repository inspection on this branch with prior hosted read assessment (`docs/AUTH_SECURITY_ASSESSMENT.md`). **No production security configuration was changed. No hosted data was modified.**

Statuses: **OPEN** · **MITIGATED IN REPO (not deployed)** · **ACCEPTED RISK** · **NOT TESTED**.

---

## 1. Critical / high

| ID | Finding | Status | Action |
| --- | --- | --- | --- |
| S1 | Hosted `auth-login` historically unauthenticated PIN set/reset; repo returns 410 | **MITIGATED IN REPO (not deployed)** until function deploy | Deploy 410 handler with approval; confirm gateway |
| S2 | `residents.pin` plaintext readable by privileged committee/super-admin session; broad table grants | **OPEN** on host (migration revoke not applied) | Apply column revoke + hash PINs; never select `pin` in clients |
| S3 | Dual app surfaces (`/` vs `/legacy`) increase auth confusion and session mixing risk | **OPEN** | Unify shell; one Auth user model |
| S4 | Live write RPCs missing on host — UI can appear ready while failing | **OPEN** | Feature-flag writes; honest empty/blocked states |
| S5 | `ai-proxy` no signed-in user check; CORS `*` | **OPEN** | Require JWT; tighten CORS |
| S6 | Demo credentials pinned on sign-in | **ACCEPTED RISK** for demo; must stay off production marketing | Keep `@demo.sabha.app` isolated; never seed production ledgers |

---

## 2. Medium

| ID | Finding | Status |
| --- | --- | --- |
| S7 | Invitation accept / edge invite incomplete → onboarding abuse surface unclear | **OPEN** / **BLOCKED** |
| S8 | WhatsApp centre hardcodes project function URL; delivery not proven | **OPEN** |
| S9 | ResidentPortal hardcoded UPI VPA / brand | **OPEN** (legacy) |
| S10 | Storage buckets / redaction engine missing on host | **OPEN** |
| S11 | Anonymous execute historically broad on older public functions | Partially addressed in unapplied migration |
| S12 | Private concerns isolation proven in **demo** only; live ticket RLS **NOT TESTED** | **NOT TESTED** |
| S13 | Multi-society isolation **NOT TESTED** | **NOT TESTED** |
| S14 | Password recovery mail delivery **NOT TESTED** | **NOT TESTED** |

---

## 3. Authentication & session

| Topic | Result |
| --- | --- |
| Platform email/password | Works against hosted Auth (demo accounts) |
| Session refresh abort | Previously fixed (browser fetch; expired local clear) |
| Phone/PIN | Retired in UI; hosted function may still be old until deploy |
| Role escalation via hidden nav | UI hides; RPC must deny — **NOT TESTED** live |
| Demo isolation | Code enforces `@demo.sabha.app` → DemoApp reducer only |

---

## 4. Data exposure

| Data | Risk |
| --- | --- |
| Phone / PIN | Legacy residents table |
| Private tickets | Live model designed; not host-proven |
| Financial documents | Storage policies unapplied |
| Directory contacts | Demo omits phones; live units sparse |
| Logs | Edge logs inspected in prior 24h window only |

---

## 5. Do not do without approval

- Replay foundation migration on hosted Society OS project.
- Deploy edge functions without paired client + rollback plan.
- Delete historical society data.
- Expose PIN or full phone in any new API.

---

## 6. Evidence references

- `docs/AUTH_SECURITY_ASSESSMENT.md`
- `supabase/functions/auth-login/index.ts` (410)
- `supabase/migrations/20261119120000_invitations.sql` (column revoke intent)
- Demo isolation: `src/platform/Platform.jsx`, `src/platform/demo/*`

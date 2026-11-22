# SABHA capability inventory (option-2 independence)

Checklist for preserving every OpenSociety capability after a rename to `@sabha/*`.
Tick **Preserve** items when the feature still works post-rename; tick **Rename** items when the identifier is updated.

Scope: `/workspace` monorepo as of this inventory. User-facing brand already says SABHA in many places; package/deploy/mobile identifiers still say OpenSociety.

---

## A. Capabilities to preserve

### 1. Web admin modules (`/admin/*`)

Layout + nav: `apps/web/src/routes/admin.tsx`  
Path remapping for demo: `apps/web/src/lib/dashboard-path.ts`

| Done | Route | File | Capabilities |
| --- | --- | --- | --- |
| [ ] | `/admin` | `apps/web/src/routes/admin/index.tsx` | Overview: society, apartments, visitors, notices, pending users, finance summary, dues |
| [ ] | `/admin/society` | `apps/web/src/routes/admin/society.tsx` | View/update society config (name, address, city, state, pincode, GSTIN) |
| [ ] | `/admin/apartments` | `apps/web/src/routes/admin/apartments.tsx` | List; add single; bulk CSV; edit (tower/floor/BHK/area) |
| [ ] | `/admin/residents` | `apps/web/src/routes/admin/residents.tsx` | Filter PENDING/APPROVED/SUSPENDED; approve + assign residency; change role |
| [ ] | `/admin/guards` | `apps/web/src/routes/admin/guards.tsx` | Create/update guards; activate/deactivate; device bind/list/revoke |
| [ ] | `/admin/duty` | `apps/web/src/routes/admin/duty.tsx` | On-duty now; shift report with visitor overlap |
| [ ] | `/admin/house-help` | `apps/web/src/routes/admin/house-help.tsx` | Registry CRUD; assignments; verification; reviews; entry log |
| [ ] | `/admin/vehicles` | `apps/web/src/routes/admin/vehicles.tsx` | Register/update vehicles; active toggle; gate-log view |
| [ ] | `/admin/parking` | `apps/web/src/routes/admin/parking.tsx` | Slots CRUD; assign/unassign; visitor parking summary |
| [ ] | `/admin/visitors` | `apps/web/src/routes/admin/visitors.tsx` | Gate log; approve/deny/check-in/check-out transitions |
| [ ] | `/admin/pre-approvals` | `apps/web/src/routes/admin/pre-approvals.tsx` | Create/list/revoke; QR display (`OS-PA:` prefix today) |
| [ ] | `/admin/tickets` | `apps/web/src/routes/admin/tickets.tsx` | Create; assign; status transitions (start/resolve/close/reopen/cancel) |
| [ ] | `/admin/billing` | `apps/web/src/routes/admin/billing.tsx` | Bill config; generate bills; list; cancel; record payments; dues; interest preview/apply; invoices |
| [ ] | `/admin/expenses` | `apps/web/src/routes/admin/expenses.tsx` | Vendors; expenses; pay; TDS summary; ledger account picks |
| [ ] | `/admin/reports` | `apps/web/src/routes/admin/reports.tsx` | Finance report; collection analytics; aging; trial balance; I&E; balance sheet; receipts & payments; Tally export; PDF/XLSX/CSV exports |
| [ ] | `/admin/analytics` | `apps/web/src/routes/admin/analytics.tsx` | Visitor trends (hour/type/DoW); house-help analytics; maintenance analytics; CSV/PDF |
| [ ] | `/admin/notices` | `apps/web/src/routes/admin/notices.tsx` | Publish notices; attachments via uploads; read receipts; tower notify |
| [ ] | `/admin/setup` | `apps/web/src/routes/admin/setup.tsx` | First-run wizard (see §9) |

Supporting UI: `apps/web/src/components/admin/`, `apps/web/src/components/ui/`, theme/language in header.

Landing (non-admin): `/` → `apps/web/src/routes/index.tsx` (SABHA marketing + demo/dashboard CTAs).

---

### 2. Web demo

| Done | Surface | Path(s) |
| --- | --- | --- |
| [ ] | Demo shell (in-memory RQ client, reset, no Clerk) | `apps/web/src/routes/demo.tsx` |
| [ ] | Demo mirrors every admin module | `apps/web/src/routes/demo/*.tsx` → re-export admin components |
| [ ] | Demo routes: `/demo`, `/demo/society`, `/demo/apartments`, `/demo/residents`, `/demo/guards`, `/demo/duty`, `/demo/house-help`, `/demo/vehicles`, `/demo/parking`, `/demo/visitors`, `/demo/pre-approvals`, `/demo/tickets`, `/demo/billing`, `/demo/expenses`, `/demo/reports`, `/demo/analytics`, `/demo/notices`, `/demo/setup` | same filenames under `routes/demo/` |
| [ ] | Demo API client + fixtures | `apps/web/src/lib/demo/client.ts`, `data.ts`, `finance.ts`, `exports.ts`, `helpers.ts`, `mode.ts` |
| [ ] | Shared demo seed | `packages/shared/src/demo.ts` (`@opensociety/shared/demo`) |
| [ ] | No live API / Clerk in demo | enforced by demo layout + `useDashboardPath` |

---

### 3. Mobile resident screens

Guarded in `apps/mobile/app/_layout.tsx` when `mode === 'live' \|\| demo?.role === 'resident'`.

| Done | Screen | File | Capabilities |
| --- | --- | --- | --- |
| [ ] | Home (resident mode) | `apps/mobile/app/index.tsx` | Everyday tiles, household list, pre-approve CTA, language chips, demo/live entry |
| [ ] | Sign-in | `apps/mobile/app/sign-in.tsx` | Clerk email/password (live only) |
| [ ] | Profile | `apps/mobile/app/profile.tsx` | My apartments, co-residents, vehicles |
| [ ] | Visitors | `apps/mobile/app/visitors.tsx` | Pending approvals; approve/deny |
| [ ] | Visitor history | `apps/mobile/app/visitor-history.tsx` | Past visits for my flats |
| [ ] | Pre-approve | `apps/mobile/app/pre-approve.tsx` | Create pass; QR + shareable code |
| [ ] | Notices | `apps/mobile/app/notices.tsx` | List/search; mark read |
| [ ] | Tickets | `apps/mobile/app/tickets.tsx` | Create maintenance ticket; list mine |
| [ ] | My house help | `apps/mobile/app/my-house-help.tsx` | Assign/remove; rate/review |
| [ ] | My vehicles | `apps/mobile/app/my-vehicles.tsx` | Register/toggle vehicles |
| [ ] | Bills | `apps/mobile/app/bills.tsx` | Bills, payments, apartment statement |
| [ ] | Offline/optimistic writes | `apps/mobile/lib/offline/*` | Persist cache, queue mutations, sync status |
| [ ] | Push enable/sign-out | `apps/mobile/components/push-provider.tsx`, `auth-status.tsx` | |
| [ ] | Mobile demo (resident) | `apps/mobile/lib/demo/*`, `components/demo-entry.tsx` | In-memory API; no Clerk/push |

---

### 4. Mobile guard screens

Guarded when `mode === 'live' \|\| demo?.role === 'guard'`.

| Done | Screen | File | Capabilities |
| --- | --- | --- | --- |
| [ ] | Home (gate tools) | `apps/mobile/app/index.tsx` | Gate tiles + register CTA |
| [ ] | Gate desk | `apps/mobile/app/gate.tsx` | Active visitors; check-in/out; QR redeem scanner |
| [ ] | Register visitor | `apps/mobile/app/register.tsx` | Create entry (offline-capable) |
| [ ] | Vehicle gate | `apps/mobile/app/vehicle-gate.tsx` | Plate verify; notify resident (alert) |
| [ ] | Guard duty | `apps/mobile/app/duty.tsx` | Clock-in/out |
| [ ] | House help (gate) | `apps/mobile/app/house-help.tsx` | Check-in/out domestic staff |
| [ ] | Mobile demo (guard) | same demo stack | Guard role session |

---

### 5. API route groups + role enforcement

App entry: `apps/api/src/index.ts`  
Middleware: `apps/api/src/middleware.ts` (`withDb`, `withAuth`, `requireAuth`, `requireRole`)  
Auth: Clerk Bearer JWT → `users.clerkId`; else `x-user-id` when no `CLERK_SECRET_KEY`.

Health (no DB/auth):

| Done | Method | Path | Notes |
| --- | --- | --- | --- |
| [ ] | GET | `/` | `{ name: 'opensociety-api', status: 'ok' }` — rename response name |
| [ ] | GET | `/health` | `{ status: 'ok' }` |

#### `/society` — `apps/api/src/routes/society.ts`

| Done | Method | Path | Auth |
| --- | --- | --- | --- |
| [ ] | GET | `/society` | any authenticated |
| [ ] | PUT | `/society` | ADMIN |

#### `/apartments` — `apartments.ts`

| Done | Method | Path | Auth |
| --- | --- | --- | --- |
| [ ] | GET | `/apartments` | auth |
| [ ] | GET | `/apartments/mine` | auth |
| [ ] | GET | `/apartments/mine/residents` | auth |
| [ ] | GET | `/apartments/:id/statement` | auth (scoped) |
| [ ] | POST | `/apartments` | ADMIN |
| [ ] | POST | `/apartments/bulk` | ADMIN |
| [ ] | PATCH | `/apartments/:id` | ADMIN |

#### `/users` — `users.ts` (all ADMIN)

| Done | Method | Path | Auth |
| --- | --- | --- | --- |
| [ ] | GET | `/users?status=` | ADMIN |
| [ ] | POST | `/users/:id/approve` | ADMIN (creates residency → APPROVED) |
| [ ] | PATCH | `/users/:id/role` | ADMIN |

#### `/guards` — `guards.ts`

| Done | Method | Path | Auth |
| --- | --- | --- | --- |
| [ ] | GET | `/guards` | auth |
| [ ] | POST | `/guards` | ADMIN |
| [ ] | PATCH | `/guards/:id` | ADMIN |
| [ ] | GET | `/guards/duty/active` | auth |
| [ ] | GET | `/guards/duty` | auth |
| [ ] | POST | `/guards/:id/duty/clock-in` | GUARD, ADMIN |
| [ ] | POST | `/guards/duty/:sessionId/clock-out` | GUARD, ADMIN |
| [ ] | GET | `/guards/:id/devices` | ADMIN |
| [ ] | POST | `/guards/:id/devices` | ADMIN |
| [ ] | POST | `/guards/:id/devices/:deviceId/revoke` | ADMIN |

#### `/visitors` — `visitors.ts`

| Done | Method | Path | Auth |
| --- | --- | --- | --- |
| [ ] | GET | `/visitors` | auth |
| [ ] | POST | `/visitors` | GUARD, ADMIN |
| [ ] | POST | `/visitors/:id/approve` | RESIDENT, ADMIN |
| [ ] | POST | `/visitors/:id/deny` | RESIDENT, ADMIN |
| [ ] | POST | `/visitors/:id/checkin` | GUARD, ADMIN |
| [ ] | POST | `/visitors/:id/checkout` | GUARD, ADMIN |
| [ ] | GET | `/visitors/pre-approvals` | auth |
| [ ] | POST | `/visitors/pre-approvals` | RESIDENT, ADMIN |
| [ ] | POST | `/visitors/pre-approvals/redeem` | GUARD, ADMIN |
| [ ] | POST | `/visitors/pre-approvals/:id/revoke` | ADMIN |

#### `/notices` — `notices.ts`

| Done | Method | Path | Auth |
| --- | --- | --- | --- |
| [ ] | GET | `/notices` | auth |
| [ ] | POST | `/notices` | ADMIN |
| [ ] | POST | `/notices/:id/read` | auth |
| [ ] | GET | `/notices/:id/reads` | ADMIN |

#### `/tickets` — `tickets.ts`

| Done | Method | Path | Auth |
| --- | --- | --- | --- |
| [ ] | GET | `/tickets` | auth |
| [ ] | POST | `/tickets` | RESIDENT, ADMIN |
| [ ] | POST | `/tickets/:id/transition` | ADMIN |
| [ ] | PATCH | `/tickets/:id/assign` | ADMIN |

#### `/house-help` — `house-help.ts`

| Done | Method | Path | Auth |
| --- | --- | --- | --- |
| [ ] | GET | `/house-help` | auth |
| [ ] | POST | `/house-help` | RESIDENT, ADMIN |
| [ ] | PUT | `/house-help/:id` | auth (owner/admin rules) |
| [ ] | GET | `/house-help/:id/reviews` | auth |
| [ ] | POST | `/house-help/:id/reviews` | RESIDENT, ADMIN |
| [ ] | POST | `/house-help/:id/verification` | ADMIN |
| [ ] | GET | `/house-help/entries` | auth |
| [ ] | POST | `/house-help/:id/checkin` | GUARD, ADMIN |
| [ ] | POST | `/house-help/entries/:entryId/checkout` | GUARD, ADMIN |
| [ ] | GET | `/house-help/:id/assignments` | auth |
| [ ] | POST | `/house-help/:id/assignments` | auth |
| [ ] | DELETE | `/house-help/:id/assignments/:apartmentId` | auth |

#### `/vehicles` — `vehicles.ts`

| Done | Method | Path | Auth |
| --- | --- | --- | --- |
| [ ] | GET | `/vehicles` | auth |
| [ ] | POST | `/vehicles` | auth |
| [ ] | PUT | `/vehicles/:id` | auth |
| [ ] | GET | `/vehicles/verify` | GUARD, ADMIN |
| [ ] | GET | `/vehicles/gate-log` | ADMIN, GUARD |
| [ ] | POST | `/vehicles/:id/alerts` | GUARD, ADMIN (requires `PUSH_ENABLED`) |

#### `/parking` — `parking.ts`

| Done | Method | Path | Auth |
| --- | --- | --- | --- |
| [ ] | GET | `/parking/slots` | ADMIN |
| [ ] | GET | `/parking/directory` | auth |
| [ ] | GET | `/parking/visitor` | ADMIN, GUARD |
| [ ] | POST | `/parking/slots` | ADMIN |
| [ ] | PUT | `/parking/slots/:id` | ADMIN |
| [ ] | POST | `/parking/slots/:id/assign` | ADMIN |
| [ ] | DELETE | `/parking/slots/:id` | ADMIN |

#### `/bills` — `bills.ts`

| Done | Method | Path | Auth |
| --- | --- | --- | --- |
| [ ] | GET | `/bills` | auth |
| [ ] | GET | `/bills/:id` | auth |
| [ ] | GET | `/bills/:id/invoice` | auth |
| [ ] | POST | `/bills/generate` | ADMIN |
| [ ] | POST | `/bills` | ADMIN |
| [ ] | GET | `/bills/dues` | ADMIN |
| [ ] | GET | `/bills/interest-preview` | ADMIN |
| [ ] | POST | `/bills/apply-interest` | ADMIN |
| [ ] | POST | `/bills/:id/cancel` | ADMIN |

#### `/payments` — `payments.ts`

| Done | Method | Path | Auth |
| --- | --- | --- | --- |
| [ ] | GET | `/payments` | auth |
| [ ] | POST | `/payments` | ADMIN |

#### `/bill-config` — `bill-config.ts` (all ADMIN)

| Done | Method | Path | Auth |
| --- | --- | --- | --- |
| [ ] | GET | `/bill-config` | ADMIN |
| [ ] | PUT | `/bill-config` | ADMIN |

#### `/expenses` — `expenses.ts` (all ADMIN)

| Done | Method | Path | Auth |
| --- | --- | --- | --- |
| [ ] | GET/POST/PATCH | `/expenses/vendors[/:id]` | ADMIN |
| [ ] | GET/POST | `/expenses` | ADMIN |
| [ ] | POST | `/expenses/:id/pay` | ADMIN |
| [ ] | GET | `/expenses/tds-summary` | ADMIN |

#### `/ledger` — `ledger.ts` (all ADMIN)

| Done | Method | Path | Auth |
| --- | --- | --- | --- |
| [ ] | POST | `/ledger/init` | ADMIN (seed CoA) |
| [ ] | GET | `/ledger/accounts` | ADMIN |
| [ ] | GET/POST | `/ledger/journal-entries` | ADMIN |
| [ ] | GET | `/ledger/accounts/:id/ledger` | ADMIN |

#### `/reports` — `reports.ts` (all ADMIN)

| Done | Method | Path | Auth |
| --- | --- | --- | --- |
| [ ] | GET | `/reports/finance` | ADMIN |
| [ ] | GET | `/reports/collection-analytics` | ADMIN |
| [ ] | GET | `/reports/visitor-trends` | ADMIN |
| [ ] | GET | `/reports/visitor-trends/pdf` | ADMIN |
| [ ] | GET | `/reports/trial-balance` | ADMIN |
| [ ] | GET | `/reports/income-expenditure` | ADMIN |
| [ ] | GET | `/reports/balance-sheet` | ADMIN |
| [ ] | GET | `/reports/receipts-payments` | ADMIN |
| [ ] | GET | `/reports/tally-export` | ADMIN |
| [ ] | GET | `/reports/aging` | ADMIN |
| [ ] | GET | `/reports/house-help-analytics` | ADMIN |
| [ ] | GET | `/reports/maintenance-analytics` | ADMIN |
| [ ] | (format query) | PDF/XLSX/CSV via `lib/report-export.ts` | ADMIN |

#### `/uploads` — `uploads.ts`

| Done | Method | Path | Auth |
| --- | --- | --- | --- |
| [ ] | POST | `/uploads` | auth (jpeg/png/webp/pdf ≤5MB → R2) |
| [ ] | GET | `/uploads/:key` | auth |

#### `/push` — `push.ts`

| Done | Method | Path | Auth |
| --- | --- | --- | --- |
| [ ] | POST | `/push/tokens` | auth |
| [ ] | DELETE | `/push/tokens` | auth |

#### `/webhooks` — `webhooks.ts`

| Done | Method | Path | Auth |
| --- | --- | --- | --- |
| [ ] | POST | `/webhooks/clerk` | Svix signature (`CLERK_WEBHOOK_SECRET`); no user JWT |

Workers extras (same `index.ts`): monthly billing cron `0 0 1 * *`; hourly bill reminders `0 * * * *`; queue consumer for push dispatch.

Node extras: `apps/api/src/node/server.ts`, `jobs.ts` — `BILLING_ENABLED`, push wakeup, SIGTERM drain.

---

### 6. Shared domain (`packages/shared`)

Package: `@opensociety/shared` → target `@sabha/shared`  
Entry: `packages/shared/src/index.ts` + `./demo` export.

| Done | Module | File | Retain |
| --- | --- | --- | --- |
| [ ] | Enums / Zod roles & statuses | `enums.ts` | RESIDENT/GUARD/ADMIN/STAFF; visitor/ticket/bill/ledger/TDS enums |
| [ ] | Society | `society.ts` | |
| [ ] | Apartment | `apartment.ts` | |
| [ ] | User / approve / role | `user.ts` | |
| [ ] | Residency | `residency.ts` | |
| [ ] | Guard / duty / device | `guard.ts`, `guard-duty.ts`, `guard-device.ts` | |
| [ ] | Visitors + status machine | `visitor.ts`, `visitor-status.ts` | QR prefix `OS-PA:` (see rename §) |
| [ ] | Visitor analytics helpers | `visitor-analytics.ts` | |
| [ ] | Notices | `notice.ts` | |
| [ ] | Tickets + status machine | `ticket.ts`, `ticket-status.ts` | |
| [ ] | House help (+ entry/assignment/review/trust/attendance) | `house-help*.ts` | |
| [ ] | Vehicle | `vehicle.ts` | |
| [ ] | Parking | `parking.ts` | |
| [ ] | Finance / bills / interest / dues | `finance.ts` | |
| [ ] | Reconciliation (FIFO) | `reconciliation.ts` | |
| [ ] | Ledger / default CoA | `ledger.ts` | |
| [ ] | Expenses / TDS | `expense.ts` | |
| [ ] | Statutory statements | `statements.ts` | |
| [ ] | Export helpers | `export.ts` | |
| [ ] | Ops analytics | `ops-analytics.ts` | |
| [ ] | Push token schemas | `push.ts` | |
| [ ] | i18n dictionaries | `i18n.ts` | en/hi/te |
| [ ] | XLSX writer | `xlsx.ts` | |
| [ ] | Demo fixtures | `demo.ts` | |

---

### 7. DB schema areas (`packages/db`)

Package: `@opensociety/db` → `@sabha/db`  
Schema index: `packages/db/src/schema/index.ts`  
Migrations: `packages/db/drizzle/0000_*.sql` … `0024_monthly_bill_uniqueness.sql`  
Seed: `packages/db/src/seed.ts` (DEV_ADMIN / PENDING resident / approved resident)

| Done | Area | Tables / enums | Files |
| --- | --- | --- | --- |
| [ ] | Enums | all pgEnums mirroring shared | `schema/enums.ts` |
| [ ] | Identity | `users` | `users.ts` |
| [ ] | Society | `society_config` | `society-config.ts` |
| [ ] | Units | `apartments`, `residencies` | `apartments.ts`, `residencies.ts` |
| [ ] | Guards | `guards`, `guard_duty_sessions`, `guard_devices` | `guards.ts`, `guard-duty-sessions.ts`, `guard-devices.ts` |
| [ ] | Visitors | `visitor_entries`, `visitor_pre_approvals` | `visitor-entries.ts`, `visitor-pre-approvals.ts` |
| [ ] | Notices | `notices`, `notice_reads` | `notices.ts`, `notice-reads.ts` |
| [ ] | Maintenance | `maintenance_tickets` | `maintenance-tickets.ts` |
| [ ] | House help | `house_help`, `house_help_entries`, `house_help_assignments`, `house_help_reviews` | matching files |
| [ ] | Vehicles / parking | `vehicles`, `parking_slots` | matching files |
| [ ] | Billing | `maintenance_bills`, `bill_line_items`, `payments`, `bill_config` | `finance.ts`, `bill-config.ts` |
| [ ] | Ledger | `accounts`, `journal_entries`, `journal_lines` | `ledger.ts` |
| [ ] | Expenses | `vendors`, `expenses`, `tds_entries` | `expenses.ts` |
| [ ] | Push outbox | `push_devices`, `push_deliveries` | `push.ts` |
| [ ] | DBML docs | `packages/db/schema.dbml` | rename project title |

---

### 8. Auth (Clerk web + mobile, webhooks, approve flow)

| Done | Capability | Path |
| --- | --- | --- |
| [ ] | Web ClerkProvider | `apps/web/src/routes/__root.tsx` (`VITE_CLERK_PUBLISHABLE_KEY`) |
| [ ] | Web SignInButton / UserButton | `apps/web/src/components/auth-controls.tsx` |
| [ ] | Web API Bearer from Clerk session | `apps/web/src/lib/api.ts` |
| [ ] | Mobile ClerkProvider + token cache | `apps/mobile/app/_layout.tsx`, `lib/token-cache.ts` |
| [ ] | Mobile AuthBridge → API client | `_layout.tsx` + `api/client.ts` |
| [ ] | Mobile sign-in screen | `apps/mobile/app/sign-in.tsx`, `components/sign-in-form.tsx` |
| [ ] | Mobile AuthStatus + push disconnect on sign-out | `components/auth-status.tsx` |
| [ ] | API `withAuth` / `requireAuth` / `requireRole` | `apps/api/src/middleware.ts` |
| [ ] | Dev header fallback `x-user-id` | same (when no Clerk secret) |
| [ ] | Clerk webhook user.created/updated/deleted | `apps/api/src/routes/webhooks.ts` → PENDING mirror |
| [ ] | Admin approve → residency + APPROVED | `POST /users/:id/approve` + admin residents UI |
| [ ] | Role change | `PATCH /users/:id/role` |
| [ ] | Seed identities for local | `packages/db/src/seed.ts` |
| [ ] | CORS `WEB_ORIGINS` | `apps/api/src/index.ts` |

---

### 9. Setup wizard

| Done | Capability | Path |
| --- | --- | --- |
| [ ] | Live wizard | `/admin/setup` → `apps/web/src/routes/admin/setup.tsx` |
| [ ] | Demo wizard | `/demo/setup` → `apps/web/src/routes/demo/setup.tsx` |
| [ ] | Steps: Society → Apartments (CSV bulk) → Review | `apps/web/src/lib/setup-wizard.ts` |
| [ ] | CSV parser | `apps/web/src/lib/apartments-csv.ts` |
| [ ] | Finish: `updateSociety` + `createApartmentsBulk` | setup.tsx mutation |
| [ ] | Setup-only chrome (hide nav) | `admin.tsx` `setupOnly` |

---

### 10. Billing / push / uploads / R2 flags

| Done | Flag / binding | Where | Behaviour to keep |
| --- | --- | --- | --- |
| [ ] | `BILLING_ENABLED` | Node `server.ts` / `deploy/api.env.example` | Startup + monthly 1st UTC bill generation |
| [ ] | Workers cron billing | `wrangler.jsonc` + `runMonthlyBilling` | Idempotent monthly bills + ledger post |
| [ ] | `PUSH_ENABLED` | wrangler vars, Node env, `types.ts` | Queue/dispatch/reminders gated |
| [ ] | `BILL_REMINDER_DAYS` | default `-7,0,3` | Hourly cron local 09:00 |
| [ ] | `SOCIETY_TIME_ZONE` | default `Asia/Kolkata` | Reminder local hour |
| [ ] | `PUSH_DISPATCH` queue | Workers producer/consumer | `opensociety-push` / `-failed` today |
| [ ] | Expo push + `EXPO_ACCESS_TOKEN` | `lib/expo-push.ts`, push routes | |
| [ ] | Push devices/deliveries outbox | DB + `lib/push-*` | Durable recovery |
| [ ] | R2 `UPLOADS` binding (Workers) | `wrangler.jsonc` bucket `opensociety-uploads` | |
| [ ] | Node R2/S3 uploads | `node/config.ts` (`R2_*` / `S3_*`) | |
| [ ] | Upload MIME/size limits | `routes/uploads.ts` | |
| [ ] | `CF_PAGES` / `CLOUDFLARE` | `apps/web/vite.config.ts`, `turbo.json` | Pages build mode |
| [ ] | `APP_ENV` | API config + mobile EAS | live vs staging key rules |

---

### 11. Deploy (Droplet compose, Workers, Pages scripts)

| Done | Surface | Path |
| --- | --- | --- |
| [ ] | Multi-stage Dockerfile (api + web) | `/workspace/Dockerfile` |
| [ ] | Compose stack name + services | `deploy/compose.yaml` (`name: opensociety`) |
| [ ] | Compose env samples | `deploy/.env.example`, `deploy/api.env.example` |
| [ ] | Caddy reverse proxy example | `deploy/Caddyfile.example` |
| [ ] | Deploy runbook | `deploy/README.md` |
| [ ] | API Workers config | `apps/api/wrangler.jsonc` (`opensociety-api`) |
| [ ] | Web Workers/Pages config | `apps/web/wrangler.jsonc` (**already `name: "sabha"`**) |
| [ ] | Pages prepare script | `scripts/prepare-cloudflare-pages.mjs` |
| [ ] | Root `pages:build` | `package.json` |
| [ ] | Hosting smoke test images | `scripts/hosting-smoke.test.mjs` (`opensociety-api:test`, `opensociety-web:test`) |
| [ ] | CI build + docker smoke | `.github/workflows/ci.yml` |
| [ ] | Manual GHCR image publish | `.github/workflows/containers.yml` (`ghcr.io/${{ github.repository }}-*`) |
| [ ] | Mobile EAS workflow | `.github/workflows/mobile-build.yml` |
| [ ] | Turbo pipeline env allowlists | `turbo.json` |

Image refs today: `ghcr.io/opencore-x/opensociety-api` / `opensociety-web`.

---

### 12. i18n languages

| Done | Item | Path |
| --- | --- | --- |
| [ ] | Languages: **en**, **hi**, **te** | `packages/shared/src/i18n.ts` (`Language`, `LANGUAGES`) |
| [ ] | Common + web + mobile dictionaries | same file (`common*`, `web*`, `mobile*`) |
| [ ] | Web LanguageSwitcher + provider | `apps/web/src/components/language-switcher.tsx`, `lib/i18n.tsx` (storage key `lang`) |
| [ ] | Mobile language chips + provider | `apps/mobile/app/index.tsx`, `lib/i18n.tsx` (storage `opensociety-lang`) |
| [ ] | Parity test | `apps/web/src/i18n-parity.test.ts` |

---

## B. Rename targets (option-2 SABHA independence → `@sabha/*`)

Already SABHA (do not regress): user-facing wordmark, `apps/mobile/app.json` `name`/`slug: sabha`, `apps/web/wrangler.jsonc` `name: sabha`, brand assets under `public/brand/`, many UI strings.

### B1. Root + npm packages

| Done | Current | Target | Files |
| --- | --- | --- | --- |
| [ ] | `"name": "opensociety"` | `"sabha"` (or `@sabha/root`) | `package.json` |
| [ ] | `@opensociety/web` | `@sabha/web` | `apps/web/package.json` + all deps/filters |
| [ ] | `@opensociety/api` | `@sabha/api` | `apps/api/package.json` |
| [ ] | `@opensociety/mobile` | `@sabha/mobile` | `apps/mobile/package.json` |
| [ ] | `@opensociety/shared` | `@sabha/shared` | `packages/shared/package.json` |
| [ ] | `@opensociety/db` | `@sabha/db` | `packages/db/package.json` |
| [ ] | `@opensociety/eslint-config` | `@sabha/eslint-config` | `packages/eslint-config/package.json` |
| [ ] | `@opensociety/typescript-config` | `@sabha/typescript-config` | `packages/typescript-config/package.json` |
| [ ] | `pnpm --filter @opensociety/*` | `@sabha/*` | `package.json` scripts, `Dockerfile`, `.github/workflows/*`, `deploy/README.md`, `docs/mobile.md`, `apps/mobile/DEMO.md`, `apps/*/package.json` scripts |
| [ ] | `import … from '@opensociety/…'` | `@sabha/…` | **all** TS/TSX/JS across apps + packages + tests (hundreds of sites; regenerate lockfile) |
| [ ] | `pnpm-lock.yaml` workspace links | regenerate after rename | `pnpm-lock.yaml` |

### B2. Mobile identifiers / EAS

| Done | Current | Target (suggested) | Files |
| --- | --- | --- | --- |
| [ ] | scheme `opensociety` / `opensociety-dev` | `sabha` / `sabha-dev` | `apps/mobile/app.config.js` |
| [ ] | iOS `com.opensociety.app` / `.dev` | `com.sabha.app` / `.dev` (or chosen reverse-DNS) | `app.config.js` |
| [ ] | Android `com.opensociety.app` / `.dev` | matching | `app.config.js` |
| [ ] | EAS submit `applicationId` | matching | `apps/mobile/eas.json` |
| [ ] | Docs EAS project `ankitsejwal/opensociety` | new SABHA Expo project | `docs/mobile.md` (+ Expo dashboard) |
| [ ] | Deep-link test URL `opensociety://gate?…` | `sabha://…` | `apps/api/src/pre-approval-qr.test.ts` |
| [ ] | Storage `opensociety-device-id` | `sabha-device-id` | `apps/mobile/api/client.ts` |
| [ ] | Storage `opensociety-lang` | `sabha-lang` | `apps/mobile/lib/i18n.tsx` |
| [ ] | Persist key `opensociety-query-cache` | `sabha-query-cache` | `apps/mobile/lib/offline/query-client.ts` |

Note: `apps/mobile/app.json` already has `"slug": "sabha"` and `"name": "SABHA"`; EAS `projectId` / `owner` may stay until a new Expo project is created.

### B3. Workers / R2 / queues / health name

| Done | Current | Target | Files |
| --- | --- | --- | --- |
| [ ] | Worker name `opensociety-api` | `sabha-api` | `apps/api/wrangler.jsonc` |
| [ ] | R2 bucket `opensociety-uploads` | `sabha-uploads` | `wrangler.jsonc`, `deploy/api.env.example`, `apps/api/.env.example`, root `.env.example` (`opensociety`) |
| [ ] | Queue `opensociety-push` | `sabha-push` | `wrangler.jsonc`, `docs/mobile.md` |
| [ ] | DLQ `opensociety-push-failed` | `sabha-push-failed` | same |
| [ ] | Health JSON `name: 'opensociety-api'` | `sabha-api` | `apps/api/src/index.ts` |

### B4. Droplet / Docker / CI image tags

| Done | Current | Target | Files |
| --- | --- | --- | --- |
| [ ] | Compose `name: opensociety` | `sabha` | `deploy/compose.yaml` |
| [ ] | `opensociety-api:test` / `opensociety-web:test` | `sabha-api:test` / `sabha-web:test` | `.github/workflows/ci.yml`, `scripts/hosting-smoke.test.mjs` |
| [ ] | `ghcr.io/opencore-x/opensociety-api` / `-web` | new org/repo tags | `deploy/.env.example` |
| [ ] | Dockerfile `@opensociety/*` filters | `@sabha/*` | `Dockerfile` |

### B5. Domain / QR brand tokens

| Done | Current | Target | Notes |
| --- | --- | --- | --- |
| [ ] | `PRE_APPROVAL_QR_PREFIX = 'OS-PA:'` | e.g. `SABHA-PA:` | `packages/shared/src/visitor.ts` — **accept old prefix during migration** so printed passes keep working |
| [ ] | Tests asserting `OS-PA:` / `opensociety://` | update + dual-parse cases | `apps/api/src/pre-approval-qr.test.ts` |

### B6. Docs / comments / brand policy

| Done | Current | Action | Files |
| --- | --- | --- | --- |
| [ ] | Link `https://github.com/opencore-x/opensociety` | point to SABHA repo (or archive note) | `README.md` |
| [ ] | PR link `opencore-x/opensociety/pull/111` | update or leave historical | `docs/screenshots/README.md` |
| [ ] | “branded product build of OpenSociety” / retained technical names | rewrite for independence | `README.md`, `docs/BRAND.md` |
| [ ] | “OpenSociety still needs store records…” | SABHA store records | `docs/mobile.md` |
| [ ] | Package READMEs “OpenSociety” | SABHA | `apps/api/README.md`, `packages/db/README.md` |
| [ ] | `schema.dbml` Project `opensociety` | `sabha` | `packages/db/schema.dbml` |
| [ ] | Log “OpenSociety/SABHA app” | SABHA | `scripts/prepare-cloudflare-pages.mjs` |
| [ ] | CSS comment “OpenSociety design system” | SABHA | `apps/web/src/styles.css` |
| [ ] | Comment refs to `@opensociety/shared` | `@sabha/shared` | `apps/web/src/lib/i18n.tsx`, `apps/mobile/lib/i18n.tsx`, `apps/mobile/components/README.md` |

### B7. ESLint package import paths

| Done | Current | Target | Files |
| --- | --- | --- | --- |
| [ ] | `@opensociety/eslint-config/react` | `@sabha/eslint-config/react` | `apps/web/eslint.config.js` |
| [ ] | `@opensociety/eslint-config/base` | `@sabha/eslint-config/base` | `apps/api/eslint.config.js` |

---

## C. Suggested implementer order

1. Rename packages + lockfile + Dockerfile/CI filters (`@opensociety` → `@sabha`).
2. Update Workers/R2/queue/compose/image identifiers (coordinate with Cloudflare + GHCR).
3. Update mobile schemes/bundle IDs/EAS (requires store + Expo project work).
4. Dual-support QR prefix + deep links; then prefer SABHA prefix for new passes.
5. Rewrite docs/BRAND so independence is the stated model (not “brand overlay”).
6. Regression-tick every checkbox in §A (admin, demo, mobile resident/guard, API roles, wizard, jobs, i18n).

---

## D. Smoke matrix (post-rename)

| Done | Check |
| --- | --- |
| [ ] | `pnpm install && pnpm build && pnpm check-types && pnpm lint && pnpm test` |
| [ ] | `pnpm --filter @sabha/api build:node` |
| [ ] | Web `/demo` full module walk + reset |
| [ ] | Web `/admin` with Clerk (or `x-user-id` admin) |
| [ ] | Mobile demo resident + guard |
| [ ] | Live mobile: approve visitor, redeem QR, clock duty |
| [ ] | Upload round-trip; report PDF/XLSX export |
| [ ] | Webhook create → PENDING → approve |
| [ ] | i18n switch en/hi/te on web + mobile |
| [ ] | Hosting smoke (`scripts/hosting-smoke.test.mjs`) |
| [ ] | Wrangler deploy dry-run / queue names provisioned |

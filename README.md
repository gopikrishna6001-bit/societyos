# SABHA

**Clarity in Community.**

SABHA is a Community Governance & Transparency Platform: resident app, gate desk, and admin dashboard — guests, notices, bills, maintenance, house help, parking, and reports.

| For | What you can do |
| --- | --- |
| **Residents** | Pre-approve guests and share QR passes, approve or deny visitors, read notices, view bills and payment history, raise maintenance tickets, and manage household help and vehicles. |
| **Gate staff** | Register visitors, scan passes or enter codes, check people in and out, verify vehicles, and record duty attendance. |
| **Administrators** | Manage apartments and resident approvals, gate staff, notices, billing, expenses, maintenance tickets, parking, and reports from the web dashboard. |

Brand rules: [docs/BRAND.md](docs/BRAND.md). Capability checklist: [docs/SABHA-CAPABILITY-INVENTORY.md](docs/SABHA-CAPABILITY-INVENTORY.md). Deploy notes: [deploy/README.md](deploy/README.md), [docs/mobile.md](docs/mobile.md).

## Try the demo

The web dashboard has a no-signup demo at `/demo`. The phone app offers **Try demo** on the sign-in screen. Both use fictional sample data in the browser or on device and never call the society API or Clerk.

## Run locally

Use **Node 22** and **pnpm 10.0.0**.

```sh
pnpm install --frozen-lockfile
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Set `DATABASE_URL` (and Clerk credentials for production auth). For local live admin without Clerk, set `VITE_DEV_USER_ID` to the seeded admin id after migrate+seed. Then:

```sh
pnpm --filter @sabha/db db:migrate
pnpm --filter @sabha/db exec node --env-file=../../apps/api/.env src/seed.ts
pnpm dev
```

Open **http://localhost:3000** (marketing + demo) or **http://localhost:3000/admin**. API on **http://localhost:8787**.

Workspace packages are `@sabha/*`. User-facing product name is SABHA.

Do not promote a production deployment without explicit OK.

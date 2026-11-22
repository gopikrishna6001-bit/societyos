# Hosted Live (Clerk + API + Pages)

Goal: `https://cursor-sabha-product-deliver.societyos.pages.dev` signs in with Clerk and talks to a live `sabha-api` Worker backed by Postgres.

## Already done in this repo / account

- Supabase schema **`sabha`** on the existing project (MNR Apartment seeded)
- R2 bucket **`sabha-uploads`**
- Worker config `apps/api/wrangler.jsonc` (R2 + CORS origins for the Pages host)
- GitHub workflow **Deploy sabha-api** (`.github/workflows/deploy-api.yml`)

## What you add (secure form / dashboards — do not paste into chat)

To reach **Clerk** and **Cloudflare Workers**, the app needs values in the secure form:

1. `CLERK_SECRET_KEY`
2. `CLERK_PUBLISHABLE_KEY`
3. `CLERK_WEBHOOK_SECRET`
4. `CLOUDFLARE_API_TOKEN` (Workers Scripts Edit + Account read)
5. `CLOUDFLARE_ACCOUNT_ID`

Also set these **GitHub Actions secrets** on `gopikrishna6001-bit/societyos` (Settings → Secrets):

| Secret | Purpose |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Deploy Worker |
| `CLOUDFLARE_ACCOUNT_ID` | Deploy Worker |
| `DATABASE_URL` | Worker runtime Postgres (see format below) |
| `CLERK_SECRET_KEY` | Worker auth |
| `CLERK_PUBLISHABLE_KEY` | Worker + optional webhook setup |
| `CLERK_WEBHOOK_SECRET` | `/webhooks/clerk` |

### DATABASE_URL format (Supabase pooler + sabha search_path)

```
postgresql://sabha_app.wzchqxwwezklxsxmjvyt:PASSWORD@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require&options=-csearch_path%3Dsabha
```

Password for role `sabha_app` was provisioned during setup. Reset it in the Supabase SQL editor if needed (`ALTER ROLE sabha_app …`), then update the GitHub secret.

## Cloudflare Pages build variables

On the **societyos** Pages project → Settings → Environment variables (Production **and** Preview):

| Variable | Value |
| --- | --- |
| `VITE_API_URL` | `https://sabha-api.<your-subdomain>.workers.dev` (after first deploy) |
| `VITE_CLERK_PUBLISHABLE_KEY` | same publishable key as Clerk |

Then **Retry deployment** so the SPA rebuilds with Live mode (no `/admin` → `/demo` redirect).

## Clerk application checklist

1. Create a Clerk application (email/password is enough).
2. Add allowed origins / redirect URLs for the Pages host.
3. Create a webhook to `https://sabha-api…/webhooks/clerk` for `user.created` / `user.updated` (maps `clerk_id` → `sabha.users`).
4. After first sign-in, an admin must approve the user **or** set your user row’s `clerk_id` to your Clerk user id and `role=ADMIN` / `status=APPROVED` (MNR admin row already exists for `gopikrishna6001@gmail.com`).

## Deploy API

```sh
# After GitHub secrets exist:
gh workflow run deploy-api.yml
# or merge to main (paths under apps/api|packages/db|packages/shared)
```

Smoke:

```sh
curl -s https://sabha-api.<subdomain>.workers.dev/health
```

## Local vs hosted

| Surface | Auth | Data |
| --- | --- | --- |
| Local `pnpm dev` | `VITE_DEV_USER_ID` (no Clerk) | Local Postgres / MNR seed |
| Pages without vars | none → **/demo** | In-browser demo |
| Pages + vars above | **Clerk** | Supabase `sabha` schema via Worker |

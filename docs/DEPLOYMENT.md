# Deployment

## Target

Cloudflare Pages can host the Vite build. Supabase hosts Auth, Postgres, Storage, and later Edge Functions.

## Before the first deploy

1. Create a new Supabase project. The host previously written in this repo does not resolve.
2. Apply `supabase/migrations/20261118120000_platform_foundation.sql` in the SQL editor. Do not also run `supabase/schema.sql`.
3. Confirm Auth email sign-up matches how residents will be invited.
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Pages project. Do not set the service-role key in a `VITE_` variable.
5. Run `npm ci`, `npm test`, `npm run test:db` against a disposable database, and `npm run build`.
6. Publish `dist`. The app is a single-page router, so Pages needs a fallback to `index.html`.

## What this build does not do

- The current Pages deployment does not have a working Supabase project. Its client is built with `https://wzchqxwwezklxsxmjvyt.supabase.co`, and that host does not resolve. A replacement project could not be created on 19 November 2026 because the free organization has reached its two-project limit. The existing Yasvik store project must not receive this migration.
- It does not connect to a live project by itself.
- It does not send email or WhatsApp.
- It does not redact a PDF. Officers upload the redacted file separately.
- It does not start from the old plaintext PIN login. That function remains for the legacy route and should not be the production sign-in.

## Backup

Use Supabase's scheduled backups for the new project before any pilot. Published statement versions and journal rows are immutable from the application, which is not a substitute for a database backup.

## Local check

`npm run dev` serves the platform at `/` and the older screens at `/legacy`. `npm run preview` serves the production build.

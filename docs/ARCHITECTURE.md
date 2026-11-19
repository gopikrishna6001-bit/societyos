# Architecture

## Stack

React 18 and Vite 5 render the interface. Tailwind 3 supplies utilities for the new platform with preflight turned off, so the older inline-styled screens keep their layout. Routing is React Router: `/` is SABHA and `/legacy` is the earlier shell, still implemented in `src/SocietyOS.jsx`. Supabase Auth, PostgreSQL row-level security, and storage are the backend. Vitest and React Testing Library cover units. Playwright covers the unconfigured browser smoke path. PostgreSQL assertions live in `supabase/tests` and run with `npm run test:db`.

Vite stays on 5. Vitest 2 matches that major version.

## Layers

- `src/platform` presents the new workflows and calls RPCs. It does not compute fund balances.
- `src/components` is the earlier interface. Deferred modules are lazy-loaded and removed from the primary role menus. The product name on those screens is SABHA. The file and storage names are unchanged.
- `src/lib/supabase.js` creates one browser client. Requests time out after 12 seconds. A missing environment rejects instead of hanging.
- `supabase/migrations/20261118120000_platform_foundation.sql` owns identity, the ledger, concerns, governance, documents, notifications, and policies.
- Security-definer helpers live in the `private` schema, which PostgREST does not expose. Authorization reads `community_memberships`, never JWT user metadata.

## Ledger

`journal_entries` and `journal_lines` are the only source of fund balances. Funds are credit-normal. Banks are debit-normal. `post_journal` rejects unbalanced lines and repeated idempotency keys whose payload differs. Posted journal rows cannot be updated or deleted. Inter-fund transfers are a transfer type, so consolidated income excludes them.

## What is not live

No Supabase project is connected from this repository. The previous host does not resolve. The app shows a configuration screen instead of sample balances. Local PostgreSQL can apply the migration and the SQL assertions. That is not a hosted integration.

The legacy phone/PIN edge function still compares a PIN stored by that function. The new platform does not call it. New sign-in is email and password through Supabase Auth.

Redaction is a second uploaded file, not an automatic PDF transform. Excel export of fund balances is CSV. A statement can be printed from the browser. Email and WhatsApp are not delivered. Notification rows are in-app only.

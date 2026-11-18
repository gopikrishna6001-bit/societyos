# Testing

## Commands

| Command | What it runs |
|---|---|
| `npm test` | Vitest: legacy login failures, money formatting, unconfigured platform, sign-out |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright smoke against `npm run dev` |
| `npm run test:db` | Ledger, privacy, election, ticket, reconciliation, and statement assertions |

Playwright needs Chromium installed (`npx playwright install chromium`). The e2e file expects no Supabase env, which is the honest unconfigured state.

## Database coverage

`supabase/tests/ledger_rls.sql` checks the due-date helper, idempotent posting, payload mismatch, unbalanced rejection, transfer neutrality, collection totals, treasurer limit, payment, journal immutability, the ban on appointing an auditor, election certification, an auditor review that cannot change the amount, ticket numbering and visibility, cross-community isolation, a zero-difference reconciliation, statement due date, publication, and snapshot immutability.

Authenticated requests in that file set `request.jwt.claim.sub` and `SET ROLE authenticated`, so policies apply. Immutability of a published snapshot is also asserted as the table owner, because a normal member is denied the update before the trigger runs.

## Not covered by an automated browser session

A live treasurer-to-resident walkthrough needs a Supabase project. The SQL suite is the financial and permission proof until that project exists. Frontend tests do not claim a hosted login succeeded.

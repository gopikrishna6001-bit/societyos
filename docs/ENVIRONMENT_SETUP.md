# Environment setup

The product name is SABHA. The environment variable names below are unchanged.

## Frontend

Copy `env.example` to `.env.local`.

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Both must be set or the platform shows a configuration message and makes no financial request. The anon key is the only key that belongs in the browser.

`VITE_AUTH_URL` is optional and only used by the legacy phone lookup. `VITE_SOCIETY_ID` is only used by the legacy screens.

The value `https://wzchqxwwezklxsxmjvyt.supabase.co` does not resolve. Do not restore it.

## Database tests

PostgreSQL 16 is used locally:

```
npm run test:db
```

`scripts/test-db.sh` drops and creates `societyos_test`, applies `supabase/tests/bootstrap.sql`, the migration, and `supabase/tests/ledger_rls.sql`. Bootstrap is local-only.

## Node

`npm ci` installs from the lockfile. `node_modules` is not part of the repository. Vite 5 and Vitest 2 stay together. Do not upgrade Vitest to 5 without upgrading Vite.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm test`
- `npm run test:watch`
- `npm run test:e2e`
- `npm run test:db`

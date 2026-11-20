#!/usr/bin/env bash
# Apply the platform migration to a throwaway database and run SQL assertions.
set -euo pipefail
cd "$(dirname "$0")/.."

DB_NAME="${SOCIETYOS_TEST_DB:-societyos_test}"
PSQL=(sudo -u postgres psql -v ON_ERROR_STOP=1)

"${PSQL[@]}" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"
"${PSQL[@]}" -d postgres -c "CREATE DATABASE ${DB_NAME};"
"${PSQL[@]}" -d "$DB_NAME" -f supabase/tests/bootstrap.sql
"${PSQL[@]}" -d "$DB_NAME" -f supabase/migrations/20261118120000_platform_foundation.sql
"${PSQL[@]}" -d "$DB_NAME" -f supabase/migrations/20261119120000_invitations.sql
"${PSQL[@]}" -d "$DB_NAME" -f supabase/migrations/20261120180000_payment_proofs_action_centre.sql
"${PSQL[@]}" -d "$DB_NAME" -f supabase/migrations/20261120190000_notices_visitors_amenities.sql
"${PSQL[@]}" -d "$DB_NAME" -f supabase/migrations/20261120200000_governance_ops_assistant.sql
"${PSQL[@]}" -d "$DB_NAME" -f supabase/tests/ledger_rls.sql
"${PSQL[@]}" -d "$DB_NAME" -f supabase/tests/invitations.sql
"${PSQL[@]}" -d "$DB_NAME" -f supabase/tests/payment_proofs.sql
"${PSQL[@]}" -d "$DB_NAME" -f supabase/tests/governance_ops.sql

echo "database tests passed"

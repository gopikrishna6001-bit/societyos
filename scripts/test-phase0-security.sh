#!/usr/bin/env bash
# Disposable DB: foundation + legacy stubs (hosted-like grants) + phase0 migrations + assertions.
set -euo pipefail
cd "$(dirname "$0")/.."

DB_NAME="${SOCIETYOS_PHASE0_TEST_DB:-societyos_phase0_test}"
PSQL=(sudo -u postgres psql -v ON_ERROR_STOP=1)

"${PSQL[@]}" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"
"${PSQL[@]}" -d postgres -c "CREATE DATABASE ${DB_NAME};"
"${PSQL[@]}" -d "$DB_NAME" -f supabase/tests/bootstrap.sql
"${PSQL[@]}" -d "$DB_NAME" -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF; END \$\$;"
"${PSQL[@]}" -d "$DB_NAME" -f supabase/migrations/20261118120000_platform_foundation.sql
"${PSQL[@]}" -d "$DB_NAME" -f supabase/migrations/20261119120000_invitations.sql
# Hosted still grants anon EXECUTE on several RPCs; restore that baseline before phase0.
"${PSQL[@]}" -d "$DB_NAME" -f supabase/tests/phase0_legacy_stubs.sql
"${PSQL[@]}" -d "$DB_NAME" <<'SQL'
GRANT EXECUTE ON FUNCTION public.account_balances(uuid) TO anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.resident_dashboard(uuid) TO anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.bank_balances(uuid) TO anon, PUBLIC;
SQL

echo "== before phase0 (hosted-like) =="
"${PSQL[@]}" -d "$DB_NAME" -At <<'SQL'
SELECT 'anon|' || p.proname || '|' || has_function_privilege('anon', p.oid, 'EXECUTE')
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'is_committee','account_balances','trigger_send_whatsapp','resident_dashboard','bank_balances'
  )
ORDER BY 1;
SELECT 'pin_anon|' || has_column_privilege('anon', 'public.residents', 'pin', 'SELECT');
SQL

"${PSQL[@]}" -d "$DB_NAME" -f supabase/migrations/20261120163000_phase0_security.sql
"${PSQL[@]}" -d "$DB_NAME" -f supabase/migrations/20261120170000_whatsapp_dispatch_hardening.sql
"${PSQL[@]}" -d "$DB_NAME" -f supabase/tests/phase0_security.sql

echo "== after phase0 =="
"${PSQL[@]}" -d "$DB_NAME" -At <<'SQL'
SELECT 'anon|' || p.proname || '|' || has_function_privilege('anon', p.oid, 'EXECUTE')
     || '|auth|' || has_function_privilege('authenticated', p.oid, 'EXECUTE')
     || '|secdef|' || p.prosecdef
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'trigger_send_whatsapp','generate_invoice_number','generate_ticket_number',
    'is_committee','is_super_admin','has_role','get_my_flat','get_my_society_id','get_resident_id',
    'account_balances','resident_dashboard','bank_balances',
    'claim_whatsapp_batch','finalize_whatsapp_dispatch'
  )
ORDER BY p.proname;
SELECT 'pin_anon|' || has_column_privilege('anon', 'public.residents', 'pin', 'SELECT')
    || '|pin_auth|' || has_column_privilege('authenticated', 'public.residents', 'pin', 'SELECT');
SQL

echo "phase0 disposable database tests passed"

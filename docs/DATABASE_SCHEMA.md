# Database schema

The migration is `supabase/migrations/20261118120000_platform_foundation.sql`. Apply it to an empty Supabase project. Do not apply the older `supabase/schema.sql` on the same database: it uses overlapping table names, integer money, and policies that allow every row.

Every community-owned row carries `community_id`. Money columns are `numeric(14,2)`. Timestamps are `timestamptz` stored in UTC. The first community timezone is `Asia/Kolkata`.

## Identity

`communities`, `community_settings`, `profiles`, `units`, `unit_occupancies`, `community_memberships`, `auditor_elections`, `auditor_ballots`, `auditor_terms`.

Roles are `platform_admin`, `committee_admin`, `treasurer`, `resident_auditor`, and `resident`. `resident_auditor` is inserted only by `certify_auditor_election`.

## Finance

`bank_accounts` stores a label and masked number for financial roles. `accounts` is the chart: `fund` or `bank`. `journal_entries` and `journal_lines` are the ledger. Triggers reject updates and deletes of journal rows and of `financial_statement_versions`.

Also: `expense_categories`, `expenses`, `expense_approvals`, `collection_periods`, `maintenance_demands`, `collections`, `bank_reconciliations`, `bank_statement_lines`, `financial_statements`, `financial_statement_versions`, `audit_reviews`, `approval` limits on `community_settings`.

Closing balance for a fund is opening + receipts − payments + transfers in − transfers out + adjustment net, derived in `account_balances`.

## Concerns, governance, documents

`tickets`, `ticket_counters`, `ticket_updates`, `ticket_status_history`. Ticket numbers use the Asia/Kolkata year.

`meetings`, `resolutions`, `resolution_votes`, `contribution_campaigns`.

`documents`, `document_versions`, `notifications`, `audit_logs`.

## Functions residents and officers call

`create_community`, `grant_role`, `add_unit`, `add_occupancy`, `add_bank_account`, `open_fund`, `post_journal`, `account_balances`, `bank_balances`, `open_collection_period`, `record_collection`, `collection_summary`, `create_expense`, `decide_expense`, `pay_expense`, `review_subject`, `statement_due_on`, `start_reconciliation`, `import_statement_lines`, `match_statement_line`, `complete_reconciliation`, `close_month`, `submit_statement`, `review_statement`, `publish_statement`, `create_ticket`, `transition_ticket`, `create_meeting`, `record_minutes`, `propose_resolution`, `cast_vote`, `close_vote`, `open_auditor_election`, `cast_auditor_ballot`, `certify_auditor_election`, `register_document`, `resident_dashboard`.

`add_bank_account` returns the bank ledger account id.

`supabase/tests/bootstrap.sql` creates local stand-ins for `auth.users` and `auth.uid()`. Do not run it on hosted Supabase.

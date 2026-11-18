# API specification

The browser uses the Supabase client. Tables are readable only where a policy allows. Writes that matter go through the functions below. Arguments use the `p_` names in the migration.

Authenticated users can execute the public functions. Anonymous users cannot. The `private` schema is not exposed.

## Identity

- `create_community(name, address, city, treasurer_limit, committee_limit, statement_due_day = 10) -> community id`
- `grant_role(community, email, role) -> membership id` — rejects `resident_auditor`
- `add_unit(community, block, number) -> unit id`
- `add_occupancy(community, unit_number, email, relationship) -> occupancy id` and grants `resident`

## Ledger and finance

- `add_bank_account(community, label, masked) -> bank ledger account id`
- `open_fund(community, code, name, kind, description) -> account id`
- `post_journal(community, type, date, narration, idempotency_key, lines) -> entry id`
- `account_balances(community) -> fund rows with opening, receipts, payments, transfers, closing`
- `bank_balances(community) -> name and book balance`
- `open_collection_period(community, financial_year, month, due_on, amount) -> period id`
- `record_collection(demand, amount, paid_on, mode, bank_reference, receipt_number, idempotency_key, bank_account, fund_account) -> collection id`
- `collection_summary(community, period) -> expected, collected, outstanding, paid, partial, unpaid, percent`
- `create_expense(...) -> expense id`
- `decide_expense(expense, decision, comments)`
- `pay_expense(expense, bank_account, mode, reference, idempotency_key) -> journal entry id`
- `review_subject(community, subject_type, subject_id, status, comments) -> review id`
- `statement_due_on(period_end, due_day) -> date`
- `start_reconciliation(community, bank_account, start, end, opening, closing) -> id`
- `import_statement_lines(reconciliation, lines) -> count`
- `match_statement_line(line, entry)`
- `complete_reconciliation(reconciliation) -> difference, or null while lines are unmatched. Status stays open unless the difference is zero and every line is matched`
- `close_month(community, start, end) -> statement id`
- `submit_statement(statement)`
- `review_statement(statement, status, comments)`
- `publish_statement(statement, with_exceptions = false) -> version`. Requires `reconciled_and_reviewed` even when exceptions are allowed
- `append_statement_version(statement, with_exceptions = false) -> next version`
- `reverse_entry(entry, date, narration, idempotency_key) -> reversal entry id`
- `resident_dashboard(community) -> jsonb`

## Concerns, governance, documents

- `create_ticket(...) -> ticket number`
- `transition_ticket(ticket, status, note, assignee = null)`
- `create_meeting(community, type, title, held_on, venue) -> id`
- `record_minutes(meeting, minutes)`
- `propose_resolution(community, meeting, title, description, voting_starts, voting_ends) -> id`
- `cast_vote(resolution, vote)`
- `close_vote(resolution) -> result`
- `open_auditor_election(...)`, `cast_auditor_ballot(election, candidate)`, `certify_auditor_election(election)`
- `register_document(..., storage_bucket, storage_path) -> id` — a public invoice with `redacted = false` is rejected. A public file must use `community-published`. Any other access class must use `community-originals`. The path's first segment must be the community id

Direct table updates from the browser are revoked except `notifications.read_at`.

The legacy data helpers in `src/lib/supabase.js` still target the old table names. They are not the API of the new ledger.

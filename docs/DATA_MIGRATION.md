# Data migration

The first community may arrive as spreadsheets. Import through the functions so validation and ledger rules still apply. Do not insert journal balances by hand.

## Units

The Residents screen accepts a CSV with `block, number`. It shows duplicate and blank-number errors before any row is written. A failed row stops the loop; rows already accepted stay, and the summary is the unit list after reload. There is no silent delete. Correct a wrong unit with a follow-up administrative action rather than removing history.

## People

Residents register with email and password first. `add_occupancy` then links that email to a unit as owner or tenant and grants the resident role. An unknown email is rejected.

## Opening balances and history

Post opening balances with `post_journal` using type `opening` and an idempotency key such as `opening:<fund>:<date>`. Historical collections use `record_collection`. Historical expenses use `create_expense` and the approval functions. If a historical figure cannot be tied to a statement or bank line, record that limitation in the expense or statement comment. Do not mark it verified.

`publish_statement` will refuse a period whose paid expenses are not reviewed and whose reconciliation is open. Importing history does not make it audited.

## Documents

Upload the original and, for anything residents should see, a separate file with bank details, phone numbers, addresses, tax identifiers, signatures, and payment credentials removed. Register the public copy with `redacted = true`. The application does not strip those details from a PDF.

## Old SocietyOS tables

`supabase/schema.sql` is a prototype. Its policies are permissive and its money columns are integers. Leave it unused on the new project. If rows must be copied, map them explicitly and label anything that was not independently checked.

## Rollback

Journal entries are not deleted. A wrong posting is corrected with a reversal entry that references the original. A bad unit import is corrected by a later change, not by truncating the table.

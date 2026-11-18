# Financial workflows

Balances are posted, not typed. A retry uses the same idempotency key and returns the original row. A different payload with the same key is rejected.

## Funds

`open_fund` creates a fund account. An opening balance is a journal entry of type `opening`, not an edit of a balance column. A transfer debits one fund and credits the other. Consolidated receipts ignore transfer lines.

## Collections

1. Treasurer opens a period with a financial year, month, due date, and per-unit amount.
2. The function inserts one demand per current unit.
3. Treasurer records a receipt against a demand, a bank ledger account, and a fund. The receipt cannot exceed the outstanding demand.
4. `collection_summary` reports expected, collected, outstanding, and paid, partial, and unpaid unit counts.

## Expenses

`create_expense` requires a known category and a fund in the same community. Emergency expenses require a justification. `decide_expense` records the approver, decision, and comment.

- At or under the treasurer limit: treasurer.
- Between the treasurer limit and the committee limit: committee admin. A treasurer who is not a committee admin is rejected.
- Above the committee limit: an approved resolution is required.

`pay_expense` posts a balanced payment after approval, unless the community setting allows an emergency to be paid first and the expense is marked emergency. The default is that early payment is off.

## Reconciliation

`start_reconciliation` stores the statement opening and closing. CSV lines have `date`, `description`, `direction` (`credit` or `debit`), and `amount`. `complete_reconciliation` raises when the difference is not zero or a line is unmatched, and it leaves the status open. The difference is statement closing minus statement opening minus the period's book movement.

## Statements

`statement_due_on` is the first day of the next month plus due-day minus one. A period ending 31 March with due day 10 is due 10 April.

`close_month` opens a draft. `submit_statement` and `review_statement` move it forward. `publish_statement` refuses unless the review status is reconciled and reviewed, paid expenses in the period are verified or resolved, and reconciliations ending in the period are reconciled. It writes an immutable snapshot and notifies members. Nothing marks a statement verified automatically. Overdue statements remain readable by residents.

Auditor verification is a review record. It is not a legal or commercial certification.

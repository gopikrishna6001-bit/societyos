# Roles and permissions

Permissions are PostgreSQL row-level security policies plus security-definer functions. Hiding a button is not the control.

| Role | May | May not |
|---|---|---|
| Platform administrator | Create the community, manage setup, grant non-auditor roles | Appoint an auditor, silently rewrite posted journals |
| Committee administrator | Units, meetings, resolutions, ticket assignment, approvals inside policy | Treat a treasurer-only limit as their own when the expense is inside the treasurer limit and they are not treasurer |
| Treasurer | Collections, expenses, funds, reconciliation, statement preparation, payments | Approve an expense above `treasurer_approval_limit` unless they also hold committee admin, and not above the committee limit without an approved resolution |
| Resident auditor | Review expenses, reconciliations, and statements; record verified, clarification, disputed, or resolved | Edit the amount, review an expense they submitted, or be appointed with `grant_role` |
| Resident | Read published figures, aggregates, public concerns, decisions, and public documents; raise concerns; vote for an occupied unit | Read another unit's demand, a private ticket, an original invoice, or a full bank account number |

`collection_summary` and `account_balances` return aggregates to any member. Demand and collection rows are limited to financial roles and the occupying resident.

Bank account rows and journal lines are limited to treasurer, committee admin, auditor, and platform admin. `bank_balances` returns the book balance without the account number.

A public document in category `invoice` must be marked redacted. Originals go to the private `community-originals` bucket. Published files go to `community-published`. Storage policies, when the storage schema exists, follow the same split.

Cross-community reads fail `private.is_member`. The SQL suite creates a second community and checks that isolation.

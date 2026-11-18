# Governance rules

These are configurable community settings. The migration stores proposed defaults. It does not treat the examples in the product brief as fixed rupee amounts.

| Setting | Proposed default | Where it lives |
|---|---|---|
| Auditor seats | 1 | `community_settings.auditor_seats` |
| Auditor term | 12 months | `auditor_term_months` |
| Election quorum | 50% of occupied units | `election_quorum_percent` |
| Voting eligibility | One vote per occupied unit | `voting_unit` = `unit` |
| Committee approval quorum | 1 distinct approver | `committee_quorum` |
| Expense limits | Required at community creation, no prefilled amount | `treasurer_approval_limit`, `committee_approval_limit` |
| Emergency payment before approval | Off | `emergency_pay_before_approval` |
| Statement publication deadline | 10th of the following month | `statement_due_day` |
| Replacement of an auditor | A new election, then `certify_auditor_election` | election functions |
| Statement amendment | A published version is immutable. A correction is a later version, not an edit | `financial_statement_versions` trigger |
| Original documents | Committee, treasurer, auditor, platform admin | storage and document policies |

## Election

`open_auditor_election` opens a dated poll. Occupied units vote once with `cast_auditor_ballot`. `certify_auditor_election` counts occupied units as the electorate, requires the configured quorum and a unique leading candidate, then inserts `auditor_terms` and a `resident_auditor` membership. `grant_role` rejects `resident_auditor`.

## Resolutions

`propose_resolution` starts `under_discussion` with a voting window. `cast_vote` accepts yes, no, or abstain from a profile that occupies a unit, one vote for that unit. `close_vote` applies the quorum. A messaging-app poll is not written as an approved resolution.

## Concerns

Statuses run open, assigned, in progress, awaiting resident, resolved, closed, with reopened, on hold, and rejected. Rejection requires a note. The creator of a resolved ticket can close or reopen it. Committee members change status through `transition_ticket`, which appends history. There is no delete path for tickets.

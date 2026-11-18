# Product requirements

SocietyOS is the technical foundation for an Apartment Transparency & Accountability Platform.

Core promise: every rupee, every decision, every concern.

The product is not a full apartment-management suite. It answers ten resident questions from permissioned, auditable records:

1. How much maintenance was collected?
2. How much was spent?
3. Where was it spent?
4. Where are the supporting invoices?
5. How much corpus is available?
6. Does the bank balance match the books?
7. Who approved the expenses?
8. Have resident auditors reviewed the records?
9. What happened to concerns residents raised?
10. What decisions were taken and implemented?

## In scope

- Community dashboard for residents, committee, and elected auditors.
- Separate fund ledgers: maintenance, corpus, special, emergency, other.
- Maintenance collection periods, private dues, public aggregates.
- Expenses, configurable approval limits, invoices, corpus use.
- Bank statement CSV import and reconciliation that stays open while a difference remains.
- Versioned monthly statements. Publication is a deliberate action.
- Resident-elected auditors. Auditors do not edit original transactions.
- Public and private concerns, numbered `SOC-YYYY-XXXXX`.
- Meetings, resolutions, one vote per occupied unit, quorum from settings.
- Documents with public, committee, and unit-private access. A public invoice must be a separate redacted file.
- In-app notifications.

## Deferred from the old SocietyOS navigation

Gate and staff, amenities, volunteers, the WhatsApp centre, and the AI assistant stay in the repository and remain reachable from the legacy route. They are not primary navigation for the new platform. WhatsApp is a future notification channel only.

## Fixed decisions

- Resident auditors are elected by residents.
- Published financial information is visible to residents.
- Individual invoices shown to residents are redacted copies.
- A treasurer approves only inside the community's configured limit.
- Amounts above that limit need committee approval, and amounts above the committee limit need an approved resolution.
- Public and private concerns both exist.
- A monthly financial statement is mandatory. The due day is configurable and starts at the 10th of the following month.

Illustrative rupee thresholds are not product constants.

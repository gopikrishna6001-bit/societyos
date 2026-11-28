/**
 * SocietyOS tables renamed when the SABHA ledger reused the original names.
 *
 * Confirmed on hosted project wzchqxwwezklxsxmjvyt (information_schema, 19 Nov 2026).
 * SABHA screens must keep reading public.expenses, public.meetings,
 * public.notifications, public.resolutions, public.bank_accounts and
 * public.expense_categories. Those tables use community_id and a different column set.
 *
 * legacy_expenses.vendor_id has no foreign key to vendors, so PostgREST cannot embed vendors(name).
 */

export const LEGACY_EXPENSES = "legacy_expenses";
export const LEGACY_MEETINGS = "legacy_meetings";
export const LEGACY_NOTIFICATIONS = "legacy_notifications";
export const LEGACY_RESOLUTIONS = "legacy_resolutions";
export const LEGACY_BANK_ACCOUNTS = "legacy_bank_accounts";
export const LEGACY_EXPENSE_CATEGORIES = "legacy_expense_categories";

export const LEGACY_EXPENSE_COLUMNS = [
  "id",
  "society_id",
  "category_id",
  "description",
  "amount",
  "gst_amount",
  "tds_amount",
  "net_amount",
  "vendor_id",
  "invoice_number",
  "receipt_url",
  "payment_method",
  "payment_ref",
  "expense_date",
  "status",
  "approved_by",
  "approved_at",
  "rejected_reason",
  "recurring",
  "recurrence",
  "notes",
  "created_by",
  "created_at",
  "category",
];

export const LEGACY_MEETING_COLUMNS = [
  "id",
  "society_id",
  "title",
  "type",
  "date",
  "time",
  "venue",
  "meeting_link",
  "organiser_id",
  "organiser_name",
  "agenda",
  "quorum_required",
  "quorum_met",
  "attendees",
  "rsvp",
  "status",
  "minutes_draft",
  "minutes_final",
  "minutes_approved",
  "action_items",
  "recording_url",
  "created_at",
];

export const LEGACY_NOTIFICATION_COLUMNS = [
  "id",
  "society_id",
  "resident_id",
  "title",
  "body",
  "type",
  "link_to",
  "read",
  "created_at",
];

export const SABHA_ONLY_EXPENSE_COLUMNS = [
  "community_id",
  "expense_number",
  "occurred_on",
  "fund_account_id",
  "payee",
  "payment_mode",
  "payment_reference",
  "approval_status",
  "auditor_status",
  "payment_status",
  "journal_entry_id",
];

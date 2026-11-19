export const RESIDENT_READ_COLUMNS = [
  "id", "society_id", "flat_id", "flat_number", "name", "phone", "email", "type",
  "gender", "date_of_birth", "profile_photo", "move_in_date", "move_out_date",
  "whatsapp_opt_in", "email_opt_in", "portal_access", "status", "notes",
  "created_at", "last_login", "is_super_admin", "block", "auth_user_id",
].join(",");

export const RESIDENT_SECRET_FIELDS = ["pin", "pin_hash", "portal_pin", "id_number", "id_document_url", "id_type"];

export function withoutResidentSecrets(row) {
  if (!row || typeof row !== "object") return row;
  const copy = { ...row };
  for (const field of RESIDENT_SECRET_FIELDS) delete copy[field];
  return copy;
}

export function roleFromResident(resident) {
  if (!resident) return null;
  if (resident.is_super_admin) return "super_admin";
  const membership = Array.isArray(resident.committee_members) ? resident.committee_members[0] : null;
  if (membership?.role) return membership.role;
  return resident.type === "tenant" ? "tenant" : "resident";
}

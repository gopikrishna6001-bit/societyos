/** Inbox helpers — map event types to screens and everyday labels. */

export function notificationTarget(note) {
  const type = note?.event_type || "";
  if (type === "payment_proof_submitted") return "collections";
  if (type.startsWith("payment_proof")) return "finance";
  if (type.includes("visitor")) return "visitors";
  if (type.includes("ticket") || type.includes("concern")) return "concerns";
  if (type.includes("meeting") || type.includes("resolution")) return "decisions";
  if (type.includes("notice")) return "notices";
  if (type.includes("amenity") || type.includes("booking")) return "amenities";
  return "notifications";
}

export function notificationKind(eventType) {
  const type = String(eventType || "");
  if (type.includes("visitor")) return "Guests";
  if (type.includes("payment") || type.includes("proof")) return "Bills";
  if (type.includes("ticket") || type.includes("concern")) return "Maintenance";
  if (type.includes("meeting") || type.includes("resolution") || type.includes("vote")) return "Meetings";
  if (type.includes("notice")) return "Notices";
  if (type.includes("amenity") || type.includes("booking")) return "Bookings";
  return "Update";
}

export function formatNoticeTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

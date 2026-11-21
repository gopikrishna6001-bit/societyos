/** OpenSociety-style information architecture for SABHA.
 * Resident app: everyday living. Admin dashboard: society operations.
 */

import { isFinanceOps, isCommittee } from "./roleCopy.js";

export function isOpsRole(roles = []) {
  return isFinanceOps(roles) || isCommittee(roles) || roles.includes("resident_auditor");
}

/** Bottom tabs for residents (OpenSociety mobile EVERYDAY + notices). */
export const RESIDENT_TABS = [
  ["home", "Home"],
  ["visitors", "Guests"],
  ["finance", "Bills"],
  ["notices", "Notices"],
];

/** Resident More sheet — household + secondary (OpenSociety HOUSEHOLD pattern). */
export const RESIDENT_MORE = [
  ["concerns", "Maintenance"],
  ["amenities", "Book hall"],
  ["decisions", "Meetings"],
  ["notifications", "Alerts"],
  ["documents", "Documents"],
  ["profile", "Profile"],
];

/** Admin sidebar — OpenSociety /admin NAV mapped to SABHA screens. */
export const ADMIN_NAV = [
  ["home", "Overview"],
  ["units", "Flats"],
  ["visitors", "Guests"],
  ["concerns", "Maintenance"],
  ["finance", "Billing"],
  ["expenses", "Expenses"],
  ["notices", "Notices"],
  ["decisions", "Meetings"],
  ["staff", "Staff"],
  ["amenities", "Amenities"],
  ["assets", "Property"],
  ["documents", "Documents"],
  ["notifications", "Alerts"],
  ["settings", "Settings"],
  ["profile", "Profile"],
];

export function residentHomeShortcuts() {
  return [
    { id: "visitors", label: "Guests", hint: "Invite someone and share a pass code" },
    { id: "finance", label: "Bills", hint: "Maintenance due and payment proof" },
    { id: "notices", label: "Notices", hint: "Official society updates" },
    { id: "concerns", label: "Maintenance", hint: "Raise a complaint and track it" },
  ];
}

export function residentHouseholdLinks() {
  return [
    { id: "amenities", label: "Book hall", hint: "Clubhouse and common spaces" },
    { id: "decisions", label: "Meetings", hint: "Upcoming meetings and votes" },
    { id: "notifications", label: "Alerts", hint: "Payment and complaint updates" },
    { id: "profile", label: "Profile", hint: "Your login and roles" },
  ];
}

export function adminHomeShortcuts(roles = []) {
  const items = [
    { id: "finance", label: "Billing", hint: "Dues, proofs, and collections" },
    { id: "concerns", label: "Maintenance", hint: "Open resident complaints" },
    { id: "visitors", label: "Guests", hint: "Passes and gate check-in" },
    { id: "notices", label: "Notices", hint: "Post society updates" },
  ];
  if (roles.includes("treasurer") || isCommittee(roles)) {
    items.splice(1, 0, { id: "expenses", label: "Expenses", hint: "Approve and pay society spend" });
  }
  return items;
}

export function canSeePage(roles, id) {
  const committee = isCommittee(roles);
  const treasurer = roles.includes("treasurer");
  const auditor = roles.includes("resident_auditor");
  const financeOps = committee || treasurer;
  if (id === "units" || id === "settings") return committee;
  if (id === "staff") return committee || treasurer;
  if (id === "funds" || id === "expenses" || id === "transactions" || id === "reconciliation" || id === "reviews" || id === "history") {
    return financeOps || auditor;
  }
  if (id === "collections") return true;
  return [
    "home", "finance", "concerns", "decisions", "documents", "notifications", "profile",
    "notices", "visitors", "amenities", "assets", "assistant",
  ].includes(id);
}

/** Everyday society-app language by role (Resident360 / OpenSociety style). */

export function isFinanceOps(roles = []) {
  return roles.some((role) => ["treasurer", "resident_auditor", "committee_admin", "platform_admin"].includes(role));
}

export function isTreasurer(roles = []) {
  return roles.includes("treasurer");
}

export function isCommittee(roles = []) {
  return roles.includes("committee_admin") || roles.includes("platform_admin");
}

/** Primary tab / sidebar labels (OpenSociety vocabulary). */
export function navLabel(id, roles = [], mode = "resident") {
  const ops = mode === "admin" || isFinanceOps(roles);
  const map = {
    home: mode === "admin" ? "Overview" : "Home",
    finance: mode === "admin" ? "Billing" : "Bills",
    concerns: "Maintenance",
    decisions: "Meetings",
    collections: ops ? "Collect dues" : "Pay dues",
    expenses: "Expenses",
    funds: "Society funds",
    transactions: ops ? "All payments" : "My payments",
    reconciliation: "Bank match",
    reviews: "Audit checks",
    statements: "Monthly report",
    notices: "Notices",
    visitors: "Guests",
    amenities: mode === "admin" ? "Amenities" : "Book hall",
    assets: "Property",
    staff: "Staff",
    assistant: "Ask SABHA",
    documents: "Documents",
    notifications: "Alerts",
    profile: "Profile",
    units: "Flats",
    settings: "Settings",
    history: "History",
  };
  return map[id] || id;
}

export const copy = {
  home: {
    titleResident: "A little closer to home",
    titleOps: "Society overview",
    leadResident: "Welcome guests, pay bills, read notices, and raise maintenance from one place.",
    leadOps: "Billing, maintenance tickets, guests, and notices for the community.",
    inviteLabel: "Guest pass",
    inviteTitle: "Invite someone over",
    inviteHint: "Create a pass code they can show at the gate.",
    inviteCta: "Create pass",
    everyday: "Everyday",
    household: "Household",
    statusResident: "Your dues",
    statusOps: "This month’s collection",
    needsYou: "To do",
    needsYouEmpty: "Nothing pending",
    needsYouEmptyBody: "New bills, maintenance tickets, or meeting votes will show here.",
    noDues: "No maintenance due right now",
    hasDues: (n) => (n === 1 ? "1 bill to pay" : `${n} bills to pay`),
    payCta: "Pay maintenance",
    payCtaOps: "Collect dues",
    raiseConcern: "Raise maintenance",
    notices: "Notices",
    meetings: "Meetings",
    announcements: "Notices",
    upcoming: "Upcoming meetings",
    recentMoney: "Recent payments",
    recentMoneyEmpty: "No payments yet this month",
    communityBooksHint: "Society accounts stay with the treasurer. You can still pay dues and read notices here.",
    myHome: "My home",
    manage: "Manage society",
    shortcuts: {
      pay: "Pay maintenance",
      complaint: "Raise maintenance",
      book: "Book hall",
      guest: "Invite guest",
      notices: "Notices",
      meetings: "Meetings",
    },
  },
  finance: {
    titleResident: "Bills",
    titleOps: "Billing",
    leadResident: "See your maintenance bill and upload UPI / bank proof.",
    leadOps: "Collect dues, record expenses, and check society funds.",
    snapshotOps: "Summary",
    fundsCount: "Funds",
    fundBalances: "Total in funds",
    openPeriods: "Open months",
    yourDues: "Your maintenance bill",
    yourDuesEmpty: "No bill for your flat yet",
    yourDuesEmptyBody: "When the treasurer opens the month, your amount shows here.",
    submitProof: "Upload payment proof",
    submitProofHint: "After you pay by UPI or transfer, upload the screenshot. The treasurer confirms it.",
    pendingProofs: "Proofs waiting for you",
    periodSummary: "Month summary",
  },
};

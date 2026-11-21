/** Plain-language copy by community role. Residents never see ledger jargon. */

export function isFinanceOps(roles = []) {
  return roles.some((role) => ["treasurer", "resident_auditor", "committee_admin", "platform_admin"].includes(role));
}

export function isTreasurer(roles = []) {
  return roles.includes("treasurer");
}

export function isCommittee(roles = []) {
  return roles.includes("committee_admin") || roles.includes("platform_admin");
}

/** Primary tab labels */
export function navLabel(id, roles = []) {
  const ops = isFinanceOps(roles);
  const map = {
    home: "Home",
    finance: ops ? "Money" : "Payments",
    concerns: "Help",
    decisions: "Meetings",
    collections: ops ? "Collections" : "Pay dues",
    expenses: "Spending",
    funds: "Society funds",
    transactions: ops ? "Money trail" : "Payment history",
    reconciliation: "Bank match",
    reviews: "Checks",
    statements: "Monthly statement",
    notices: "Notices",
    visitors: "Guests",
    amenities: "Bookings",
    assets: "Property",
    staff: "Staff",
    assistant: "Ask SABHA",
    documents: "Documents",
    notifications: "Alerts",
    profile: "Profile",
    units: "Flats & people",
    settings: "Settings",
    history: "Full history",
  };
  return map[id] || id;
}

export const copy = {
  home: {
    titleResident: "Home",
    titleOps: "Home",
    leadResident: "What needs you, and what you owe — in plain words.",
    leadOps: "What needs a decision, and how this month’s money looks.",
    statusResident: "Your status",
    statusOps: "This month’s money",
    needsYou: "Needs you",
    needsYouEmpty: "You’re clear for now",
    needsYouEmptyBody: "When a payment, concern, or meeting needs a reply, it shows up here.",
    noDues: "You’re up to date on maintenance",
    hasDues: (n) => (n === 1 ? "1 payment waiting" : `${n} payments waiting`),
    payCta: "Pay maintenance",
    payCtaOps: "Open collections",
    raiseConcern: "Ask for help",
    notices: "Notices",
    meetings: "Meetings",
    announcements: "Notices for you",
    upcoming: "Coming up",
    recentMoney: "Recent money movement",
    recentMoneyEmpty: "No payments posted yet",
    communityBooksHint: "Detailed society books stay with the treasurer and committee. You still see your dues and notices here.",
  },
  finance: {
    titleResident: "Payments",
    titleOps: "Money",
    leadResident: "See what you owe and send proof of payment. The treasurer confirms before it counts as paid.",
    leadOps: "Society money in one place — dues in, spending out, then the trail.",
    snapshotOps: "At a glance",
    fundsCount: "Funds open",
    fundBalances: "In society funds",
    openPeriods: "Billing months",
    yourDues: "Your maintenance",
    yourDuesEmpty: "No bill on your flat yet",
    yourDuesEmptyBody: "When the treasurer opens a month for your flat, the amount appears here.",
    submitProof: "Send payment proof",
    submitProofHint: "Upload UPI or bank transfer proof. This does not mark you paid until the treasurer confirms.",
    pendingProofs: "Waiting for your check",
    periodSummary: "This month",
  },
};

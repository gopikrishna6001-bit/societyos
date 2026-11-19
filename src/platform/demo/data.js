const MAINTENANCE = 4500;
const BLOCKS = ["A", "B", "C", "D"];
const FIRST = ["Kabir", "Ananya", "Vikram", "Leela", "Sana", "Farhan", "Meera", "Arjun", "Diya", "Nikhil", "Ishaan", "Tara", "Rohit", "Aisha", "Dev", "Naina", "Kiran", "Zoya", "Rahul", "Pooja", "Adil", "Sara", "Manoj", "Lavanya", "Imran", "Rhea", "Joseph", "Fatima", "Harish", "Nandini"];
const LAST = ["Menon", "Rao", "Shah", "Iyer", "Qureshi", "Nair", "Reddy", "Kapoor", "Das", "Fernandes", "Kulkarni", "Banerjee", "Pillai", "Shetty", "Chowdhury", "George", "Khan", "Bose", "Patel", "D'Souza"];

export const community = {
  name: "Palm Court Residences",
  city: "Hyderabad, Telangana",
  units: 120,
  occupied: 108,
  vacant: 12,
  residents: 342,
  staffCount: 14,
  monthLabel: "November 2026",
  maintenancePerUnit: MAINTENANCE,
};

export const months = [
  { id: "2026-06", label: "June 2026", billed: 486000, collected: 477000, expenses: 305000 },
  { id: "2026-07", label: "July 2026", billed: 486000, collected: 481500, expenses: 312400 },
  { id: "2026-08", label: "August 2026", billed: 486000, collected: 468000, expenses: 298750 },
  { id: "2026-09", label: "September 2026", billed: 486000, collected: 472500, expenses: 324200 },
  { id: "2026-10", label: "October 2026", billed: 486000, collected: 459000, expenses: 308900 },
  { id: "2026-11", label: "November 2026", billed: 486000, collected: 432000, expenses: 318500 },
];

export const funds = {
  bank: 1875000,
  corpus: 3250000,
  reserve: 840000,
};

export const CURRENT_MONTH = "2026-11";

export const expenses = [
  expense("sec-wages", "2026-11-01", "Security wages for November", "Security services", 98000, "Approved", "Paid", "Receipt on file", "Facilities manager"),
  expense("sec-agency", "2026-11-01", "Security agency service fee", "Security services", 27000, "Approved", "Paid", "Receipt on file", "Facilities manager"),
  expense("hk-wages", "2026-11-01", "Housekeeping team wages", "Housekeeping", 52000, "Approved", "Paid", "Receipt on file", "Facilities manager"),
  expense("hk-supplies", "2026-11-05", "Housekeeping supplies", "Housekeeping", 16000, "Approved", "Paid", "Receipt on file", "Facilities manager"),
  expense("power-common", "2026-11-08", "Common-area electricity", "Electricity", 36200, "Approved", "Paid", "Bill on file", "Facilities manager"),
  expense("power-pump", "2026-11-08", "Pump-room electricity", "Electricity", 6300, "Approved", "Paid", "Bill on file", "Facilities manager"),
  expense("water-municipal", "2026-11-06", "Municipal water charges", "Water supply", 12400, "Approved", "Paid", "Bill on file", "Facilities manager"),
  expense("water-tanker", "2026-11-14", "Tanker water for Block B", "Water supply", 6000, "Approved", "Awaiting payment", "Bill on file", "Facilities manager"),
  expense("lift-amc", "2026-11-02", "Lift annual maintenance", "Lift maintenance", 15000, "Approved", "Paid", "Contract on file", "Facilities manager"),
  expense("lift-sensor", "2026-11-16", "Lift door sensor, Block A", "Lift maintenance", 6800, "Pending committee", "Unpaid", "Quote on file", "Facilities manager"),
  expense("plumb-b", "2026-11-09", "B-wing stack plumbing", "Plumbing", 4200, "Approved", "Paid", "Receipt on file", "Facilities manager"),
  expense("plumb-drain", "2026-11-12", "Terrace drain cleaning", "Plumbing", 3650, "Approved", "Paid", "Receipt on file", "Facilities manager"),
  expense("paint-lobby", "2026-11-04", "Lobby repainting, Block C", "Repairs", 8400, "Approved", "Paid", "Receipt on file", "Facilities manager"),
  expense("wall", "2026-11-18", "Compound-wall repair", "Repairs", 5200, "Pending committee", "Unpaid", "Quote on file", "Facilities manager"),
  expense("garden", "2026-11-07", "Garden maintenance", "Landscaping", 4500, "Approved", "Paid", "Receipt on file", "Facilities manager"),
  expense("plants", "2026-11-07", "Seasonal plants", "Landscaping", 2000, "Approved", "Paid", "Receipt on file", "Facilities manager"),
  expense("waste", "2026-11-03", "Waste collection contract", "Waste management", 7200, "Approved", "Paid", "Receipt on file", "Facilities manager"),
  expense("bins", "2026-11-11", "Replacement waste bins", "Waste management", 2000, "Approved", "Paid", "Receipt on file", "Facilities manager"),
  expense("gen-service", "2026-11-10", "Generator service", "Generator maintenance", 4150, "Approved", "Paid", "Service note on file", "Facilities manager"),
  expense("gen-diesel", "2026-11-15", "Generator diesel", "Generator maintenance", 1500, "Approved", "Paid", "Receipt on file", "Facilities manager"),
];

function expense(id, date, description, category, amount, approval, payment, document, submittedBy) {
  const history = [
    { id: `${id}-submit`, at: date, by: submittedBy, action: "Submitted" },
  ];
  if (approval === "Approved") {
    history.push({ id: `${id}-treasurer`, at: "2026-11-18", by: "Leela Iyer, Treasurer", action: "Checked against the quote" });
    history.push({ id: `${id}-committee`, at: "2026-11-19", by: "Vikram Shah, Secretary", action: "Approved for the November statement" });
  }
  if (payment === "Paid") history.push({ id: `${id}-paid`, at: "2026-11-19", by: "Leela Iyer, Treasurer", action: "Paid from the operating bank" });
  return { id, date, description, category, amount, approval, payment, document, history };
}

export function flats() {
  const list = [];
  for (const block of BLOCKS) {
    for (let floor = 1; floor <= 10; floor += 1) {
      for (let door = 1; door <= 3; door += 1) {
        list.push(`${block}-${floor}0${door}`);
      }
    }
  }
  return list;
}

export function buildInvoices() {
  return flats().map((flat, index) => {
    const vacant = index >= community.occupied;
    if (vacant) return { id: `inv-${flat}`, flat, status: "Vacant", billed: 0, paid: 0, outstanding: 0 };
    const partial = index >= 95 && index < 97;
    const unpaid = index >= 97;
    const paid = partial ? 2250 : unpaid ? 0 : MAINTENANCE;
    return {
      id: `inv-${flat}`,
      flat,
      status: partial ? "Partial" : unpaid ? "Outstanding" : "Paid",
      billed: MAINTENANCE,
      paid,
      outstanding: MAINTENANCE - paid,
    };
  });
}

export function buildHouseholds() {
  const occupied = flats().slice(0, community.occupied);
  const people = [];
  occupied.forEach((flat, index) => {
    const size = index < 18 ? 4 : 3;
    for (let member = 0; member < size; member += 1) {
      const name = `${FIRST[(index + member) % FIRST.length]} ${LAST[(index * 2 + member) % LAST.length]}`;
      people.push({
        id: `${flat}-${member}`,
        name,
        flat,
        relationship: member === 0 ? "Owner" : member === 1 ? "Resident" : "Family",
      });
    }
  });
  return people;
}

export const committee = [
  { name: "Ananya Rao", title: "President", flat: "A-101", focus: "Meetings and publication" },
  { name: "Vikram Shah", title: "Secretary", flat: "B-204", focus: "Notices, concerns and minutes" },
  { name: "Leela Iyer", title: "Treasurer", flat: "C-302", focus: "Collections, payments and the bank book" },
  { name: "Farhan Qureshi", title: "Member", flat: "A-503", focus: "Amenities and staff" },
  { name: "Meera Nair", title: "Member", flat: "D-102", focus: "Works and vendor quotes" },
];

export const staff = [
  ["Ramesh", "Community manager"],
  ["Lakshmi", "Accounts assistant"],
  ["Imran", "Security supervisor"],
  ["Suresh", "Security"],
  ["Abdul", "Security"],
  ["Prakash", "Security"],
  ["Geeta", "Housekeeping lead"],
  ["Savita", "Housekeeping"],
  ["Anita", "Housekeeping"],
  ["Babu", "Housekeeping"],
  ["Naresh", "Electrician"],
  ["Salim", "Plumber"],
  ["Venkat", "Gardener"],
  ["Joseph", "Generator attendant"],
].map(([name, role], index) => ({ id: `staff-${index}`, name, role }));

export const concerns = [
  {
    id: "lift-noise",
    title: "Lift making unusual noise",
    category: "Lift and facilities",
    description: "The Block A lift grinds between the fourth and fifth floors, louder in the morning.",
    raisedOn: "2026-11-12",
    status: "In progress",
    priority: "High",
    assignee: "Lift contractor",
    visibility: "Public",
    flat: "A-501",
    raisedBy: "Diya Reddy",
    responses: [
      { at: "2026-11-12", by: "Diya Reddy", text: "Recorded from the fourth-floor landing." },
      { at: "2026-11-14", by: "Vikram Shah", text: "The contractor visited. A door sensor quote is with the committee." },
    ],
  },
  {
    id: "water-b",
    title: "Water pressure issue in Block B",
    category: "Water",
    description: "Morning pressure on floors 7 to 10 drops for about forty minutes.",
    raisedOn: "2026-11-15",
    status: "Open",
    priority: "High",
    assignee: "Plumber",
    visibility: "Public",
    flat: "B-802",
    raisedBy: "Arjun Das",
    responses: [{ at: "2026-11-16", by: "Meera Nair", text: "A tanker was booked for the interim. The pump timer is being checked." }],
  },
  {
    id: "basement-light",
    title: "Basement lighting not working",
    category: "Electricity",
    description: "Two rows of lights in basement B2 stay off after sunset.",
    raisedOn: "2026-11-10",
    status: "Assigned",
    priority: "Medium",
    assignee: "Electrician",
    visibility: "Public",
    flat: "C-101",
    raisedBy: "Naina George",
    responses: [{ at: "2026-11-11", by: "Naresh", text: "Ballasts are on order. Temporary lamps are in place." }],
  },
  {
    id: "waste-delay",
    title: "Waste collection delay",
    category: "Housekeeping",
    description: "Tuesday's collection arrived after noon and the bin room overflowed.",
    raisedOn: "2026-11-04",
    status: "Resolved",
    priority: "Medium",
    assignee: "Housekeeping lead",
    visibility: "Public",
    flat: "D-203",
    raisedBy: "Rohit Shetty",
    responses: [
      { at: "2026-11-05", by: "Geeta", text: "The contractor confirmed a 9:00 collection from this week." },
      { at: "2026-11-11", by: "Vikram Shah", text: "Closed after two on-time collections." },
    ],
  },
  {
    id: "gate-access",
    title: "Security gate access issue",
    category: "Security",
    description: "The resident card for A-402 fails at the side gate after 9 pm.",
    raisedOn: "2026-11-17",
    status: "Open",
    priority: "High",
    assignee: "Security supervisor",
    visibility: "Private",
    flat: "A-402",
    raisedBy: "Kabir Menon",
    responses: [{ at: "2026-11-17", by: "Imran", text: "The card was reissued. Watching tonight's gate log." }],
  },
  {
    id: "late-fee",
    title: "Disputed late fee on B-702",
    category: "Finance",
    description: "The owner says the October receipt was raised before the due date.",
    raisedOn: "2026-11-08",
    status: "In progress",
    priority: "Low",
    assignee: "Treasurer",
    visibility: "Private",
    flat: "B-702",
    raisedBy: "Tara Kapoor",
    responses: [{ at: "2026-11-09", by: "Leela Iyer", text: "The receipt date matches the bank credit. Sharing the redacted line with the owner." }],
  },
];

export const meetings = [
  {
    id: "nov-committee",
    title: "November committee meeting",
    when: "22 November 2026, 11:00",
    venue: "Clubhouse",
    status: "Upcoming",
    agenda: ["November collection and outstanding flats", "Lift sensor quote", "Waste contract review"],
    actions: [],
  },
  {
    id: "oct-committee",
    title: "October committee meeting",
    when: "18 October 2026, 11:00",
    venue: "Clubhouse",
    status: "Minutes published",
    agenda: ["Bank reconciliation", "Generator service"],
    actions: [
      { item: "Publish the October statement", owner: "Leela Iyer", state: "Done" },
      { item: "Collect two quotes for the compound wall", owner: "Meera Nair", state: "With the committee" },
    ],
  },
];

export const notices = [
  { id: "water-notice", title: "Block B water timing", date: "16 November 2026", body: "The overhead tank fills from 6:00 to 8:00. Floors 7 to 10 may see lower pressure until the pump timer is reset." },
  { id: "agm-notice", title: "Statement publication", date: "10 November 2026", body: "The October statement is published. November will be published by 10 December, after the auditor's review." },
  { id: "festival", title: "Clubhouse booking window", date: "2 November 2026", body: "December bookings open to owners on 20 November. One booking per flat until the calendar is full." },
];

export const polls = [
  { id: "garden-hours", question: "Keep the garden open until 9 pm?", status: "Open", closes: "25 November 2026", yes: 46, no: 18 },
  { id: "waste-slot", question: "Move waste collection to 8 am?", status: "Closed", closes: "28 October 2026", yes: 71, no: 22 },
];

export const resolutions = [
  { id: "res-oct-1", title: "Adopt the October statement", meeting: "October committee meeting", result: "Passed", date: "18 October 2026" },
  { id: "res-oct-2", title: "Renew housekeeping through March", meeting: "October committee meeting", result: "Passed", date: "18 October 2026" },
];

export const amenities = [
  { id: "clubhouse", name: "Clubhouse", note: "Ground floor, seats 40", slots: ["20 Nov, 18:00", "21 Nov, 10:00"] },
  { id: "court", name: "Badminton court", note: "Terrace, one court", slots: ["19 Nov, 7:00", "23 Nov, 19:00"] },
  { id: "gym", name: "Gym", note: "Open 6:00 to 21:00", slots: [] },
];

export const bookings = [
  { id: "book-1", amenity: "Clubhouse", flat: "C-604", when: "21 November 2026, 10:00", purpose: "Residents' association briefing" },
  { id: "book-2", amenity: "Badminton court", flat: "A-203", when: "19 November 2026, 7:00", purpose: "Morning game" },
];

export const visitors = [
  { id: "vis-1", name: "Delivery, daily groceries", flat: "B-303", when: "19 November, 9:40", kind: "Delivery" },
  { id: "vis-2", name: "Lift technician", flat: "Block A", when: "19 November, 16:00", kind: "Vendor" },
  { id: "vis-3", name: "Guest of A-402", flat: "A-402", when: "19 November, 19:30", kind: "Guest" },
];

export const documents = [
  { id: "doc-oct", title: "October income and expenditure", status: "Published", date: "10 November 2026" },
  { id: "doc-bank", title: "October bank reconciliation", status: "Published", date: "10 November 2026" },
  { id: "doc-nov", title: "November draft statement", status: "With the auditor", date: "Due 10 December 2026" },
];

export const statement = {
  status: "With the auditor",
  due: "10 December 2026",
  observation: "The operating bank closes at ₹18,75,000. Two quotes are still waiting for the committee, so November is not ready to publish.",
};

export const personas = {
  resident: { role: "resident", label: "Resident", name: "Kabir Menon", flat: "A-402" },
  treasurer: { role: "treasurer", label: "Treasurer", name: "Leela Iyer", flat: "C-302" },
  auditor: { role: "resident_auditor", label: "Resident auditor", name: "Sana Qureshi", flat: "B-101" },
  committee: { role: "committee_admin", label: "Committee admin", name: "Vikram Shah", flat: "B-204" },
  admin: { role: "platform_admin", label: "Platform admin", name: "Ananya Rao", flat: "A-101" },
};

export function personaFromEmail(email) {
  const key = String(email || "").toLowerCase().split("@")[0];
  return personas[key] || personas.resident;
}

export function isDemoEmail(email) {
  return typeof email === "string" && email.trim().toLowerCase().endsWith("@demo.sabha.app");
}

export function sum(rows, key) {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
}

export function novemberInvoices() {
  return buildInvoices().filter((row) => row.billed > 0);
}

export function collectionSnapshot(invoiceRows = novemberInvoices()) {
  const billed = sum(invoiceRows, "billed");
  const collected = sum(invoiceRows, "paid");
  const outstanding = sum(invoiceRows, "outstanding");
  const efficiency = billed === 0 ? 0 : Math.round((collected / billed) * 1000) / 10;
  return { billed, collected, outstanding, efficiency };
}

export function categoryTotals(items) {
  const totals = new Map();
  items.forEach((item) => totals.set(item.category, (totals.get(item.category) || 0) + item.amount));
  return [...totals.entries()].map(([category, amount]) => ({ category, amount }));
}

export function publishedCategories(month) {
  const base = categoryTotals(expenses);
  const baseSum = sum(base, "amount");
  let allocated = 0;
  return base.map((row, index) => {
    if (index === base.length - 1) return { category: row.category, amount: month.expenses - allocated };
    const amount = Math.round((row.amount / baseSum) * month.expenses);
    allocated += amount;
    return { category: row.category, amount };
  });
}

export function bankClosings() {
  let cursor = funds.bank;
  const closings = [];
  for (let index = months.length - 1; index >= 0; index -= 1) {
    closings.push({ id: months[index].id, label: months[index].label, closing: cursor });
    cursor -= months[index].collected - months[index].expenses;
  }
  return closings.reverse();
}

export function visibleConcerns(all, person) {
  if (person.role !== "resident") return all;
  return all.filter((item) => item.visibility === "Public" || item.flat === person.flat);
}

export function canApprove(person) {
  return ["treasurer", "committee_admin", "platform_admin"].includes(person.role);
}

export function canReview(person) {
  return person.role === "resident_auditor";
}

export function createDemoState() {
  return {
    monthId: CURRENT_MONTH,
    expenses: structuredClone(expenses),
    concerns: structuredClone(concerns),
    polls: structuredClone(polls),
    bookings: structuredClone(bookings),
    visitors: structuredClone(visitors),
    observation: statement.observation,
  };
}

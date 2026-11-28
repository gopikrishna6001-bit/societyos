// Creates labelled DEMO logins on an empty SABHA project.
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
// Refuses the live Yasvik store and the unreachable host. Does not post money.

import { demoAccounts, demoPassword } from "../src/demoAccounts.js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const blocked = ["cpksnpuavywbmhrzglyh"];

if (!url || !serviceKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Do not put the service-role key in a VITE_ variable.");
  process.exit(1);
}
if (blocked.some((id) => url.includes(id))) {
  console.error("Refusing to seed the live Yasvik store. Point SUPABASE_URL at the Society OS project.");
  process.exit(1);
}

const people = [
  { key: "resident", email: "resident@demo.sabha.app", name: "DEMO Resident", id: "10000000-0000-4000-8000-000000000001", role: "resident" },
  { key: "treasurer", email: "treasurer@demo.sabha.app", name: "DEMO Treasurer", id: "10000000-0000-4000-8000-000000000002", role: "treasurer" },
  { key: "auditor", email: "auditor@demo.sabha.app", name: "DEMO Auditor", id: "10000000-0000-4000-8000-000000000003", role: "resident_auditor" },
  { key: "committee", email: "committee@demo.sabha.app", name: "DEMO Committee", id: "10000000-0000-4000-8000-000000000004", role: "committee_admin" },
  { key: "admin", email: "admin@demo.sabha.app", name: "DEMO Platform admin", id: "10000000-0000-4000-8000-000000000005", role: "platform_admin" },
];

const communityId = "20000000-0000-4000-8000-000000000001";
const unitResident = "20000000-0000-4000-8000-000000000101";
const unitAuditor = "20000000-0000-4000-8000-000000000102";
const electionId = "20000000-0000-4000-8000-000000000201";

function headers(extra = {}) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function createUser(person) {
  const response = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      id: person.id,
      email: person.email,
      password: demoPassword,
      email_confirm: true,
      user_metadata: { full_name: person.name },
    }),
  });
  if (response.ok) return;
  const body = await response.text();
  if (response.status === 422 && /already been registered|already exists/i.test(body)) return;
  throw new Error(`Could not create ${person.email}: ${response.status} ${body}`);
}

async function upsert(table, rows, onConflict) {
  const response = await fetch(`${url}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: "POST",
    headers: headers({ Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify(rows),
  });
  if (!response.ok) throw new Error(`Could not write ${table}: ${response.status} ${await response.text()}`);
}

for (const person of people) await createUser(person);

await upsert("communities", [{
  id: communityId,
  name: "DEMO · Palm Court",
  address: "Demo lane",
  city: "Hyderabad",
  created_by: people.find((person) => person.key === "admin").id,
}], "id");

await upsert("community_settings", [{
  community_id: communityId,
  treasurer_approval_limit: 5000,
  committee_approval_limit: 25000,
  statement_due_day: 10,
}], "community_id");

await upsert("community_memberships", people.map((person) => ({
  community_id: communityId,
  profile_id: person.id,
  role: person.role,
  status: "active",
  created_by: people.find((row) => row.key === "admin").id,
})), "community_id,profile_id,role");

await upsert("units", [
  { id: unitResident, community_id: communityId, block: "A", number: "101" },
  { id: unitAuditor, community_id: communityId, block: "A", number: "102" },
], "id");

await upsert("unit_occupancies", [
  { id: "20000000-0000-4000-8000-000000000301", community_id: communityId, unit_id: unitResident, profile_id: people[0].id, relationship: "owner" },
  { id: "20000000-0000-4000-8000-000000000302", community_id: communityId, unit_id: unitAuditor, profile_id: people[2].id, relationship: "owner" },
], "id");

await upsert("auditor_elections", [{
  id: electionId,
  community_id: communityId,
  seats: 1,
  term_starts_on: "2026-04-01",
  term_ends_on: "2027-03-31",
  voting_starts_on: "2026-03-01",
  voting_ends_on: "2026-03-15",
  status: "certified",
  created_by: people.find((person) => person.key === "committee").id,
}], "id");

await upsert("auditor_terms", [{
  id: "20000000-0000-4000-8000-000000000202",
  community_id: communityId,
  profile_id: people.find((person) => person.key === "auditor").id,
  election_id: electionId,
  starts_on: "2026-04-01",
  ends_on: "2027-03-31",
  status: "active",
}], "id");

await upsert("expense_categories", [
  "Security", "Housekeeping", "Electricity", "Water", "Lift maintenance", "Plumbing",
  "Civil repairs", "Gardening", "Administration", "Insurance", "Emergency repairs", "Other",
].map((name) => ({ community_id: communityId, name })), "community_id,name");

const expected = new Set(demoAccounts.map((account) => account.email));
if (![...expected].every((email) => people.some((person) => person.email === email))) {
  throw new Error("Demo account list and seed people drifted.");
}

console.log("DEMO community: DEMO · Palm Court");
console.log(`Shared password: ${demoPassword}`);
for (const person of people) console.log(`${person.role}  ${person.email}`);
console.log("No ledger entries were posted.");

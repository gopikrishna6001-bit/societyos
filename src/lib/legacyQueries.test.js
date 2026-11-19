import { readFileSync } from "node:fs";
import {
  LEGACY_EXPENSE_COLUMNS,
  LEGACY_EXPENSES,
  LEGACY_MEETING_COLUMNS,
  LEGACY_MEETINGS,
  LEGACY_NOTIFICATION_COLUMNS,
  LEGACY_NOTIFICATIONS,
  SABHA_ONLY_EXPENSE_COLUMNS,
} from "./legacyTables.js";
import { Financials, Meetings, Reports, SOCIETY_ID } from "./supabase.js";

const calls = vi.hoisted(() => ({ list: [] }));

vi.mock("@supabase/supabase-js", () => {
  function chain(table) {
    const rec = { table, ops: [] };
    calls.list.push(rec);
    const self = {
      select(cols) { rec.ops.push(["select", cols]); return self; },
      insert(row) { rec.ops.push(["insert", row]); return self; },
      update(row) { rec.ops.push(["update", row]); return self; },
      eq(col, val) { rec.ops.push(["eq", col, val]); return self; },
      gte(col, val) { rec.ops.push(["gte", col, val]); return self; },
      lte(col, val) { rec.ops.push(["lte", col, val]); return self; },
      order(col, opts) { rec.ops.push(["order", col, opts]); return self; },
      limit(n) { rec.ops.push(["limit", n]); return self; },
      single() { rec.ops.push(["single"]); return Promise.resolve({ data: null, error: null }); },
      then(resolve, reject) { return Promise.resolve({ data: [], error: null }).then(resolve, reject); },
    };
    return self;
  }
  return {
    createClient: () => ({
      from: (table) => chain(table),
      auth: {},
      channel() { return { on() { return this; }, subscribe() { return this; } }; },
      removeChannel() {},
    }),
  };
});

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function ops(call) {
  return call.ops;
}

beforeEach(() => {
  calls.list.length = 0;
});

test("legacy expense reads and writes stay on legacy_expenses columns", async () => {
  Financials.getExpenses({ status: "pending", category: "cat-1" });
  Financials.createExpense({ description: "Guard salary", amount: 1000, category: "Security", expense_date: "2026-11-01", notes: "" });
  Financials.approveExpense("exp-1", "Treasurer");
  Financials.rejectExpense("exp-1", "Duplicate");
  await Financials.getIncomeStatement("2026-10", "2026-11");

  const expenseCalls = calls.list.filter((call) => call.table === LEGACY_EXPENSES);
  expect(expenseCalls).toHaveLength(5);
  expect(calls.list.some((call) => call.table === "expenses")).toBe(false);

  const read = expenseCalls[0];
  expect(ops(read)).toEqual([
    ["select", "*"],
    ["eq", "society_id", SOCIETY_ID],
    ["eq", "status", "pending"],
    ["eq", "category_id", "cat-1"],
    ["order", "expense_date", { ascending: false }],
  ]);
  expect(JSON.stringify(read)).not.toContain("vendors(");

  const created = expenseCalls[1].ops.find((op) => op[0] === "insert")[1];
  expect(created).toMatchObject({
    society_id: SOCIETY_ID,
    description: "Guard salary",
    amount: 1000,
    category: "Security",
    expense_date: "2026-11-01",
  });
  expect(Object.keys(created).every((key) => LEGACY_EXPENSE_COLUMNS.includes(key))).toBe(true);
  expect(Object.keys(created).some((key) => SABHA_ONLY_EXPENSE_COLUMNS.includes(key))).toBe(false);

  expect(expenseCalls[2].ops[0]).toEqual(["update", expect.objectContaining({ status: "approved", approved_by: "Treasurer" })]);
  expect(expenseCalls[2].ops[1]).toEqual(["eq", "id", "exp-1"]);
  expect(expenseCalls[3].ops[0][1]).toEqual({ status: "rejected", rejected_reason: "Duplicate" });

  const statement = expenseCalls[4];
  expect(statement.ops).toEqual([
    ["select", "expense_date, amount, status"],
    ["eq", "society_id", SOCIETY_ID],
    ["eq", "status", "paid"],
    ["gte", "expense_date", "2026-10-01"],
    ["lte", "expense_date", "2026-11-31"],
  ]);
});

test("legacy meeting and notification helpers use the renamed tables", () => {
  Meetings.getAll();
  Meetings.getById("meet-1");
  Meetings.create({ title: "AGM", date: "2026-12-01" });
  Meetings.update("meet-1", { status: "cancelled" });
  Meetings.saveMinutes("meet-1", "Draft text", false);
  Meetings.saveMinutes("meet-1", "Final text", true);
  Reports.getNotifications("resident-1");
  Reports.markNotificationRead("note-1");
  Reports.markAllRead("resident-1");

  const meetings = calls.list.filter((call) => call.table === LEGACY_MEETINGS);
  expect(meetings).toHaveLength(6);
  expect(calls.list.some((call) => call.table === "meetings")).toBe(false);
  expect(meetings[0].ops).toEqual([
    ["select", "*"],
    ["eq", "society_id", SOCIETY_ID],
    ["order", "date", { ascending: false }],
  ]);
  expect(meetings[1].ops[0][1]).toBe("*, meeting_rsvps(*), motions(*)");
  expect(meetings[4].ops[0][1]).toEqual({ minutes_draft: "Draft text" });
  expect(meetings[5].ops[0][1]).toEqual({ minutes_final: "Final text", status: "completed" });
  for (const column of ["date", "minutes_draft", "minutes_final", "status"]) {
    expect(LEGACY_MEETING_COLUMNS).toContain(column);
  }

  const notes = calls.list.filter((call) => call.table === LEGACY_NOTIFICATIONS);
  expect(notes).toHaveLength(3);
  expect(calls.list.some((call) => call.table === "notifications")).toBe(false);
  expect(notes[0].ops).toEqual([
    ["select", "*"],
    ["eq", "resident_id", "resident-1"],
    ["eq", "read", false],
    ["order", "created_at", { ascending: false }],
  ]);
  expect(notes[1].ops[0][1]).toEqual({ read: true });
  expect(notes[2].ops).toEqual([
    ["update", { read: true }],
    ["eq", "resident_id", "resident-1"],
  ]);
  for (const column of ["resident_id", "read", "created_at"]) {
    expect(LEGACY_NOTIFICATION_COLUMNS).toContain(column);
  }
});

test("SocietyOS sources no longer target the SABHA table names", () => {
  const finances = read("../components/Finances.jsx");
  const meetings = read("../components/Meetings.jsx");
  const client = read("./supabase.js");
  const bot = read("../../supabase/functions/whatsapp-bot/index.ts");
  const sabha = read("../platform/screens.jsx");

  for (const source of [finances, meetings, client]) {
    expect(source).not.toMatch(/from\(["']expenses["']\)/);
    expect(source).not.toMatch(/from\(["']meetings["']\)/);
    expect(source).not.toMatch(/from\(["']notifications["']\)/);
  }
  expect(finances).toContain("LEGACY_EXPENSES");
  expect(finances).toContain('order("expense_date"');
  expect(meetings).toContain("LEGACY_MEETINGS");
  expect(meetings).toContain('order("date"');
  expect(client).toContain("LEGACY_NOTIFICATIONS");
  const expenseReader = client.slice(client.indexOf("getExpenses"), client.indexOf("// Budget"));
  expect(expenseReader).toContain("LEGACY_EXPENSES");
  expect(expenseReader).not.toContain("vendors(");

  expect(bot).toContain('from("legacy_expenses")');
  expect(bot).not.toMatch(/from\(["']expenses["']\)/);
  expect(bot).toContain("expense_date");
  expect(bot).toContain('eq("status", "pending")');

  expect(sabha).toContain('from("expenses")');
  expect(sabha).toContain("occurred_on");
  expect(sabha).toContain("community_id");
  expect(sabha).toContain('from("meetings")');
  expect(sabha).toContain("held_on");
  expect(sabha).toContain('from("notifications")');
  expect(sabha).toContain("read_at");
  expect(sabha).not.toContain("LEGACY_EXPENSES");
});

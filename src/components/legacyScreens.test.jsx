import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Finances from "./Finances.jsx";
import Meetings from "./Meetings.jsx";

const calls = vi.hoisted(() => ({ list: [] }));

vi.mock("../lib/supabase.js", () => {
  function chain(table) {
    const rec = { table, ops: [] };
    calls.list.push(rec);
    const self = {
      select(cols) { rec.ops.push(["select", cols]); return self; },
      insert(row) { rec.ops.push(["insert", row]); return self; },
      update(row) { rec.ops.push(["update", row]); return self; },
      eq(col, val) { rec.ops.push(["eq", col, val]); return self; },
      order(col, opts) { rec.ops.push(["order", col, opts]); return self; },
      single() { return Promise.resolve({ data: { balance: 0 }, error: null }); },
      then(resolve, reject) { return Promise.resolve({ data: [], error: null }).then(resolve, reject); },
    };
    return self;
  }
  return {
    SOCIETY_ID: "society-test",
    supabase: { from: (table) => chain(table) },
  };
});

beforeEach(() => {
  calls.list.length = 0;
});

test("the finances screen loads and saves historical expenses on legacy_expenses", async () => {
  const user = userEvent.setup();
  render(<Finances />);
  expect(await screen.findByRole("heading", { name: "Financial Ledger" })).toBeInTheDocument();

  const load = calls.list.find((call) => call.table === "legacy_expenses");
  expect(load.ops).toEqual([
    ["select", "*"],
    ["eq", "society_id", "society-test"],
    ["order", "expense_date", { ascending: false }],
  ]);
  expect(calls.list.some((call) => call.table === "expenses")).toBe(false);

  await user.click(screen.getByRole("button", { name: "+ Add Expense" }));
  await user.type(screen.getByPlaceholderText("e.g. Security guard salary"), "Lift repair");
  await user.type(screen.getByPlaceholderText("₹"), "2500");
  await user.click(screen.getByRole("button", { name: "Add Expense (Pending Approval)" }));

  const saved = calls.list.filter((call) => call.table === "legacy_expenses" && call.ops.some((op) => op[0] === "insert"));
  expect(saved).toHaveLength(1);
  expect(saved[0].ops[0][1]).toMatchObject({
    description: "Lift repair",
    amount: 2500,
    net_amount: 2500,
    category: "Maintenance",
    society_id: "society-test",
    status: "pending",
    created_by: "Committee",
  });
  expect(saved[0].ops[0][1].expense_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(saved[0].ops[0][1].community_id).toBeUndefined();
  expect(saved[0].ops[0][1].occurred_on).toBeUndefined();
});

test("the meetings screen reads legacy_meetings by date", async () => {
  render(<Meetings />);
  expect(await screen.findByRole("heading", { name: "Meetings" })).toBeInTheDocument();
  expect(calls.list.map((call) => call.table)).toEqual(["legacy_meetings"]);
  expect(calls.list[0].ops).toEqual([
    ["select", "*"],
    ["eq", "society_id", "society-test"],
    ["order", "date", { ascending: false }],
  ]);
});

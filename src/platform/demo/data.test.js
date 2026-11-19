import { describe, expect, test } from "vitest";
import {
  bankClosings,
  buildHouseholds,
  canApprove,
  collectionSnapshot,
  community,
  createDemoState,
  expenses,
  flats,
  funds,
  months,
  personaFromEmail,
  publishedCategories,
  staff,
  sum,
  visibleConcerns,
} from "./data.js";

test("Palm Court headline figures are computed from the records", () => {
  const snapshot = collectionSnapshot();
  expect(flats()).toHaveLength(community.units);
  expect(buildHouseholds()).toHaveLength(community.residents);
  expect(staff).toHaveLength(community.staffCount);
  expect(expenses).toHaveLength(20);
  expect(sum(expenses, "amount")).toBe(318500);
  expect(snapshot).toEqual({ billed: 486000, collected: 432000, outstanding: 54000, efficiency: 88.9 });
  expect(months.at(-1)).toMatchObject({ billed: 486000, collected: 432000, expenses: 318500 });
  expect(funds).toEqual({ bank: 1875000, corpus: 3250000, reserve: 840000 });
});

test("published months and the bank book stay in balance", () => {
  const november = months.at(-1);
  expect(sum(publishedCategories(november), "amount")).toBe(november.expenses);
  months.forEach((month) => {
    expect(sum(publishedCategories(month), "amount")).toBe(month.expenses);
    expect(month.billed - month.collected).toBeGreaterThanOrEqual(0);
  });
  const closings = bankClosings();
  expect(closings.at(-1).closing).toBe(funds.bank);
  expect(closings.at(-2).closing).toBe(funds.bank - (432000 - 318500));
});

test("demo edits clone the fixture and respect visibility", () => {
  const state = createDemoState();
  state.expenses[0].amount = 1;
  expect(expenses[0].amount).toBe(98000);
  const resident = personaFromEmail("resident@demo.sabha.app");
  const treasurer = personaFromEmail("treasurer@demo.sabha.app");
  expect(resident.flat).toBe("A-402");
  expect(canApprove(resident)).toBe(false);
  expect(canApprove(treasurer)).toBe(true);
  const titles = visibleConcerns(state.concerns, resident).map((item) => item.title);
  expect(titles).toContain("Security gate access issue");
  expect(titles).not.toContain("Disputed late fee on B-702");
  expect(visibleConcerns(state.concerns, treasurer)).toHaveLength(state.concerns.length);
});

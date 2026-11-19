import { demoAccounts, demoPassword } from "./demoAccounts.js";

test("lists one demo login for each role and no money", () => {
  expect(demoAccounts.map((account) => account.role)).toEqual([
    "Resident",
    "Treasurer",
    "Auditor",
    "Committee",
    "Platform admin",
  ]);
  expect(new Set(demoAccounts.map((account) => account.email)).size).toBe(5);
  expect(demoPassword.length).toBeGreaterThanOrEqual(8);
  expect(demoAccounts.every((account) => account.email.endsWith("@demo.sabha.app"))).toBe(true);
  expect(JSON.stringify(demoAccounts)).not.toMatch(/₹/);
});

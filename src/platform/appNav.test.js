import { ADMIN_NAV, RESIDENT_TABS, canSeePage, isOpsRole, residentHomeShortcuts } from "./appNav.js";

test("resident tabs follow OpenSociety everyday destinations", () => {
  expect(RESIDENT_TABS.map(([id]) => id)).toEqual(["home", "visitors", "finance", "notices"]);
  expect(residentHomeShortcuts().map((item) => item.id)).toEqual(["visitors", "finance", "notices", "concerns"]);
});

test("admin nav includes billing and maintenance", () => {
  const ids = ADMIN_NAV.map(([id]) => id);
  expect(ids).toContain("finance");
  expect(ids).toContain("concerns");
  expect(ids).toContain("visitors");
  expect(ids).toContain("units");
});

test("ops roles see admin surfaces", () => {
  expect(isOpsRole(["resident"])).toBe(false);
  expect(isOpsRole(["committee_admin"])).toBe(true);
  expect(canSeePage(["committee_admin"], "units")).toBe(true);
  expect(canSeePage(["resident"], "units")).toBe(false);
});

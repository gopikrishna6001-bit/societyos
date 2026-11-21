import { TICKET_CATEGORIES } from "./flowConstants.js";

test("ticket categories match create_ticket RPC allow-list", () => {
  expect(TICKET_CATEGORIES).toEqual([
    "Maintenance", "Water", "Electricity", "Security", "Housekeeping",
    "Lift and facilities", "Finance", "Governance", "General", "Other",
  ]);
});

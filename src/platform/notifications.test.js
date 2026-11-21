import { notificationKind, notificationTarget } from "./notifications.js";

test("routes guest and bill alerts to the right screens", () => {
  expect(notificationTarget({ event_type: "visitor_checked_in" })).toBe("visitors");
  expect(notificationTarget({ event_type: "payment_proof_submitted" })).toBe("collections");
  expect(notificationTarget({ event_type: "notice_published" })).toBe("notices");
  expect(notificationTarget({ event_type: "ticket_updated" })).toBe("concerns");
});

test("labels alerts in everyday language", () => {
  expect(notificationKind("visitor_checked_in")).toBe("Guests");
  expect(notificationKind("payment_proof_verified")).toBe("Bills");
  expect(notificationKind("ticket_created")).toBe("Maintenance");
});

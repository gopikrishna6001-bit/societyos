import { readStoredSession, sessionStillValid } from "./supabase.js";

const now = Date.parse("2026-11-19T09:39:00Z");

test("keeps a session that will not be refreshed on the next page load", () => {
  const raw = JSON.stringify({ expires_at: Math.floor(now / 1000) + 3600 });
  expect(sessionStillValid(raw, now)).toBe(true);
});

test("rejects a session that Auth would try to refresh", () => {
  const expired = JSON.stringify({ expires_at: Math.floor(now / 1000) - 10 });
  const expiring = JSON.stringify({ expires_at: Math.floor(now / 1000) + 30 });
  expect(sessionStillValid(expired, now)).toBe(false);
  expect(sessionStillValid(expiring, now)).toBe(false);
  expect(sessionStillValid("not-json", now)).toBe(false);
  expect(sessionStillValid(null, now)).toBe(false);
});

test("removes a dead refresh token before Auth can call the network", () => {
  const store = new Map([["sb-project-auth-token", JSON.stringify({ expires_at: 1, refresh_token: "stale" })]]);
  const storage = {
    getItem: (key) => store.get(key) ?? null,
    removeItem: (key) => store.delete(key),
  };
  expect(readStoredSession(storage, "sb-project-auth-token")).toBeNull();
  expect(store.has("sb-project-auth-token")).toBe(false);
});

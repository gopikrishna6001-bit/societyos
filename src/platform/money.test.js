import { describe, expect, test } from "vitest";
import { errorMessage } from "../lib/async.js";
import { unreachableProjectMessage } from "../lib/supabase.js";
import { inr, toCsv } from "./money.js";

describe("money", () => {
  test("does not invent a figure for missing amounts", () => {
    expect(inr(null)).toBe("—");
    expect(inr("")).toBe("—");
  });

  test("formats rupees from a decimal string", () => {
    expect(inr("1234.5")).toContain("1,234.50");
  });

  test("quotes csv cells that contain commas", () => {
    expect(toCsv([{ note: "water, pump" }])).toBe('note\n"water, pump"');
  });
});

describe("error messages", () => {
  test("turns a timeout into a retryable message", () => {
    expect(errorMessage({ name: "AbortError", message: "aborted" })).toMatch(/timed out/i);
  });

  test("turns a network failure into a connection message", () => {
    expect(errorMessage(new TypeError("Failed to fetch"))).toMatch(/Could not reach the server/);
  });

  test("names the unresolved project instead of asking for another try", () => {
    expect(unreachableProjectMessage("https://wzchqxwwezklxsxmjvyt.supabase.co/auth/v1/token")).toMatch(/does not resolve/);
    expect(unreachableProjectMessage("https://example.supabase.co")).toBe("");
  });
});

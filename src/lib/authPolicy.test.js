import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

function source(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}
import { GENERIC_AUTH_ERROR, NETWORK_AUTH_ERROR, isNetworkAuthError, signInMessage } from "./authPolicy.js";
import { roleFromResident, withoutResidentSecrets } from "./residentAccess.js";

test("sign-in failures do not distinguish a missing account from a wrong password", () => {
  expect(signInMessage({ message: "Invalid login credentials" })).toBe(GENERIC_AUTH_ERROR);
  expect(signInMessage({ message: "User not found" })).toBe(GENERIC_AUTH_ERROR);
  expect(signInMessage({ message: "Failed to fetch" })).toBe(NETWORK_AUTH_ERROR);
  expect(isNetworkAuthError({ name: "AuthRetryableFetchError", message: "FetchError: Load failed" })).toBe(true);
  expect(isNetworkAuthError({ message: "Invalid login credentials" })).toBe(false);
});

test("resident role mapping does not trust a client-supplied role field", () => {
  expect(roleFromResident({ type: "owner", role: "platform_admin" })).toBe("resident");
  expect(roleFromResident({ type: "tenant" })).toBe("tenant");
  expect(roleFromResident({ is_super_admin: true, type: "owner" })).toBe("super_admin");
  expect(roleFromResident({ committee_members: [{ role: "treasurer" }], type: "owner" })).toBe("treasurer");
});

test("credential columns are removed before a resident update", () => {
  const clean = withoutResidentSecrets({ id: "1", name: "Asha", pin: "0000", pin_hash: "abc", portal_pin: "1111" });
  expect(clean).toEqual({ id: "1", name: "Asha" });
});

describe("retired phone login", () => {
  test("the auth-login function refuses every action before touching the database", () => {
    const body = source("supabase/functions/auth-login/index.ts");
    expect(body).toContain("410");
    expect(body).not.toContain("set_pin");
    expect(body).not.toContain("reset_pin");
    expect(body).not.toContain("service_role");
    expect(body).not.toContain("createClient");
  });

  test("the application no longer calls the phone login API", () => {
    const login = source("src/components/Login.jsx");
    const shell = source("src/SocietyOS.jsx");
    expect(login).not.toContain("callAuth");
    expect(login).not.toContain("set_pin");
    expect(shell).not.toContain("callAuth");
    expect(shell).not.toContain("set_pin");
  });
});

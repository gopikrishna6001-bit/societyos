import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

function source(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Phase 0 edge function hardening", () => {
  test("auth-login returns 410 without database access", () => {
    const body = source("supabase/functions/auth-login/index.ts");
    expect(body).toContain("410");
    expect(body).not.toContain("set_pin");
    expect(body).not.toContain("reset_pin");
    expect(body).not.toContain("createClient");
    expect(body).not.toContain("service_role");
  });

  test("ai-proxy requires a bearer token and validates the user", () => {
    const body = source("supabase/functions/ai-proxy/index.ts");
    expect(body).toContain("Sign in required.");
    expect(body).toContain("auth.getUser");
    expect(body).toContain("bearer ");
    expect(body).not.toContain("Gemini error:");
  });

  test("send-whatsapp requires WA_DISPATCH_SECRET and is not a public client call", () => {
    const body = source("supabase/functions/send-whatsapp/index.ts");
    expect(body).toContain("WA_DISPATCH_SECRET");
    expect(body).toContain("Unauthorized.");
    const centre = source("src/components/WhatsAppCentre.jsx");
    expect(centre).not.toMatch(/functions\/v1\/send-whatsapp/);
  });
});

describe("Phase 0 database migration", () => {
  test("phase0 migration revokes pin column selects and anon executes", () => {
    const body = source("supabase/migrations/20261120163000_phase0_security.sql");
    expect(body).toContain("REVOKE SELECT (pin, pin_hash, portal_pin");
    expect(body).toContain("trigger_send_whatsapp");
    expect(body).toContain("account_balances");
    expect(body).toContain("resident_dashboard");
    expect(body).toContain("REVOKE ALL ON FUNCTION");
  });
});

describe("Phase 0 demo credential exposure", () => {
  test("production sign-in does not load demo accounts unless the env flag is set", () => {
    const body = source("src/platform/Platform.jsx");
    expect(body).toContain('VITE_ENABLE_DEMO_LOGIN !== "true"');
    expect(body).toContain('import("../demoAccounts.js")');
  });
});

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

  test("send-whatsapp requires WA_DISPATCH_SECRET, society scope, and blocks browsers", () => {
    const body = source("supabase/functions/send-whatsapp/index.ts");
    expect(body).toContain("WA_DISPATCH_SECRET");
    expect(body).toContain("Unauthorized.");
    expect(body).toContain("society_id");
    expect(body).toContain("claim_whatsapp_batch");
    expect(body).toContain("finalize_whatsapp_dispatch");
    expect(body).toContain("Browser access denied.");
    expect(body).toContain("timingSafeEqual");
    expect(body).not.toMatch(/Access-Control-Allow-Origin\s*:/);
    const centre = source("src/components/WhatsAppCentre.jsx");
    expect(centre).not.toMatch(/functions\/v1\/send-whatsapp/);
    expect(centre).not.toContain("WA_DISPATCH_SECRET");
    expect(source("src/components/Finances.jsx")).not.toContain("WA_DISPATCH_SECRET");
  });
});

describe("Phase 0 database migration", () => {
  test("phase0 migration revokes all secret column selects and anon executes", () => {
    const body = source("supabase/migrations/20261120163000_phase0_security.sql");
    for (const col of ["pin", "pin_hash", "portal_pin", "id_number", "id_document_url", "id_type"]) {
      expect(body).toContain(`'${col}'`);
    }
    expect(body).toContain("trigger_send_whatsapp");
    expect(body).toContain("account_balances");
    expect(body).toContain("resident_dashboard");
    expect(body).toContain("REVOKE ALL ON FUNCTION");
  });

  test("whatsapp dispatch migration claims atomically with stale lease recovery", () => {
    const body = source("supabase/migrations/20261120170000_whatsapp_dispatch_hardening.sql");
    expect(body).toContain("FOR UPDATE SKIP LOCKED");
    expect(body).toContain("claim_whatsapp_batch");
    expect(body).toContain("finalize_whatsapp_dispatch");
    expect(body).toContain("stale_claim_recovered");
    expect(body).toContain("app.wa_claim_lease_seconds");
    expect(body).toContain("p_lease_seconds");
    expect(body).toContain("GRANT EXECUTE ON FUNCTION public.claim_whatsapp_batch");
    expect(body).toContain("RETURN NEW;");
    expect(body).not.toContain("http_post");
    expect(body).not.toContain("WA_DISPATCH_SECRET");
  });
});

describe("Phase 0 send-whatsapp finalisation", () => {
  test("dispatcher inspects finalize results and documents at-least-once risk", () => {
    const body = source("supabase/functions/send-whatsapp/index.ts");
    expect(body).toContain("finalizeDispatch");
    expect(body).toContain("finalize_false");
    expect(body).toContain("finalize_error");
    expect(body).toContain("at_least_once_risk");
    expect(body).toContain("exactly-once");
    expect(body).toContain("diagnostics");
  });
});

describe("Phase 0 demo credential exposure", () => {
  test("production sign-in does not load demo accounts unless the env flag is set", () => {
    const body = source("src/platform/Platform.jsx");
    expect(body).toContain('VITE_ENABLE_DEMO_LOGIN !== "true"');
    expect(body).toContain('import("../demoAccounts.js")');
  });
});

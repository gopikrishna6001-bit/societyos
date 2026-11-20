// Society-scoped WhatsApp dispatcher. Not a browser API.
// Auth: Authorization: Bearer <WA_DISPATCH_SECRET> only (never anon/user JWT).
// Body: { "society_id": "<uuid>", "limit"?: 1-25, "lease_seconds"?: 60-3600 }
// At-least-once delivery: if Graph accepts a message but finalize fails, a later
// reclaim may send again. Do not claim exactly-once delivery.
// Do not put WA_DISPATCH_SECRET in frontend, logs, or git.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_BATCH = 25;
const MIN_INTERVAL_MS = 200;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Supabase = ReturnType<typeof createClient>;

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      // Intentionally omit CORS allow-origin so browsers cannot call this endpoint.
    },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let out = 0;
  for (let i = 0; i < ab.length; i++) out |= ab[i] ^ bb[i];
  return out === 0;
}

function looksLikeBrowser(req: Request): boolean {
  if (req.headers.get("Origin")) return true;
  const site = (req.headers.get("Sec-Fetch-Site") ?? "").toLowerCase();
  if (site && site !== "none") return true;
  return false;
}

function redactError(raw: string): string {
  return raw
    .replace(/(Bearer|token|secret|apikey|password)\s*[:=]?\s*\S+/gi, "[redacted]")
    .slice(0, 500);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Finalize claim; never swallow RPC/network failures. Returns ok for response tallies. */
async function finalizeDispatch(
  supabase: Supabase,
  args: {
    id: string;
    claimToken: string;
    societyId: string;
    success: boolean;
    waMsgId?: string | null;
    error?: string | null;
  },
  diagnostics: string[],
): Promise<"finalized" | "finalize_false" | "finalize_error"> {
  try {
    const { data, error } = await supabase.rpc("finalize_whatsapp_dispatch", {
      p_id: args.id,
      p_claim_token: args.claimToken,
      p_society_id: args.societyId,
      p_success: args.success,
      p_wa_msg_id: args.waMsgId ?? null,
      p_error: args.error ?? null,
    });
    if (error) {
      diagnostics.push(
        redactError(`finalize_rpc id=${args.id}: ${error.message ?? "rpc_error"}`),
      );
      return "finalize_error";
    }
    if (data !== true) {
      // Row may already be finalized, lease stolen after expiry, or token mismatch.
      // Leave status alone so stale-lease recovery can reclaim if still sending.
      diagnostics.push(
        redactError(
          `finalize_false id=${args.id} success=${args.success}; row not updated (recoverable if still sending)`,
        ),
      );
      return "finalize_false";
    }
    return "finalized";
  } catch (e) {
    diagnostics.push(
      redactError(`finalize_throw id=${args.id}: ${String((e as Error)?.message ?? e)}`),
    );
    return "finalize_error";
  }
}

serve(async (req) => {
  // Reject CORS preflight — this function is cron/operator only.
  if (req.method === "OPTIONS") {
    return json(403, { error: "Browser access denied." });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed." });
  }
  if (looksLikeBrowser(req)) {
    return json(403, { error: "Browser access denied." });
  }

  const expected = Deno.env.get("WA_DISPATCH_SECRET") ?? "";
  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";
  if (!expected || expected.length < 32 || !token || !timingSafeEqual(token, expected)) {
    return json(401, { error: "Unauthorized." });
  }

  let societyId = "";
  let limit = 20;
  let leaseSeconds: number | null = null;
  try {
    const body = await req.json();
    societyId = String(body?.society_id ?? "").trim();
    if (body?.limit != null) limit = Number(body.limit);
    if (body?.lease_seconds != null) leaseSeconds = Number(body.lease_seconds);
  } catch {
    return json(400, { error: "JSON body with society_id required." });
  }
  if (!UUID_RE.test(societyId)) {
    return json(400, { error: "society_id must be a UUID." });
  }
  if (!Number.isFinite(limit)) limit = 20;
  limit = Math.min(MAX_BATCH, Math.max(1, Math.floor(limit)));
  if (leaseSeconds != null && Number.isFinite(leaseSeconds)) {
    leaseSeconds = Math.min(3600, Math.max(60, Math.floor(leaseSeconds)));
  } else {
    leaseSeconds = null;
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const WA_TOKEN = Deno.env.get("WA_ACCESS_TOKEN") ?? "";
  const WA_PHONE_ID = Deno.env.get("WA_PHONE_NUMBER_ID") ?? "";
  if (!WA_TOKEN || !WA_PHONE_ID) {
    return json(503, { error: "WhatsApp is not configured." });
  }

  const claimToken = crypto.randomUUID();
  const claimArgs: Record<string, unknown> = {
    p_society_id: societyId,
    p_limit: limit,
    p_claim_token: claimToken,
  };
  if (leaseSeconds != null) claimArgs.p_lease_seconds = leaseSeconds;

  const { data: messages, error: claimError } = await supabase.rpc(
    "claim_whatsapp_batch",
    claimArgs,
  );
  if (claimError) {
    return json(500, { error: "Claim failed.", detail: redactError(claimError.message) });
  }
  if (!messages?.length) {
    return json(200, {
      ok: true,
      society_id: societyId,
      claimed: 0,
      sent: 0,
      failed: 0,
      finalize_issues: 0,
      diagnostics: [],
    });
  }

  let sent = 0;
  let failed = 0;
  let finalizeIssues = 0;
  const diagnostics: string[] = [];

  for (const msg of messages) {
    if (msg.society_id !== societyId) {
      const fr = await finalizeDispatch(supabase, {
        id: msg.id,
        claimToken,
        societyId,
        success: false,
        error: "society_id mismatch; skipped",
      }, diagnostics);
      if (fr !== "finalized") finalizeIssues += 1;
      failed += 1;
      continue;
    }
    if (!msg.to_number) {
      const fr = await finalizeDispatch(supabase, {
        id: msg.id,
        claimToken,
        societyId,
        success: false,
        error: "missing to_number",
      }, diagnostics);
      if (fr !== "finalized") finalizeIssues += 1;
      failed += 1;
      continue;
    }

    let graphAccepted = false;
    let waId: string | null = null;
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${WA_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: "91" + String(msg.to_number).replace(/\D/g, "").slice(-10),
            type: "text",
            text: { body: msg.message },
          }),
        },
      );
      const result = await res.json().catch(() => ({}));
      waId = result?.messages?.[0]?.id ?? null;
      graphAccepted = res.ok && !!waId;
      const errText = graphAccepted
        ? null
        : redactError(
          `http_${res.status} ${JSON.stringify(result?.error ?? result).slice(0, 300)}`,
        );
      const fr = await finalizeDispatch(supabase, {
        id: msg.id,
        claimToken,
        societyId,
        success: graphAccepted,
        waMsgId: waId,
        error: errText,
      }, diagnostics);
      if (fr !== "finalized") {
        finalizeIssues += 1;
        // Graph may have accepted; row may stay sending until lease expires → possible duplicate.
        if (graphAccepted) {
          diagnostics.push(
            redactError(
              `at_least_once_risk id=${msg.id}: Graph accepted but finalize did not confirm`,
            ),
          );
        }
      }
      if (graphAccepted && fr === "finalized") sent += 1;
      else failed += 1;
    } catch (e) {
      const fr = await finalizeDispatch(supabase, {
        id: msg.id,
        claimToken,
        societyId,
        success: false,
        error: redactError(String((e as Error)?.message ?? e)),
      }, diagnostics);
      if (fr !== "finalized") finalizeIssues += 1;
      failed += 1;
    }
    await sleep(MIN_INTERVAL_MS);
  }

  return json(200, {
    ok: finalizeIssues === 0,
    society_id: societyId,
    claimed: messages.length,
    sent,
    failed,
    finalize_issues: finalizeIssues,
    // Safe operational diagnostics only (already redacted). Cap length.
    diagnostics: diagnostics.slice(0, 25),
  });
});

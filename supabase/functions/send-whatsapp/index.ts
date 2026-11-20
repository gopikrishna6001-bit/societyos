// Dispatches pending WhatsApp log rows. Not a public client API.
// Requires Authorization: Bearer <WA_DISPATCH_SECRET> matching the function secret.
// Do not enable anonymous access. Cron or an approved operator must supply the secret.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const expected = Deno.env.get("WA_DISPATCH_SECRET") ?? "";
  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";
  if (!expected || !token || token !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const WA_TOKEN = Deno.env.get("WA_ACCESS_TOKEN") ?? "";
  const WA_PHONE_ID = Deno.env.get("WA_PHONE_NUMBER_ID") ?? "";
  if (!WA_TOKEN || !WA_PHONE_ID) {
    return new Response(JSON.stringify({ error: "WhatsApp is not configured." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: messages } = await supabase
    .from("whatsapp_log")
    .select("*")
    .eq("status", "pending")
    .limit(50);

  if (!messages?.length) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  for (const msg of messages) {
    if (!msg.to_number) continue;
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
      const result = await res.json();
      const success = !!result.messages?.[0]?.id;
      await supabase.from("whatsapp_log").update({
        status: success ? "delivered" : "failed",
        wa_msg_id: result.messages?.[0]?.id,
        sent_at: new Date().toISOString(),
      }).eq("id", msg.id);
      if (success) sent += 1;
    } catch {
      await supabase.from("whatsapp_log").update({ status: "failed" }).eq("id", msg.id);
    }
  }
  return new Response(JSON.stringify({ ok: true, sent }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

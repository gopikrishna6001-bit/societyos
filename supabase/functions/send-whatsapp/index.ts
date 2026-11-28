import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
  const WA_TOKEN = Deno.env.get("WA_ACCESS_TOKEN") ?? "";
  const WA_PHONE_ID = Deno.env.get("WA_PHONE_NUMBER_ID") ?? "";

  const { data: messages } = await supabase
    .from("whatsapp_log")
    .select("*")
    .eq("status", "pending")
    .limit(50);

  if (!messages?.length) return new Response("no pending", { status: 200 });

  for (const msg of messages) {
    if (!msg.to_number) continue;
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${WA_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: "91" + msg.to_number.replace(/\D/g, "").slice(-10),
            type: "text",
            text: { body: msg.message },
          }),
        }
      );
      const result = await res.json();
      const success = !!result.messages?.[0]?.id;
      await supabase.from("whatsapp_log").update({
        status: success ? "delivered" : "failed",
        wa_msg_id: result.messages?.[0]?.id,
        sent_at: new Date().toISOString(),
      }).eq("id", msg.id);
    } catch (e) {
      await supabase.from("whatsapp_log").update({ status: "failed" }).eq("id", msg.id);
    }
  }
  return new Response("done", { status: 200 });
});

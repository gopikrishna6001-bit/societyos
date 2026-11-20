// Proxies Gemini for signed-in SABHA users only.
// Gateway verify_jwt alone is not enough: this handler also validates the user JWT.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return json({ error: "Sign in required." }, 401);
  }

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!url || !anonKey) return json({ error: "Assistant unavailable." }, 503);

  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData, error: userError } = await caller.auth.getUser();
  if (userError || !userData?.user?.id) {
    return json({ error: "Sign in required." }, 401);
  }

  const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
  if (!GEMINI_KEY) return json({ error: "Assistant unavailable." }, 503);

  let body: { system?: string; messages?: { content?: string }[]; max_tokens?: number };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const systemText = body.system ? `${body.system}\n\n` : "";
  const userMessage = body.messages?.[body.messages.length - 1]?.content ?? "";
  const fullPrompt = `${systemText}${userMessage}`.slice(0, 12_000);
  if (!fullPrompt.trim()) return json({ error: "Invalid request." }, 400);

  try {
    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { maxOutputTokens: Math.min(Number(body.max_tokens) || 1000, 2000) },
      }),
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      return json({ content: [{ type: "text", text: "The assistant could not answer just now." }] }, 502);
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response.";
    return json({ content: [{ type: "text", text }] });
  } catch {
    return json({ content: [{ type: "text", text: "The assistant could not answer just now." }] }, 500);
  }
});

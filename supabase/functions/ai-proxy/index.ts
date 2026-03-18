import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }
  try {
    const body = await req.json();
    const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
    const systemText = body.system ? body.system + "\n\n" : "";
    const userMessage = body.messages?.[body.messages.length - 1]?.content ?? "";
    const fullPrompt = systemText + userMessage;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
    
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { maxOutputTokens: body.max_tokens || 1000 },
      }),
    });

    const data = await response.json();
    
    // Return full Gemini response for debugging
    if (data.error) {
      return new Response(
        JSON.stringify({ content: [{ type: "text", text: "Gemini error: " + JSON.stringify(data.error) }] }),
        { headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response from Gemini";
    return new Response(
      JSON.stringify({ content: [{ type: "text", text }] }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ content: [{ type: "text", text: "Exception: " + err.message }] }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
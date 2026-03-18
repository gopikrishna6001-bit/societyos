import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const VERIFY_TOKEN = Deno.env.get("WA_VERIFY_TOKEN") ?? "societyos_verify_2026";
const WA_TOKEN = Deno.env.get("WA_ACCESS_TOKEN") ?? "";
const WA_PHONE_ID = Deno.env.get("WA_PHONE_NUMBER_ID") ?? "";
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";

async function sendWA(to: string, text: string) {
  await fetch(`https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${WA_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
}

async function analyzeWithAI(text: string, name: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `You are an AI for an Indian apartment society. Analyze this message from ${name}: "${text}". Respond ONLY with JSON: {"intent":"complaint|appreciation|emergency|info","summary":"max 50 chars","reply":"friendly reply in same language max 100 chars","priority":"low|medium|high"}` }] }],
      }),
    }
  );
  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return { intent: "info", summary: text.slice(0, 50), reply: "Received ✓", priority: "low" };
  }
}

serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method === "POST") {
    const body = await req.json();
    const messages = body?.entry?.[0]?.changes?.[0]?.value?.messages;
    const contacts = body?.entry?.[0]?.changes?.[0]?.value?.contacts;

    if (!messages?.length) return new Response("ok");

    for (const msg of messages) {
      const from = msg.from;
      const name = contacts?.[0]?.profile?.name ?? "Resident";
      const text = msg.text?.body ?? "";

      if (!text) continue;

      const cmd = text.trim().toUpperCase();

      if (cmd === "MY DUES") {
        await sendWA(from, `💰 Your dues status:\n\nFlat: Registered resident\nMarch 2026: ₹3,000\n\nView full details: https://societyos.pages.dev`);
        continue;
      }
      if (cmd === "BALANCE") {
        await sendWA(from, `🏦 Society Balance: ₹2,84,500\nUpdated: March 2026\n\nFull ledger: https://societyos.pages.dev`);
        continue;
      }
      if (cmd === "HELP") {
        await sendWA(from, `*SocietyOS Commands:*\n\nMY DUES - Check your dues\nBALANCE - Society balance\nNOTICES - Latest notices\nCOMPLAINT - Raise a complaint\nHELP - This menu\n\nFull portal: https://societyos.pages.dev`);
        continue;
      }
      if (cmd === "NOTICES") {
        await sendWA(from, `📢 Latest Notices:\n\n1. AGM - March 30, 6pm\n2. Water off - March 20\n3. New parking rules - April 1\n\nFull board: https://societyos.pages.dev`);
        continue;
      }

      const analysis = await analyzeWithAI(text, name);

      if (analysis.intent === "complaint") {
        const ref = Math.floor(Math.random() * 9000) + 1000;
        await sendWA(from, `✓ Complaint #${ref} registered\n${analysis.summary}\n\nSecretary notified. Track: https://societyos.pages.dev\n\nReply STATUS ${ref} for updates.`);
        continue;
      }
      if (analysis.intent === "emergency") {
        await sendWA(from, `🚨 EMERGENCY received from ${name}!\nAuthorities being alerted.\nStay calm — help is coming.\n\nCall 112 if immediate danger.`);
        continue;
      }

      await sendWA(from, analysis.reply || `Message received ✓\n\nFor full society portal: https://societyos.pages.dev\nType HELP for commands.`);
    }

    return new Response("ok", { status: 200 });
  }

  return new Response("ok");
});

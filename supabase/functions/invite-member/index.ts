// Sends a Supabase invite email after an authorised admin creates an invitation.
// The raw token is used only as the redirect secret. It is not written to a log.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const siteAllowed = /^(https:\/\/([a-z0-9-]+\.)*societyos\.pages\.dev|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "Invitation could not be sent." }, 405);

  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return json({ error: "Invitation could not be sent." }, 401);
  }

  let communityId = "";
  let email = "";
  let role = "";
  let siteUrl = "";
  try {
    const body = await req.json();
    communityId = String(body?.community_id ?? "");
    email = String(body?.email ?? "").trim().toLowerCase();
    role = String(body?.role ?? "");
    siteUrl = String(body?.site_url ?? "");
  } catch {
    return json({ error: "Invitation could not be sent." }, 400);
  }
  if (!communityId || !email.includes("@") || !role) {
    return json({ error: "Invitation could not be sent." }, 400);
  }

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !anonKey || !serviceKey) return json({ error: "Invitation could not be sent." }, 503);

  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const created = await caller.rpc("create_invitation", {
    p_community: communityId,
    p_email: email,
    p_role: role,
  });
  if (created.error || typeof created.data !== "string" || created.data.length < 32) {
    return json({ error: "Invitation could not be sent." }, 403);
  }

  const site = siteAllowed.test(siteUrl) ? siteUrl : Deno.env.get("SITE_URL") ?? "https://societyos.pages.dev";
  const admin = createClient(url, serviceKey);
  const invited = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${site}/join?invite=${encodeURIComponent(created.data)}`,
  });
  if (invited.error) {
    if (invited.error.code === "email_exists") return json({ error: "already_registered" }, 409);
    return json({ error: "Invitation could not be sent." }, 502);
  }
  return json({ ok: true }, 200);
});

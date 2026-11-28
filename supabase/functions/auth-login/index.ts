// Phone and PIN sign-in is discontinued.
// This handler returns before reading the body or opening a database client.
// The hosted copy stays live until this revision is deployed on purpose.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  return new Response(JSON.stringify({
    error: "Phone and PIN sign-in has been discontinued. Sign in with the email your community issued.",
  }), { status: 410, headers });
});

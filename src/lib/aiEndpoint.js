import { supabase } from "./supabase.js";

/** Headers for the configured AI endpoint. Supabase functions require a user access token. */
export async function aiRequestHeaders() {
  const headers = { "Content-Type": "application/json" };
  const endpoint = String(import.meta.env.VITE_AI_ENDPOINT || "");
  if (!endpoint.includes("/functions/v1/")) return headers;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

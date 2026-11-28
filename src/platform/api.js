import { supabase, isSupabaseConfigured } from "../lib/supabase.js";
import { errorMessage } from "../lib/async.js";

export { supabase, isSupabaseConfigured };

export function explain(error) {
  return errorMessage(error);
}

export async function rpc(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message || "Request failed");
  return data;
}

export async function rows(query) {
  const { data, error } = await query;
  if (error) throw new Error(error.message || "Request failed");
  return data || [];
}

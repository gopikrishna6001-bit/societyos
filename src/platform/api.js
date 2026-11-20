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

/** Reject if the promise does not settle in time (avoids infinite loading screens). */
export function withTimeout(promise, ms = 12000, label = "Request") {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out. Check your connection and try again.`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

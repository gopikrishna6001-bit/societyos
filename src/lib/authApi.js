const TIMEOUT_MS = 12000;

export const AUTH_URL = import.meta.env.VITE_AUTH_URL
  || (import.meta.env.VITE_SUPABASE_URL ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-login` : "");

export async function callAuth(body) {
  if (!AUTH_URL) return { error: "Authentication is not configured." };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    if (!data || typeof data !== "object") return { error: "Unexpected response from the server." };
    if (!response.ok && !data.error) return { ...data, error: `Request failed (${response.status}).` };
    return data;
  } catch (error) {
    if (error?.name === "AbortError") return { error: "The server took too long to respond. Try again." };
    return { error: "Could not reach the server. Check your connection and try again." };
  } finally {
    clearTimeout(timer);
  }
}

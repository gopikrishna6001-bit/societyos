export function errorMessage(error) {
  const text = error?.message || String(error || "Request failed");
  if (error?.name === "AbortError" || /aborted|timeout/i.test(text)) {
    return "The request timed out. Try again.";
  }
  if (/failed to fetch|network|load failed|not configured/i.test(text)) {
    return text.includes("not configured")
      ? text
      : "Could not reach the server. Check your connection and try again.";
  }
  return text;
}

export function raiseOnError(result) {
  if (result?.error) throw new Error(result.error.message || "Request failed");
  return result;
}

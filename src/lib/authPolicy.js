export const GENERIC_AUTH_ERROR = "Email or password is incorrect.";
export const NETWORK_AUTH_ERROR = "Could not reach the server. Check your connection and try again.";
export const RECOVERY_NOTICE = "If an account exists for that email, a recovery link is on its way.";
export const INVITE_INVALID = "This invitation is not valid.";

export function signInMessage(error) {
  const message = String(error?.message || error || "");
  if (/fetch|network|timeout|aborted|load failed|failed to fetch/i.test(message)) return NETWORK_AUTH_ERROR;
  return GENERIC_AUTH_ERROR;
}

export function passwordRule(password) {
  if (typeof password !== "string" || password.length < 8) return "Use at least 8 characters.";
  return "";
}

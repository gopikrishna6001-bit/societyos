/** OpenSociety-compatible guest pass QR helpers for SABHA. */

export const PASS_QR_PREFIX = "OS-PA:";
export const PASS_QR_PREFIX_SABHA = "SABHA-PA:";

/** String encoded in the guest-pass QR (OpenSociety wire format). */
export function passQrValue(code) {
  return `${PASS_QR_PREFIX}${String(code || "").trim().toUpperCase()}`;
}

/**
 * Extract a redeemable pass code from typed input, a QR payload, or a URL.
 * Accepts `OS-PA:CODE`, `SABHA-PA:CODE`, `?code=`, or a bare 6–16 char code.
 */
export function parsePassQrValue(scanned) {
  let candidate = String(scanned || "").trim();
  if (!candidate) return null;
  const upper = candidate.toUpperCase();
  if (upper.startsWith(PASS_QR_PREFIX)) {
    candidate = candidate.slice(PASS_QR_PREFIX.length);
  } else if (upper.startsWith(PASS_QR_PREFIX_SABHA)) {
    candidate = candidate.slice(PASS_QR_PREFIX_SABHA.length);
  } else if (/[?&]code=/i.test(candidate)) {
    const match = candidate.match(/[?&]code=([^&\s]+)/i);
    candidate = match ? decodeURIComponent(match[1]) : "";
  }
  candidate = candidate.trim().toUpperCase();
  return /^[A-Z0-9]{6,16}$/.test(candidate) ? candidate : null;
}

export function passShareMessage({ visitorName, code, communityName }) {
  const qr = passQrValue(code);
  return [
    visitorName || "Guest",
    communityName ? `Pass for ${communityName}` : "Guest pass",
    `Pass code: ${String(code || "").toUpperCase()}`,
    `QR: ${qr}`,
    "Show this code or QR at the gate.",
  ].join("\n");
}

export async function sharePassText(message) {
  if (typeof navigator !== "undefined" && navigator.share) {
    await navigator.share({ title: "Guest pass", text: message });
    return "shared";
  }
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(message);
    return "copied";
  }
  throw new Error("Share is not available on this device");
}

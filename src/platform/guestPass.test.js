import QRCode from "qrcode";
import { PASS_QR_PREFIX, parsePassQrValue, passQrValue, passShareMessage } from "./guestPass.js";

test("encodes OpenSociety-compatible QR payload", () => {
  expect(passQrValue("ab12cd")).toBe("OS-PA:AB12CD");
  expect(passQrValue(" AB12CD ")).toBe(`${PASS_QR_PREFIX}AB12CD`);
});

test("parses QR payloads, URLs, and bare codes", () => {
  expect(parsePassQrValue("OS-PA:5A4553")).toBe("5A4553");
  expect(parsePassQrValue("sabha-pa:5a4553")).toBe("5A4553");
  expect(parsePassQrValue("5A4553")).toBe("5A4553");
  expect(parsePassQrValue("https://example.test/gate?code=5A4553")).toBe("5A4553");
  expect(parsePassQrValue("not-a-code")).toBeNull();
});

test("share message includes code and QR payload", () => {
  const text = passShareMessage({ visitorName: "Ravi", code: "ABCDEF", communityName: "Palm Court" });
  expect(text).toContain("Ravi");
  expect(text).toContain("ABCDEF");
  expect(text).toContain("OS-PA:ABCDEF");
});

test("qrcode library draws a PNG data URL for the pass payload", async () => {
  const url = await QRCode.toDataURL(passQrValue("ABCDEF"), { width: 128 });
  expect(url.startsWith("data:image/png;base64,")).toBe(true);
  expect(url.length).toBeGreaterThan(100);
});

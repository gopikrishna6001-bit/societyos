import { brand, colors, documentTitle } from "./brand.js";

test("uses the approved SABHA identity", () => {
  expect(brand.name).toBe("SABHA");
  expect(brand.tagline).toBe("Clarity in Community.");
  expect(brand.descriptor).toBe("Community Governance & Transparency Platform");
  expect(brand.promise).toBe("Every rupee. Every decision. Accounted for.");
  expect(documentTitle).toBe("SABHA — Clarity in Community.");
  expect(colors).toEqual({
    navy: "#031D27",
    cyan: "#00D4E8",
    blue: "#0878E8",
    white: "#FFFFFF",
  });
});

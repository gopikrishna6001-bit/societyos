import { brand } from "../brand.js";

export function Mark({ size = 28, title }) {
  const label = title || "";
  return (
    <img
      src="/brand/sabha-logo.png"
      width={size}
      height={size}
      alt={label}
      aria-hidden={label ? undefined : true}
      style={{ width: size, height: size, borderRadius: "50%", display: "block", objectFit: "cover" }}
    />
  );
}

export function Wordmark({ tone = "ink", markSize = 28 }) {
  const color = tone === "light" ? "#f7f4ee" : "#1c1917";
  return (
    <span className="inline-flex items-center gap-2 font-display" style={{ color }}>
      <Mark size={markSize} />
      <span className="font-semibold tracking-[0.14em]">{brand.name}</span>
    </span>
  );
}

import { brand } from "../brand.js";

export function Mark({ size = 28, title }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role={title ? "img" : "presentation"} aria-hidden={title ? undefined : true} aria-label={title || undefined}>
      {title ? <title>{title}</title> : null}
      <path d="M11.2 8.4a10.4 10.4 0 1 0 9.6 0" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
      <path d="M11 18.75h10" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ tone = "ink", markSize = 28 }) {
  const color = tone === "light" ? "#f7f4ee" : "#1c1917";
  return (
    <span className="inline-flex items-center gap-2" style={{ color }}>
      <Mark size={markSize} />
      <span className="font-semibold tracking-[0.14em]">{brand.name}</span>
    </span>
  );
}

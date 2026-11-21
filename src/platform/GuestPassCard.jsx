import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { passQrValue, passShareMessage, sharePassText } from "./guestPass.js";

export default function GuestPassCard({
  code,
  visitorName,
  communityName,
  onAnother,
  onDone,
}) {
  const [dataUrl, setDataUrl] = useState("");
  const [qrError, setQrError] = useState("");
  const [shareMsg, setShareMsg] = useState("");
  const normalized = String(code || "").trim().toUpperCase();
  const payload = passQrValue(normalized);

  useEffect(() => {
    let live = true;
    setQrError("");
    setDataUrl("");
    if (!normalized) {
      setQrError("Missing pass code");
      return undefined;
    }
    QRCode.toDataURL(payload, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 280,
      color: { dark: "#031D27", light: "#FFFFFF" },
    })
      .then((url) => { if (live) setDataUrl(url); })
      .catch((cause) => { if (live) setQrError(cause?.message || "Could not draw QR"); });
    return () => { live = false; };
  }, [normalized, payload]);

  const message = passShareMessage({ visitorName, code: normalized, communityName });

  return (
    <section className="record">
      <header className="record-hero">
        <h1>Pass ready</h1>
        <p>Show this QR or code to {visitorName || "your guest"} at the gate.</p>
      </header>

      <div className="os-pass-card">
        <p className="os-pass-label">Guest pass</p>
        {dataUrl ? (
          <img className="os-pass-qr" src={dataUrl} alt={`QR for pass ${normalized}`} width={220} height={220} />
        ) : (
          <p className="record-muted" style={{ color: "rgba(255,255,255,0.85)" }}>{qrError || "Drawing QR…"}</p>
        )}
        <p className="os-pass-label">Pass code</p>
        <p className="os-pass-code" aria-label={`Pass code ${normalized.split("").join(" ")}`}>{normalized}</p>
        <p className="record-muted" style={{ color: "rgba(255,255,255,0.8)" }}>
          {visitorName || "Guest"} · valid until checked in
        </p>
      </div>

      <div className="demo-actions">
        <button
          type="button"
          className="demo-primary"
          onClick={async () => {
            setShareMsg("");
            try {
              const result = await sharePassText(message);
              setShareMsg(result === "shared" ? "Shared." : "Copied code and QR payload.");
            } catch (cause) {
              setShareMsg(cause?.message || "Could not share.");
            }
          }}
        >
          Share pass
        </button>
        {dataUrl && (
          <a className="demo-primary" href={dataUrl} download={`sabha-pass-${normalized}.png`} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
            Download QR
          </a>
        )}
        {onAnother && <button type="button" onClick={onAnother}>Create another</button>}
        {onDone && <button type="button" onClick={onDone}>Back to guests</button>}
      </div>
      {shareMsg && <p role="status" className="record-meta">{shareMsg}</p>}
    </section>
  );
}

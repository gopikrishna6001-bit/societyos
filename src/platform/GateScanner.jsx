import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { parsePassQrValue } from "./guestPass.js";

/** Web gate scanner: camera stream or uploaded QR image → pass code. */
export default function GateScanner({ open, onClose, onCode }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("camera");
  const handled = useRef(false);

  useEffect(() => {
    if (!open || mode !== "camera") return undefined;
    handled.current = false;
    let stream;
    let raf;
    let live = true;

    const stop = () => {
      live = false;
      if (raf) cancelAnimationFrame(raf);
      stream?.getTracks().forEach((track) => track.stop());
    };

    (async () => {
      try {
        setError("");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (!live || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const tick = () => {
          if (!live) return;
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (video && canvas && video.readyState >= 2) {
            const w = video.videoWidth;
            const h = video.videoHeight;
            if (w && h) {
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext("2d", { willReadFrequently: true });
              ctx.drawImage(video, 0, 0, w, h);
              const image = ctx.getImageData(0, 0, w, h);
              const result = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
              if (result?.data && !handled.current) {
                const code = parsePassQrValue(result.data);
                if (code) {
                  handled.current = true;
                  onCode(code);
                  stop();
                  return;
                }
              }
            }
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch (cause) {
        setError(cause?.message || "Camera unavailable. Enter the code or upload a QR image.");
        setMode("upload");
      }
    })();

    return stop;
  }, [open, mode, onCode]);

  if (!open) return null;

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = canvasRef.current;
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(bitmap, 0, 0);
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(image.data, image.width, image.height);
      const code = parsePassQrValue(result?.data || "");
      if (!code) throw new Error("No guest-pass QR found in that image.");
      onCode(code);
    } catch (cause) {
      setError(cause?.message || "Could not read QR.");
    }
  };

  return (
    <div className="os-scanner" role="dialog" aria-label="Scan guest pass QR">
      <div className="os-scanner-panel">
        <header>
          <h2>Scan pass QR</h2>
          <button type="button" onClick={onClose}>Close</button>
        </header>
        <p className="record-muted">Point at the resident’s guest-pass QR, or upload a photo of it.</p>
        <div className="demo-actions">
          <button type="button" aria-pressed={mode === "camera"} onClick={() => setMode("camera")}>Camera</button>
          <button type="button" aria-pressed={mode === "upload"} onClick={() => setMode("upload")}>Upload image</button>
        </div>
        {mode === "camera" && (
          <video ref={videoRef} className="os-scanner-video" playsInline muted autoPlay />
        )}
        {mode === "upload" && (
          <label className="os-scanner-upload">
            Choose QR image
            <input type="file" accept="image/*" capture="environment" onChange={onFile} />
          </label>
        )}
        <canvas ref={canvasRef} hidden />
        {error && <p role="alert" className="auth-error">{error}</p>}
      </div>
    </div>
  );
}

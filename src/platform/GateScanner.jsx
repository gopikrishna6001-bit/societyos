import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { parsePassQrValue } from "./guestPass.js";

function extractCode(raw) {
  return parsePassQrValue(raw) || null;
}

function downsample(video, max = 480) {
  const vw = video.videoWidth || 0;
  const vh = video.videoHeight || 0;
  if (!vw || !vh) return null;
  const scale = Math.min(1, max / Math.max(vw, vh));
  const w = Math.max(1, Math.round(vw * scale));
  const h = Math.max(1, Math.round(vh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

/** Web gate scanner: camera + BarcodeDetector/jsQR, or uploaded QR image. */
export default function GateScanner({ open, onClose, onCode }) {
  const videoRef = useRef(null);
  const onCodeRef = useRef(onCode);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Starting camera…");
  const [mode, setMode] = useState("camera");

  useEffect(() => { onCodeRef.current = onCode; }, [onCode]);

  const emit = useCallback((code) => {
    if (!code) return;
    setStatus(`Found ${code}`);
    onCodeRef.current?.(code);
  }, []);

  useEffect(() => {
    if (!open || mode !== "camera") return undefined;
    let stream;
    let timer;
    let live = true;
    let handled = false;

    const stop = () => {
      live = false;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };

    const accept = (raw) => {
      if (!live || handled) return false;
      const code = extractCode(raw);
      if (!code) return false;
      handled = true;
      stop();
      emit(code);
      return true;
    };

    (async () => {
      try {
        setError("");
        setStatus("Starting camera…");
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera API not available in this browser.");
        }
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (!live) return;
        const video = videoRef.current;
        if (!video) return;
        video.setAttribute("playsinline", "true");
        video.muted = true;
        video.srcObject = stream;
        await video.play();
        setStatus("Point the camera at the guest-pass QR…");

        const Detector = window.BarcodeDetector;
        let detector = null;
        if (typeof Detector === "function") {
          try {
            detector = new Detector({ formats: ["qr_code"] });
          } catch {
            detector = null;
          }
        }

        timer = setInterval(async () => {
          if (!live || handled) return;
          const videoEl = videoRef.current;
          if (!videoEl || videoEl.readyState < 2) return;

          try {
            if (detector) {
              const codes = await detector.detect(videoEl);
              for (const item of codes || []) {
                if (accept(item.rawValue)) return;
              }
            }
          } catch {
            /* fall through to jsQR */
          }

          const image = downsample(videoEl, 480);
          if (!image) return;
          const result = jsQR(image.data, image.width, image.height, {
            inversionAttempts: "attemptBoth",
          });
          if (result?.data) accept(result.data);
        }, 250);
      } catch (cause) {
        setError(cause?.message || "Camera unavailable. Upload a QR image or type the code.");
        setMode("upload");
        setStatus("");
      }
    })();

    return stop;
  }, [open, mode, emit]);

  if (!open) return null;

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setStatus("Reading image…");
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const max = 900;
      const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" });
      const code = extractCode(result?.data || "");
      if (!code) throw new Error("No guest-pass QR found. Use an OS-PA:CODE QR from SABHA.");
      emit(code);
    } catch (cause) {
      setError(cause?.message || "Could not read QR.");
      setStatus("");
    }
  };

  return (
    <div className="os-scanner" role="dialog" aria-modal="true" aria-label="Scan guest pass QR">
      <div className="os-scanner-panel">
        <header>
          <h2>Scan pass QR</h2>
          <button type="button" onClick={onClose}>Close</button>
        </header>
        <p className="record-muted">Hold steady over the white QR on the pass. You can also upload a photo.</p>
        <div className="demo-actions">
          <button type="button" aria-pressed={mode === "camera"} onClick={() => setMode("camera")}>Camera</button>
          <button type="button" aria-pressed={mode === "upload"} onClick={() => setMode("upload")}>Upload image</button>
        </div>
        {mode === "camera" && (
          <div className="os-scanner-frame">
            <video ref={videoRef} className="os-scanner-video" playsInline muted autoPlay />
            <div className="os-scanner-reticle" aria-hidden="true" />
          </div>
        )}
        {mode === "upload" && (
          <label className="os-scanner-upload">
            Choose QR image
            <input type="file" accept="image/*" capture="environment" onChange={onFile} />
          </label>
        )}
        {status && <p role="status" className="record-meta">{status}</p>}
        {error && <p role="alert" className="auth-error">{error}</p>}
      </div>
    </div>
  );
}

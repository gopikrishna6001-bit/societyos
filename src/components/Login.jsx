import { useState, useEffect } from "react";
import { supabase, SOCIETY_ID } from "../lib/supabase";
import { callAuth } from "../lib/authApi";
import { brand } from "../brand.js";

const ink = "#031D27";
const mute = "#4f473f";
const line = "#d7e3ea";
const paper = "#031D27";
const card = "#FFFFFF";
const pine = "#0878E8";
const onNavy = "#FFFFFF";
const inp = { width: "100%", background: "#fff", border: `1px solid ${line}`, borderRadius: 12, padding: "14px 16px", color: ink, fontSize: 28, outline: "none", boxSizing: "border-box", fontFamily: "inherit", textAlign: "center", letterSpacing: "12px" };

export default function Login({ onLogin }) {
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [resident, setResident] = useState(null);
  const [multipleFlats, setMultipleFlats] = useState([]);
  const [sessionData, setSessionData] = useState(null);
  const [society, setSociety] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [societyStatus, setSocietyStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    supabase.from("societies").select("name, city").eq("id", SOCIETY_ID).single()
      .then(({ data, error: queryError }) => {
        if (cancelled) return;
        if (queryError || !data) setSocietyStatus("unavailable");
        else { setSociety(data); setSocietyStatus("ready"); }
      })
      .catch(() => { if (!cancelled) setSocietyStatus("unavailable"); });
    return () => { cancelled = true; };
  }, []);

  const findByPhone = async () => {
    const cleaned = phone.replace(/\D/g, "").slice(-10);
    if (cleaned.length < 10) { setError("Enter a valid 10-digit phone number"); return; }
    setLoading(true); setError("");
    try {
      const result = await callAuth({ action: "lookup", phone: cleaned });
      if (result.error) { setError(result.error); return; }
      if (result.multiple) { setMultipleFlats(result.residents); setStep("select_flat"); }
      else { setResident(result.resident); setStep("pin"); }
    } finally {
      setLoading(false);
    }
  };

  const verifyPin = async () => {
    if (pin.length < 4) { setError("Enter your 4-digit PIN"); return; }
    setLoading(true); setError("");
    try {
      const result = await callAuth({ action: "login", phone, pin, resident_id: resident.id });
      if (result.error) { setError(result.error); setPin(""); return; }
      if (!result.session?.access_token) { setError("The server did not return a session."); return; }
      await supabase.auth.setSession({ access_token: result.session.access_token, refresh_token: result.session.refresh_token });
      if (result.first_login) { setSessionData(result); setStep("set_new_pin"); return; }
      onLogin({ resident: result.resident, role: result.role });
    } catch (e) {
      setError(e?.message || "Could not start the session.");
    } finally {
      setLoading(false);
    }
  };

  const setFirstPin = async () => {
    if (newPin.length !== 4) { setError("PIN must be 4 digits"); return; }
    if (newPin !== confirmPin) { setError("PINs do not match"); return; }
    setLoading(true); setError("");
    try {
      const result = await callAuth({ action: "set_pin", resident_id: sessionData.resident.id, new_pin: newPin });
      if (result.error) { setError(result.error); return; }
      setSuccess("PIN set! Entering app...");
      setTimeout(() => onLogin({ resident: { ...sessionData.resident, pin_changed: true }, role: sessionData.role }), 1000);
    } finally {
      setLoading(false);
    }
  };

  const phoneInp = { width: "100%", background: "#fff", border: `1px solid ${line}`, borderRadius: 12, padding: "14px 16px", color: ink, fontSize: 20, outline: "none", boxSizing: "border-box", fontFamily: "inherit", textAlign: "center", letterSpacing: "2px" };
  const btn = { background: pine, border: "none", borderRadius: 12, padding: "14px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 16, width: "100%", minHeight: 48 };
  const lbl = { color: mute, fontSize: 13, fontWeight: 600, marginBottom: 6, display: "block" };

  return (
    <div style={{ minHeight: "100vh", background: paper, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: '"Source Sans 3", sans-serif', color: ink }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#00D4E8" }}>
            <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
              <path d="M11.2 8.4a10.4 10.4 0 1 0 9.6 0" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
              <path d="M11 18.75h10" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
            </svg>
            <h1 style={{ color: onNavy, fontSize: 32, margin: 0, letterSpacing: "0.14em", lineHeight: 1 }}>{brand.name}</h1>
          </div>
          <p style={{ color: onNavy, fontSize: 18, margin: "12px 0 0" }}>{brand.tagline}</p>
          <p style={{ color: "#00D4E8", fontSize: 14, margin: "6px 0 0" }}>{societyStatus === "ready" ? `${society.name}, ${society.city}` : societyStatus === "unavailable" ? "Community name unavailable" : "Loading…"}</p>
        </div>

        <div style={{ background: card, border: `1px solid ${line}`, borderRadius: 16, padding: 20, boxShadow: "0 10px 24px rgba(28,25,23,0.08)" }}>

          {step === "phone" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <h2 style={{ color: ink, fontSize: 20, margin: "0 0 4px" }}>Sign in</h2>
                <p style={{ color: mute, fontSize: 14, margin: 0 }}>Use the mobile number already on your community list. This does not send an OTP.</p>
              </div>
              <input style={phoneInp} type="tel" value={phone}
                onChange={e => { setPhone(e.target.value); setError(""); }}
                placeholder="9XXXXXXXXX" maxLength={10}
                onKeyDown={e => e.key === "Enter" && findByPhone()} autoFocus />
              {error && <div style={{ color: "#9f1239", fontSize: 14, textAlign: "center" }}>{error}</div>}
              <button onClick={findByPhone} disabled={loading} style={{ ...btn, opacity: loading ? 0.7 : 1 }}>
                {loading ? "Checking…" : "Continue →"}
              </button>
              <div style={{ background: paper, borderRadius: 12, padding: 14, color: mute, fontSize: 14, lineHeight: 1.6 }}>
                The home page signs in with email and does not collect a mobile number. This older screen only checks a number your community already stored. It does not text an OTP.
              </div>
            </div>
          )}

          {step === "select_flat" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <button onClick={() => setStep("phone")} style={{ background: "none", border: "none", color: mute, cursor: "pointer", fontSize: 13, textAlign: "left" }}>← Back</button>
              <h3 style={{ color: ink, fontSize: 18, margin: 0 }}>Select Your Flat</h3>
              {multipleFlats.map(r => (
                <button key={r.id} onClick={() => { setResident(r); setStep("pin"); }}
                  style={{ background: paper, border: `1px solid ${line}`, borderRadius: 12, padding: "14px 18px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ color: ink, fontSize: 14, fontWeight: 700 }}>{r.name}</div>
                    <div style={{ color: pine, fontSize: 13, marginTop: 2 }}>{r.block ? `Block ${r.block} · ` : ""}Flat {r.flat_number}</div>
                  </div>
                  <span style={{ color: mute }}>›</span>
                </button>
              ))}
            </div>
          )}

          {step === "pin" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <button onClick={() => { setStep("phone"); setPin(""); setError(""); }} style={{ background: "none", border: "none", color: mute, cursor: "pointer", fontSize: 13, textAlign: "left" }}>← Back</button>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 52, height: 52, borderRadius: 2, background: "#EAE6DE", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontSize: 18, fontWeight: 800, color: pine }}>
                  {resident?.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div style={{ color: ink, fontSize: 16, fontWeight: 700 }}>{resident?.name}</div>
                <div style={{ color: pine, fontSize: 14, marginTop: 2 }}>{resident?.block ? `Block ${resident.block} · ` : ""}Flat {resident?.flat_number}</div>
              </div>
              <input style={inp} type="password" value={pin}
                onChange={e => { setPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }}
                placeholder="••••" maxLength={4}
                onKeyDown={e => e.key === "Enter" && verifyPin()} autoFocus />
              {error && <div style={{ color: "#9f1239", fontSize: 14, textAlign: "center" }}>{error}</div>}
              <button onClick={verifyPin} disabled={loading || pin.length < 4} style={{ ...btn, opacity: (loading || pin.length < 4) ? 0.6 : 1 }}>
                {loading ? "Verifying…" : "Login →"}
              </button>
              <div style={{ background: paper, borderRadius: 12, padding: 12, textAlign: "center", color: mute, fontSize: 14 }}>
                Forgot your PIN? Contact your society secretary.
              </div>
            </div>
          )}

          {step === "set_new_pin" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ textAlign: "center" }}>
                <h3 style={{ color: ink, fontSize: 18, margin: "0 0 6px" }}>Set your PIN</h3>
                <p style={{ color: mute, fontSize: 13, margin: 0 }}>First login — set a personal 4-digit PIN.</p>
              </div>
              <div>
                <label style={lbl}>New PIN</label>
                <input style={inp} type="password" value={newPin}
                  onChange={e => { setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }}
                  placeholder="••••" maxLength={4} autoFocus />
              </div>
              <div>
                <label style={lbl}>Confirm PIN</label>
                <input style={inp} type="password" value={confirmPin}
                  onChange={e => { setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && setFirstPin()}
                  placeholder="••••" maxLength={4} />
              </div>
              {error && <div style={{ color: "#9f1239", fontSize: 14, textAlign: "center" }}>{error}</div>}
              {success && <div style={{ color: pine, fontSize: 14, textAlign: "center" }}>{success}</div>}
              <button onClick={setFirstPin} disabled={loading || newPin.length < 4 || confirmPin.length < 4}
                style={{ ...btn, opacity: (loading || newPin.length < 4 || confirmPin.length < 4) ? 0.6 : 1 }}>
                {loading ? "Saving…" : "Set PIN & Enter →"}
              </button>
            </div>
          )}

        </div>
        <p style={{ color: onNavy, fontSize: 13, textAlign: "center", marginTop: 20 }}>{brand.promise}</p>
      </div>
    </div>
  );
}

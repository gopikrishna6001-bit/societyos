import { useState, useEffect } from "react";
import { supabase, SOCIETY_ID } from "../lib/supabase";

const AUTH_URL = "https://wzchqxwwezklxsxmjvyt.supabase.co/functions/v1/auth-login";
const inp = { width: "100%", background: "#0d1117", border: "1px solid #2a2f45", borderRadius: 10, padding: "14px 16px", color: "#e2e8f0", fontSize: 16, outline: "none", boxSizing: "border-box", fontFamily: "inherit", textAlign: "center" };

async function callAuth(body) {
  const res = await fetch(AUTH_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.json();
}

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

  useEffect(() => {
    supabase.from("societies").select("name, city").eq("id", SOCIETY_ID).single().then(({ data }) => setSociety(data));
  }, []);

  const findByPhone = async () => {
    const cleaned = phone.replace(/\D/g, "").slice(-10);
    if (cleaned.length < 10) { setError("Enter a valid 10-digit phone number"); return; }
    setLoading(true); setError("");
    const result = await callAuth({ action: "lookup", phone: cleaned });
    if (result.error) { setError(result.error); setLoading(false); return; }
    if (result.multiple) { setMultipleFlats(result.residents); setStep("select_flat"); }
    else { setResident(result.resident); setStep("pin"); }
    setLoading(false);
  };

  const selectFlat = (r) => { setResident(r); setMultipleFlats([]); setStep("pin"); };

  const verifyPin = async () => {
    if (pin.length < 4) { setError("Enter your 4-digit PIN"); return; }
    setLoading(true); setError("");
    const result = await callAuth({ action: "login", phone, pin, resident_id: resident.id });
    if (result.error) { setError(result.error); setPin(""); setLoading(false); return; }
    await supabase.auth.setSession({ access_token: result.session.access_token, refresh_token: result.session.refresh_token });
    if (result.first_login) { setSessionData(result); setStep("set_new_pin"); setLoading(false); return; }
    onLogin({ resident: result.resident, role: result.role });
    setLoading(false);
  };

  const setFirstPin = async () => {
    if (newPin.length !== 4) { setError("PIN must be 4 digits"); return; }
    if (newPin !== confirmPin) { setError("PINs do not match"); return; }
    if (newPin === pin) { setError("New PIN must be different from default PIN"); return; }
    setLoading(true); setError("");
    const result = await callAuth({ action: "set_pin", resident_id: sessionData.resident.id, new_pin: newPin });
    if (result.error) { setError(result.error); setLoading(false); return; }
    setSuccess("PIN set! Welcome to SocietyOS");
    setTimeout(() => onLogin({ resident: { ...sessionData.resident, pin_changed: true }, role: sessionData.role }), 1000);
    setLoading(false);
  };

  const resetToPhone = () => { setStep("phone"); setError(""); setPin(""); setResident(null); setMultipleFlats([]); };

  const Btn = ({ onClick, disabled, children }) => (
    <button onClick={onClick} disabled={disabled}
      style={{ background: "linear-gradient(135deg,#d97706,#f59e0b)", border: "none", borderRadius: 10, padding: "14px", color: "#0d0f14", fontWeight: 700, cursor: "pointer", fontSize: 15, width: "100%", opacity: disabled ? 0.6 : 1 }}>
      {children}
    </button>
  );

  const Back = ({ onClick }) => (
    <button onClick={onClick} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, padding: "0 0 16px", display: "flex", alignItems: "center", gap: 4 }}>← Back</button>
  );

  const PinInput = ({ value, onChange, onEnter, autoFocus }) => (
    <input style={{ ...inp, fontSize: 28, letterSpacing: "12px" }} type="password"
      value={value} onChange={e => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
      placeholder="••••" maxLength={4} autoFocus={autoFocus}
      onKeyDown={e => e.key === "Enter" && onEnter()} />
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg,#d97706,#f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 28 }}>☮</div>
          <h1 style={{ color: "#e2e8f0", fontSize: 26, fontFamily: "'Playfair Display',serif", margin: "0 0 4px" }}>SocietyOS</h1>
          <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>{society ? `${society.name}, ${society.city}` : "Loading…"}</p>
        </div>

        <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 20, padding: 28 }}>

          {step === "phone" && (
            <div>
              <h2 style={{ color: "#e2e8f0", fontSize: 20, fontFamily: "'Playfair Display',serif", margin: "0 0 4px" }}>Welcome back</h2>
              <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 24px" }}>Enter your registered phone number</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <input style={{ ...inp, letterSpacing: "2px", fontSize: 20 }} type="tel"
                  value={phone} onChange={e => { setPhone(e.target.value); setError(""); }}
                  placeholder="9XXXXXXXXX" maxLength={10}
                  onKeyDown={e => e.key === "Enter" && findByPhone()} autoFocus />
                {error && <div style={{ color: "#f87171", fontSize: 13, textAlign: "center" }}>{error}</div>}
                <Btn onClick={findByPhone} disabled={loading}>{loading ? "Checking…" : "Continue →"}</Btn>
              </div>
              <div style={{ marginTop: 20, padding: 14, background: "#0d1117", borderRadius: 10, color: "#475569", fontSize: 12, lineHeight: 1.8 }}>
                Use your registered mobile number.<br />Secretary shares your default PIN.<br />Set a new PIN on first login.
              </div>
            </div>
          )}

          {step === "select_flat" && (
            <div>
              <Back onClick={resetToPhone} />
              <h3 style={{ color: "#e2e8f0", fontSize: 18, fontFamily: "'Playfair Display',serif", margin: "0 0 6px" }}>Select Your Flat</h3>
              <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 20px" }}>Multiple flats found. Which flat are you logging into?</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {multipleFlats.map(r => (
                  <button key={r.id} onClick={() => selectFlat(r)}
                    style={{ background: "#0d1117", border: "1px solid #2a2f45", borderRadius: 12, padding: "14px 18px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700 }}>{r.name}</div>
                      <div style={{ color: "#fbbf24", fontSize: 12, marginTop: 2 }}>{r.block ? `Block ${r.block} · ` : ""}Flat {r.flat_number} · {r.type}</div>
                    </div>
                    <span style={{ color: "#475569", fontSize: 18 }}>›</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "pin" && (
            <div>
              <Back onClick={() => { setStep(multipleFlats.length ? "select_flat" : "phone"); setError(""); setPin(""); }} />
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "#f59e0b22", border: "2px solid #f59e0b44", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontSize: 18, fontWeight: 800, color: "#f59e0b" }}>
                  {resident?.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 700 }}>{resident?.name}</div>
                <div style={{ color: "#fbbf24", fontSize: 13, marginTop: 2 }}>{resident?.block ? `Block ${resident.block} · ` : ""}Flat {resident?.flat_number}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <PinInput value={pin} onChange={v => { setPin(v); setError(""); }} onEnter={verifyPin} autoFocus />
                {error && <div style={{ color: "#f87171", fontSize: 13, textAlign: "center" }}>{error}</div>}
                <Btn onClick={verifyPin} disabled={loading || pin.length < 4}>{loading ? "Verifying…" : "Login →"}</Btn>
                <div style={{ background: "#0d1117", borderRadius: 10, padding: 12, textAlign: "center", color: "#475569", fontSize: 12 }}>
                  Forgot your PIN? Contact your society secretary.
                </div>
              </div>
            </div>
          )}

          {step === "set_new_pin" && (
            <div>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔐</div>
                <h3 style={{ color: "#e2e8f0", fontSize: 18, fontFamily: "'Playfair Display',serif", margin: "0 0 6px" }}>Set Your PIN</h3>
                <p style={{ color: "#64748b", fontSize: 13, margin: 0, lineHeight: 1.6 }}>First login — set a personal 4-digit PIN.</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>New PIN</div>
                  <PinInput value={newPin} onChange={v => { setNewPin(v); setError(""); }} onEnter={setFirstPin} autoFocus />
                </div>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>Confirm PIN</div>
                  <PinInput value={confirmPin} onChange={v => { setConfirmPin(v); setError(""); }} onEnter={setFirstPin} />
                </div>
                {error && <div style={{ color: "#f87171", fontSize: 13, textAlign: "center" }}>{error}</div>}
                {success && <div style={{ color: "#4ade80", fontSize: 13, textAlign: "center" }}>{success}</div>}
                <Btn onClick={setFirstPin} disabled={loading || newPin.length < 4 || confirmPin.length < 4}>{loading ? "Saving…" : "Set PIN & Enter →"}</Btn>
              </div>
            </div>
          )}

        </div>
        <p style={{ color: "#2a2f45", fontSize: 11, textAlign: "center", marginTop: 20 }}>SocietyOS · Secured · Powered by Yasvik Foods Technology</p>
      </div>
    </div>
  );
}

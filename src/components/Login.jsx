// src/components/Login.jsx
import { useState, useEffect } from "react";
import { supabase, SOCIETY_ID } from "../lib/supabase";

const inp = {
  width: "100%", background: "#0d1117", border: "1px solid #2a2f45",
  borderRadius: 10, padding: "14px 16px", color: "#e2e8f0", fontSize: 16,
  outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  textAlign: "center",
};

export default function Login({ onLogin }) {
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [resident, setResident] = useState(null);
  const [society, setSociety] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    supabase.from("societies").select("name, city").eq("id", SOCIETY_ID).single()
      .then(({ data }) => setSociety(data));
  }, []);

  const findByPhone = async () => {
    const cleaned = phone.replace(/\D/g, "").slice(-10);
    if (cleaned.length < 10) { setError("Enter a valid 10-digit phone number"); return; }
    setLoading(true);
    setError("");
    const { data, error: err } = await supabase
      .from("residents")
      .select("*, committee_members(role)")
      .eq("society_id", SOCIETY_ID)
      .eq("phone", cleaned)
      .eq("status", "active");
    if (err || !data || data.length === 0) {
      setError("Phone number not registered. Contact your society secretary.");
      setLoading(false);
      return;
    }
    setResident(data[0]);
    setStep("pin");
    setLoading(false);
  };

  const verifyPin = async () => {
    if (pin.length < 4) { setError("Enter your 4-digit PIN"); return; }
    setLoading(true);
    setError("");
    if (resident.pin !== pin) {
      setError("Incorrect PIN. Try again or use Forgot PIN.");
      setPin("");
      setLoading(false);
      return;
    }
    await supabase.from("residents").update({ last_login: new Date().toISOString() }).eq("id", resident.id);
    onLogin({ resident, role: determineRole(resident) });
    setLoading(false);
  };

  const resetPin = async () => {
    if (newPin.length !== 4) { setError("PIN must be exactly 4 digits"); return; }
    if (newPin !== confirmPin) { setError("PINs do not match"); return; }
    if (newPin === "0000" || newPin === "1234") { setError("Choose a stronger PIN"); return; }
    setLoading(true);
    await supabase.from("residents").update({ pin: newPin, pin_changed: true }).eq("id", resident.id);
    setSuccess("✓ PIN reset! Logging you in…");
    setLoading(false);
    setTimeout(async () => {
      await supabase.from("residents").update({ last_login: new Date().toISOString() }).eq("id", resident.id);
      onLogin({ resident: { ...resident, pin: newPin, pin_changed: true }, role: determineRole(resident) });
    }, 1500);
  };

  const determineRole = (r) => {
    if (r.is_super_admin) return "super_admin";
    const cr = r.committee_members?.[0]?.role;
    if (cr === "President") return "president";
    if (cr === "Secretary") return "secretary";
    if (cr === "Treasurer") return "treasurer";
    if (cr) return "committee";
    if (r.type === "tenant") return "tenant";
    return "resident";
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg,#d97706,#f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 28 }}>☮</div>
          <h1 style={{ color: "#e2e8f0", fontSize: 26, fontFamily: "'Playfair Display',serif", margin: "0 0 4px" }}>SocietyOS</h1>
          <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>{society?.name || "Loading…"}{society?.city ? `, ${society.city}` : ""}</p>
        </div>

        <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 20, padding: 28 }}>

          {step === "phone" && (
            <div>
              <h2 style={{ color: "#e2e8f0", fontSize: 20, fontFamily: "'Playfair Display',serif", margin: "0 0 4px" }}>Welcome back</h2>
              <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 24px" }}>Enter your registered phone number</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <input style={{ ...inp, letterSpacing: "2px", fontSize: 20 }} type="tel" value={phone}
                  onChange={e => { setPhone(e.target.value); setError(""); }}
                  placeholder="9XXXXXXXXX" maxLength={10}
                  onKeyDown={e => e.key === "Enter" && findByPhone()} autoFocus />
                {error && <div style={{ color: "#f87171", fontSize: 13, textAlign: "center" }}>{error}</div>}
                <button onClick={findByPhone} disabled={loading}
                  style={{ background: "linear-gradient(135deg,#d97706,#f59e0b)", border: "none", borderRadius: 10, padding: "14px", color: "#0d0f14", fontWeight: 700, cursor: "pointer", fontSize: 15, opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Finding…" : "Continue →"}
                </button>
              </div>
              <div style={{ marginTop: 20, padding: 14, background: "#0d1117", borderRadius: 10, color: "#475569", fontSize: 12, lineHeight: 1.8 }}>
                Use your registered mobile number.<br/>
                Your secretary shares your default PIN.<br/>
                You can reset it after first login.
              </div>
            </div>
          )}

          {step === "pin" && (
            <div>
              <button onClick={() => { setStep("phone"); setError(""); setPin(""); }}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, padding: "0 0 16px", display: "flex", alignItems: "center", gap: 4 }}>← Back</button>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "#f59e0b22", border: "2px solid #f59e0b44", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontSize: 18, fontWeight: 800, color: "#f59e0b" }}>
                  {resident?.name?.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()}
                </div>
                <div style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 700 }}>{resident?.name}</div>
                <div style={{ color: "#fbbf24", fontSize: 13, marginTop: 2 }}>
                  {resident?.block ? `Block ${resident.block} · ` : ""}Flat {resident?.flat_number}
                </div>
                {!resident?.pin_changed && (
                  <div style={{ background: "#2d2510", border: "1px solid #fbbf2433", borderRadius: 8, padding: "8px 12px", marginTop: 10, color: "#fbbf24", fontSize: 11, lineHeight: 1.5 }}>
                    ⚠ Using default PIN. Please change after login.
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <input style={{ ...inp, fontSize: 28, letterSpacing: "12px" }} type="password" value={pin}
                  onChange={e => { setPin(e.target.value.replace(/\D/g, "").slice(0,4)); setError(""); }}
                  placeholder="••••" maxLength={4}
                  onKeyDown={e => e.key === "Enter" && verifyPin()} autoFocus />
                {error && <div style={{ color: "#f87171", fontSize: 13, textAlign: "center" }}>{error}</div>}
                <button onClick={verifyPin} disabled={loading || pin.length < 4}
                  style={{ background: "linear-gradient(135deg,#d97706,#f59e0b)", border: "none", borderRadius: 10, padding: "14px", color: "#0d0f14", fontWeight: 700, cursor: "pointer", fontSize: 15, opacity: (loading || pin.length < 4) ? 0.6 : 1 }}>
                  {loading ? "Verifying…" : "Login →"}
                </button>
                <button onClick={() => { setStep("forgot"); setError(""); setPin(""); }}
                  style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 13, textDecoration: "underline", padding: "4px" }}>
                  Forgot PIN?
                </button>
              </div>
            </div>
          )}

          {step === "forgot" && (
            <div>
              <button onClick={() => { setStep("pin"); setError(""); setNewPin(""); setConfirmPin(""); }}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, padding: "0 0 16px", display: "flex", alignItems: "center", gap: 4 }}>← Back</button>
              <h3 style={{ color: "#e2e8f0", fontSize: 18, fontFamily: "'Playfair Display',serif", margin: "0 0 6px" }}>Reset Your PIN</h3>
              <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 20px", lineHeight: 1.6 }}>
                Account found for <strong style={{ color: "#fbbf24" }}>{resident?.name}</strong>.<br/>
                Set a new 4-digit PIN below.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, textAlign: "left" }}>New PIN</div>
                  <input style={{ ...inp, fontSize: 28, letterSpacing: "12px" }} type="password" value={newPin}
                    onChange={e => { setNewPin(e.target.value.replace(/\D/g, "").slice(0,4)); setError(""); }}
                    placeholder="••••" maxLength={4} autoFocus />
                </div>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, textAlign: "left" }}>Confirm PIN</div>
                  <input style={{ ...inp, fontSize: 28, letterSpacing: "12px" }} type="password" value={confirmPin}
                    onChange={e => { setConfirmPin(e.target.value.replace(/\D/g, "").slice(0,4)); setError(""); }}
                    placeholder="••••" maxLength={4}
                    onKeyDown={e => e.key === "Enter" && resetPin()} />
                </div>
                {error && <div style={{ color: "#f87171", fontSize: 13, textAlign: "center" }}>{error}</div>}
                {success && <div style={{ color: "#4ade80", fontSize: 13, textAlign: "center" }}>{success}</div>}
                <button onClick={resetPin} disabled={loading || newPin.length < 4 || confirmPin.length < 4}
                  style={{ background: "linear-gradient(135deg,#d97706,#f59e0b)", border: "none", borderRadius: 10, padding: "14px", color: "#0d0f14", fontWeight: 700, cursor: "pointer", fontSize: 15, opacity: (newPin.length < 4) ? 0.6 : 1 }}>
                  {loading ? "Saving…" : "Set New PIN & Login"}
                </button>
              </div>
            </div>
          )}

        </div>
        <p style={{ color: "#2a2f45", fontSize: 11, textAlign: "center", marginTop: 20 }}>SocietyOS · Powered by Yasvik Foods Technology</p>
      </div>
    </div>
  );
}

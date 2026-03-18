// src/components/Login.jsx
import { useState } from "react";
import { supabase, SOCIETY_ID } from "../lib/supabase";

const inp = { width: "100%", background: "#0d1117", border: "1px solid #2a2f45", borderRadius: 10, padding: "12px 16px", color: "#e2e8f0", fontSize: 16, outline: "none", boxSizing: "border-box", fontFamily: "inherit", textAlign: "center", letterSpacing: "2px" };
const lbl = { color: "#94a3b8", fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 8, display: "block", textAlign: "left" };

export default function Login({ onLogin }) {
  const [step, setStep] = useState("phone"); // phone → pin → done
  const [phone, setPhone] = useState("");
  const [block, setBlock] = useState("");
  const [flat, setFlat] = useState("");
  const [pin, setPin] = useState("");
  const [resident, setResident] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResetPin, setShowResetPin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  // Load blocks on mount
  useState(() => {
    supabase.from("blocks").select("*").eq("society_id", SOCIETY_ID)
      .then(({ data }) => setBlocks(data || []));
  });

  const findResident = async () => {
    if (!phone && !flat) { setError("Enter your phone number or flat number"); return; }
    setLoading(true);
    setError("");

    let query = supabase.from("residents")
      .select("*, committee_members(role)")
      .eq("society_id", SOCIETY_ID)
      .eq("status", "active");

    // Phone is primary identifier
    if (phone) query = query.eq("phone", phone.replace(/\D/g, "").slice(-10));
    if (flat) query = query.eq("flat_number", flat);
    if (block) query = query.eq("block", block);

    const { data, error: err } = await query;

    if (err || !data || data.length === 0) {
      setError("No resident found. Check your details or contact secretary.");
      setLoading(false);
      return;
    }

    // Multiple matches — need block to disambiguate
    if (data.length > 1 && !block) {
      setError(`Multiple flats found with number ${flat}. Please select your block.`);
      setLoading(false);
      return;
    }

    setResident(data[0]);
    setStep("pin");
    setLoading(false);
  };

  const verifyPin = async () => {
    if (!pin || pin.length < 4) { setError("Enter your 4-digit PIN"); return; }
    setLoading(true);
    setError("");

    if (resident.pin !== pin) {
      setError("Incorrect PIN. Try again or reset your PIN.");
      setLoading(false);
      return;
    }

    // Update last login
    await supabase.from("residents").update({ last_login: new Date().toISOString() }).eq("id", resident.id);

    // Determine role
    const role = determineRole(resident);

    onLogin({ resident, role });
    setLoading(false);
  };

  const resetPin = async () => {
    if (newPin.length !== 4) { setError("PIN must be exactly 4 digits"); return; }
    if (newPin !== confirmPin) { setError("PINs do not match"); return; }
    setLoading(true);
    await supabase.from("residents").update({ pin: newPin, pin_changed: true }).eq("id", resident.id);
    setResident(p => ({ ...p, pin: newPin, pin_changed: true }));
    setShowResetPin(false);
    setNewPin("");
    setConfirmPin("");
    setError("✓ PIN updated. Please login with your new PIN.");
    setLoading(false);
  };

  const determineRole = (r) => {
    if (r.is_super_admin) return "super_admin";
    const committeeRole = r.committee_members?.[0]?.role;
    if (committeeRole === "President") return "president";
    if (committeeRole === "Secretary") return "secretary";
    if (committeeRole === "Treasurer") return "treasurer";
    if (committeeRole) return "committee";
    if (r.type === "tenant") return "tenant";
    return "resident";
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg,#d97706,#f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>☮</div>
          <h1 style={{ color: "#e2e8f0", fontSize: 28, fontFamily: "'Playfair Display',serif", margin: "0 0 6px" }}>SocietyOS</h1>
          <p style={{ color: "#475569", fontSize: 14, margin: 0 }}>Sunrise Residency, Hyderabad</p>
        </div>

        <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 20, padding: 28 }}>

          {/* STEP 1 — Find resident */}
          {step === "phone" && (
            <div>
              <h2 style={{ color: "#e2e8f0", fontSize: 20, fontFamily: "'Playfair Display',serif", margin: "0 0 6px" }}>Welcome back</h2>
              <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 24px" }}>Enter your details to continue</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={lbl}>Phone Number</label>
                  <input style={inp} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="9XXXXXXXXX" maxLength={10} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={lbl}>Block</label>
                    <select style={{ ...inp, textAlign: "left", letterSpacing: 0 }} value={block} onChange={e => setBlock(e.target.value)}>
                      <option value="">Any</option>
                      {blocks.map(b => <option key={b.id} value={b.name}>Block {b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Flat Number</label>
                    <input style={inp} value={flat} onChange={e => setFlat(e.target.value)} placeholder="101" />
                  </div>
                </div>

                {error && <div style={{ color: "#f87171", fontSize: 13, textAlign: "center" }}>{error}</div>}

                <button onClick={findResident} disabled={loading}
                  style={{ background: "linear-gradient(135deg,#d97706,#f59e0b)", border: "none", borderRadius: 10, padding: "14px", color: "#0d0f14", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontSize: 15, opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Finding…" : "Continue →"}
                </button>
              </div>

              <div style={{ marginTop: 20, padding: 14, background: "#0d1117", borderRadius: 10, color: "#475569", fontSize: 12, lineHeight: 1.7 }}>
                <strong style={{ color: "#64748b" }}>Login with:</strong> Your registered phone number + flat number<br />
                Block is only needed if your flat number exists in multiple blocks<br />
                <strong style={{ color: "#64748b" }}>Default PIN:</strong> Flat number padded to 4 digits<br />
                Flat 101 → <strong style={{ color: "#fbbf24" }}>0101</strong> · Flat 22 → <strong style={{ color: "#fbbf24" }}>0022</strong>
              </div>
            </div>
          )}

          {/* STEP 2 — Enter PIN */}
          {step === "pin" && !showResetPin && (
            <div>
              <button onClick={() => { setStep("phone"); setError(""); setPin(""); }} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, padding: "0 0 16px", display: "flex", alignItems: "center", gap: 4 }}>← Back</button>

              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: "#f59e0b22", border: "2px solid #f59e0b44", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 20, fontWeight: 800, color: "#f59e0b" }}>
                  {resident?.name?.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()}
                </div>
                <div style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 700 }}>{resident?.name}</div>
                <div style={{ color: "#fbbf24", fontSize: 13 }}>Flat {resident?.flat_number} · {resident?.type}</div>
                {!resident?.pin_changed && (
                  <div style={{ background: "#2d2510", border: "1px solid #fbbf2433", borderRadius: 8, padding: "8px 14px", marginTop: 10, color: "#fbbf24", fontSize: 12 }}>
                    ⚠ You're using the default PIN. Please change it after login.
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={lbl}>Enter Your 4-digit PIN</label>
                  <input style={{ ...inp, fontSize: 24, letterSpacing: "8px" }} type="password" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" maxLength={4} onKeyDown={e => e.key === "Enter" && verifyPin()} autoFocus />
                </div>

                {error && <div style={{ color: error.startsWith("✓") ? "#4ade80" : "#f87171", fontSize: 13, textAlign: "center" }}>{error}</div>}

                <button onClick={verifyPin} disabled={loading || pin.length < 4}
                  style={{ background: "linear-gradient(135deg,#d97706,#f59e0b)", border: "none", borderRadius: 10, padding: "14px", color: "#0d0f14", fontWeight: 700, cursor: loading || pin.length < 4 ? "not-allowed" : "pointer", fontSize: 15, opacity: loading || pin.length < 4 ? 0.7 : 1 }}>
                  {loading ? "Verifying…" : "Login →"}
                </button>

                <button onClick={() => setShowResetPin(true)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 13, textDecoration: "underline" }}>
                  Forgot PIN? Reset it
                </button>
              </div>
            </div>
          )}

          {/* RESET PIN */}
          {step === "pin" && showResetPin && (
            <div>
              <button onClick={() => { setShowResetPin(false); setError(""); }} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, padding: "0 0 16px", display: "flex", alignItems: "center", gap: 4 }}>← Back to Login</button>

              <h3 style={{ color: "#e2e8f0", fontSize: 18, margin: "0 0 6px" }}>Reset PIN</h3>
              <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 20px" }}>Set a new 4-digit PIN for your account</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={lbl}>New PIN (4 digits)</label>
                  <input style={{ ...inp, fontSize: 24, letterSpacing: "8px" }} type="password" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" maxLength={4} />
                </div>
                <div>
                  <label style={lbl}>Confirm New PIN</label>
                  <input style={{ ...inp, fontSize: 24, letterSpacing: "8px" }} type="password" value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" maxLength={4} />
                </div>

                {error && <div style={{ color: "#f87171", fontSize: 13, textAlign: "center" }}>{error}</div>}

                <button onClick={resetPin} disabled={loading || newPin.length < 4}
                  style={{ background: "linear-gradient(135deg,#d97706,#f59e0b)", border: "none", borderRadius: 10, padding: "14px", color: "#0d0f14", fontWeight: 700, cursor: "pointer", fontSize: 15, opacity: newPin.length < 4 ? 0.7 : 1 }}>
                  {loading ? "Saving…" : "Set New PIN"}
                </button>
              </div>
            </div>
          )}
        </div>

        <p style={{ color: "#2a2f45", fontSize: 11, textAlign: "center", marginTop: 20 }}>
          SocietyOS · Powered by Yasvik Foods Technology
        </p>
      </div>
    </div>
  );
}

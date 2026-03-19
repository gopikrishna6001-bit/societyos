import { useState, useEffect } from "react";
import { supabase, SOCIETY_ID } from "./lib/supabase.js";
import Login from "./components/Login.jsx";
import DashboardReal from "./components/Dashboard.jsx";
import ComplaintsReal from "./components/Complaints.jsx";
import FinancesReal from "./components/Finances.jsx";
import ResidentsReal from "./components/Residents.jsx";
import GateReal from "./components/Gate.jsx";
import NoticesReal from "./components/Notices.jsx";
import PollsReal from "./components/Polls.jsx";
import MeetingsReal from "./components/Meetings.jsx";
import AmenitiesReal from "./components/Amenities.jsx";
import VolunteersReal from "./components/Volunteers.jsx";
import MaintenanceReal from "./components/Maintenance.jsx";
import CommitteeReal from "./components/Committee.jsx";
import WhatsAppCentreReal from "./components/WhatsAppCentre.jsx";
import AIAssistantReal from "./components/AIAssistant.jsx";
import SuperAdminReal from "./components/SuperAdmin.jsx";
import ResidentPortal from "./components/ResidentPortal.jsx";

// ─── Role definitions ──────────────────────────────────────────────────────────
// What each role can see in the navigation
const ROLE_NAV = {
  super_admin: [
    { id: "dashboard",   label: "Dashboard",    icon: "🏠" },
    { id: "conflicts",   label: "Complaints",   icon: "⚖️" },
    { id: "finances",    label: "Finances",     icon: "💰" },
    { id: "maintenance", label: "Maintenance",  icon: "🔧" },
    { id: "residents",   label: "Residents",    icon: "👥" },
    { id: "staff",       label: "Gate & Staff", icon: "🚦" },
    { id: "notices",     label: "Notices",      icon: "📢" },
    { id: "voting",      label: "Polls",        icon: "🗳️" },
    { id: "meetings",    label: "Meetings",     icon: "📅" },
    { id: "amenities",   label: "Amenities",    icon: "🏊" },
    { id: "volunteers",  label: "Volunteers",   icon: "🤝" },
    { id: "committee",   label: "Committee",    icon: "🏛️" },
    { id: "whatsapp",    label: "WhatsApp",     icon: "📱" },
    { id: "ai",          label: "AI Assistant", icon: "✨" },
    { id: "admin",       label: "Super Admin",  icon: "⚙️" },
  ],
  president: [
    { id: "dashboard",   label: "Dashboard",    icon: "🏠" },
    { id: "conflicts",   label: "Complaints",   icon: "⚖️" },
    { id: "finances",    label: "Finances",     icon: "💰" },
    { id: "maintenance", label: "Maintenance",  icon: "🔧" },
    { id: "residents",   label: "Residents",    icon: "👥" },
    { id: "notices",     label: "Notices",      icon: "📢" },
    { id: "voting",      label: "Polls",        icon: "🗳️" },
    { id: "meetings",    label: "Meetings",     icon: "📅" },
    { id: "committee",   label: "Committee",    icon: "🏛️" },
    { id: "volunteers",  label: "Volunteers",   icon: "🤝" },
    { id: "whatsapp",    label: "WhatsApp",     icon: "📱" },
    { id: "ai",          label: "AI Assistant", icon: "✨" },
  ],
  secretary: [
    { id: "dashboard",   label: "Dashboard",    icon: "🏠" },
    { id: "conflicts",   label: "Complaints",   icon: "⚖️" },
    { id: "maintenance", label: "Maintenance",  icon: "🔧" },
    { id: "residents",   label: "Residents",    icon: "👥" },
    { id: "staff",       label: "Gate & Staff", icon: "🚦" },
    { id: "notices",     label: "Notices",      icon: "📢" },
    { id: "meetings",    label: "Meetings",     icon: "📅" },
    { id: "volunteers",  label: "Volunteers",   icon: "🤝" },
    { id: "ai",          label: "AI Assistant", icon: "✨" },
  ],
  treasurer: [
    { id: "finances",    label: "Finances",     icon: "💰" },
    { id: "dashboard",   label: "Dashboard",    icon: "🏠" },
    { id: "residents",   label: "Residents",    icon: "👥" },
    { id: "whatsapp",    label: "WhatsApp",     icon: "📱" },
  ],
  committee: [
    { id: "dashboard",   label: "Dashboard",    icon: "🏠" },
    { id: "conflicts",   label: "Complaints",   icon: "⚖️" },
    { id: "notices",     label: "Notices",      icon: "📢" },
    { id: "meetings",    label: "Meetings",     icon: "📅" },
    { id: "voting",      label: "Polls",        icon: "🗳️" },
  ],
  resident: [],  // resident uses ResidentPortal, not this nav
  tenant: [],    // same
};

const ROLE_COLORS = {
  super_admin: "#f87171",
  president:   "#f59e0b",
  secretary:   "#818cf8",
  treasurer:   "#4ade80",
  committee:   "#38bdf8",
  resident:    "#64748b",
  tenant:      "#475569",
};

const ROLE_LABELS = {
  super_admin: "Super Admin",
  president:   "President",
  secretary:   "Secretary",
  treasurer:   "Treasurer",
  committee:   "Committee",
  resident:    "Resident",
  tenant:      "Tenant",
};

export default function SocietyOS() {
  const [auth, setAuth] = useState(null); // { resident, role }
  const [tab, setTab] = useState("dashboard");
  const [showMore, setShowMore] = useState(false);
  const [residentView, setResidentView] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [showChangePIN, setShowChangePIN] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinMsg, setPinMsg] = useState("");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    // Restore session from localStorage
    const saved = localStorage.getItem("societyos_auth");
    if (saved) {
      try { setAuth(JSON.parse(saved)); } catch(e) {}
    }
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleLogin = (authData) => {
    setAuth(authData);
    localStorage.setItem("societyos_auth", JSON.stringify(authData));
    // Set default tab based on role
    if (authData.role === "treasurer") setTab("finances");
    else setTab("dashboard");
  };

  const handleLogout = () => {
    setAuth(null);
    localStorage.removeItem("societyos_auth");
  };

  const changePin = async () => {
    if (newPin.length !== 4) { setPinMsg("PIN must be 4 digits"); return; }
    if (newPin !== confirmPin) { setPinMsg("PINs do not match"); return; }
    await supabase.from("residents").update({ pin: newPin, pin_changed: true }).eq("id", auth.resident.id);
    setAuth(p => ({ ...p, resident: { ...p.resident, pin: newPin, pin_changed: true } }));
    localStorage.setItem("societyos_auth", JSON.stringify({ ...auth, resident: { ...auth.resident, pin: newPin, pin_changed: true } }));
    setPinMsg("✓ PIN changed successfully");
    setNewPin(""); setConfirmPin("");
    setTimeout(() => { setShowChangePIN(false); setPinMsg(""); }, 2000);
  };

  // Show login if not authenticated
  if (!auth) return <Login onLogin={handleLogin} />;

  const { resident, role } = auth;
  const isResidentOnly = role === "resident" || role === "tenant";

  // Residents and tenants always see ResidentPortal
  if (isResidentOnly) {
    return (
      <div style={{ minHeight: "100vh", background: "#0d1117", fontFamily: "'DM Sans',system-ui,sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap'); * { box-sizing: border-box; }`}</style>
        {/* Resident topbar */}
        <div style={{ background: "#0a0d13", borderBottom: "1px solid #1e2535", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#d97706,#f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>☮</div>
            <div>
              <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 800 }}>SocietyOS</div>
              <div style={{ color: "#475569", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.8px" }}>Resident Portal</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ background: `${ROLE_COLORS[role]}22`, border: `1px solid ${ROLE_COLORS[role]}44`, borderRadius: 20, padding: "3px 10px", color: ROLE_COLORS[role], fontSize: 11, fontWeight: 700 }}>{ROLE_LABELS[role]}</div>
            <button onClick={handleLogout} style={{ background: "#1e2535", border: "1px solid #2a2f45", borderRadius: 8, padding: "5px 12px", color: "#64748b", cursor: "pointer", fontSize: 11 }}>Logout</button>
          </div>
        </div>
        <div style={{ padding: "16px 16px 100px" }}>
          <ResidentPortal flatNumber={resident.flat_number} residentId={resident.id} onExitResidentView={null} />
        </div>
      </div>
    );
  }

  // Committee / Admin views
  const navItems = ROLE_NAV[role] || ROLE_NAV.super_admin;
  const primaryNav = navItems.slice(0, 8);
  const moreNav = navItems.slice(8);

  const renderTab = () => {
    if (residentView) return <ResidentPortal flatNumber={residentView} onExitResidentView={() => setResidentView(null)} />;
    switch(tab) {
      case "dashboard":   return <DashboardReal onNavigate={setTab} />;
      case "conflicts":   return <ComplaintsReal />;
      case "finances":    return <FinancesReal />;
      case "maintenance": return <MaintenanceReal />;
      case "residents":   return <ResidentsReal />;
      case "staff":       return <GateReal />;
      case "notices":     return <NoticesReal />;
      case "voting":      return <PollsReal />;
      case "meetings":    return <MeetingsReal />;
      case "amenities":   return <AmenitiesReal />;
      case "volunteers":  return <VolunteersReal />;
      case "committee":   return <CommitteeReal />;
      case "whatsapp":    return <WhatsAppCentreReal />;
      case "ai":          return <AIAssistantReal />;
      case "admin":       return <SuperAdminReal />;
      default:            return <DashboardReal onNavigate={setTab} />;
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", fontFamily: "'DM Sans',system-ui,sans-serif", color: "#e2e8f0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0d1117; } ::-webkit-scrollbar-thumb { background: #2a2f45; border-radius: 3px; }
        @keyframes slideUp { from { transform: translateY(100%); opacity:0; } to { transform: translateY(0); opacity:1; } }
      `}</style>

      {/* Topbar */}
      <div style={{ background: "#0a0d13", borderBottom: "1px solid #1e2535", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#d97706,#f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>☮</div>
          <div>
            <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 800 }}>SocietyOS</div>
            <div style={{ color: "#475569", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px" }}>Sunrise Residency</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Resident view toggle — only for admin/committee */}
          {(role === "super_admin" || role === "secretary") && !residentView && (
            <button onClick={() => { const f = prompt("Enter flat number to preview:"); if(f) setResidentView(f); }}
              style={{ background: "#1b1b3a", border: "1px solid #818cf833", borderRadius: 8, padding: "5px 10px", color: "#818cf8", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
              👤 Preview
            </button>
          )}
          {residentView && (
            <button onClick={() => setResidentView(null)}
              style={{ background: "#2d1b1b", border: "1px solid #f8717133", borderRadius: 8, padding: "5px 10px", color: "#f87171", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
              ← Exit Preview
            </button>
          )}
          {/* Profile pill */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowChangePIN(p => !p)}
              style={{ display: "flex", gap: 8, alignItems: "center", background: "#1e2535", border: "1px solid #2a2f45", borderRadius: 20, padding: "4px 10px 4px 5px", cursor: "pointer" }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: `${ROLE_COLORS[role]}22`, border: `1px solid ${ROLE_COLORS[role]}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: ROLE_COLORS[role] }}>
                {resident.name?.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()}
              </div>
              {!isMobile && (
                <div style={{ textAlign: "left" }}>
                  <div style={{ color: "#e2e8f0", fontSize: 11, fontWeight: 700, lineHeight: 1 }}>{resident.name?.split(" ")[0]}</div>
                  <div style={{ color: ROLE_COLORS[role], fontSize: 9, fontWeight: 600 }}>{ROLE_LABELS[role]}</div>
                </div>
              )}
            </button>

            {/* Profile dropdown */}
            {showChangePIN && (
              <div style={{ position: "absolute", right: 0, top: 42, background: "#161b27", border: "1px solid #2a2f45", borderRadius: 14, padding: 16, width: 240, zIndex: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700 }}>{resident.name}</div>
                  <div style={{ color: "#475569", fontSize: 12 }}>Flat {resident.flat_number} · {resident.phone}</div>
                  <div style={{ color: ROLE_COLORS[role], fontSize: 11, fontWeight: 700, marginTop: 4 }}>{ROLE_LABELS[role]}</div>
                </div>
                {!resident.pin_changed && (
                  <div style={{ background: "#2d2510", borderRadius: 8, padding: "8px 10px", marginBottom: 12, color: "#fbbf24", fontSize: 11 }}>⚠ Change your default PIN</div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                  <input type="password" placeholder="New PIN (4 digits)" maxLength={4}
                    style={{ background: "#0d1117", border: "1px solid #2a2f45", borderRadius: 8, padding: "8px 12px", color: "#e2e8f0", fontSize: 14, outline: "none", letterSpacing: "4px", textAlign: "center" }}
                    value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g,"").slice(0,4))} />
                  <input type="password" placeholder="Confirm PIN" maxLength={4}
                    style={{ background: "#0d1117", border: "1px solid #2a2f45", borderRadius: 8, padding: "8px 12px", color: "#e2e8f0", fontSize: 14, outline: "none", letterSpacing: "4px", textAlign: "center" }}
                    value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g,"").slice(0,4))} />
                  {pinMsg && <div style={{ color: pinMsg.startsWith("✓") ? "#4ade80" : "#f87171", fontSize: 11, textAlign: "center" }}>{pinMsg}</div>}
                  <button onClick={changePin} style={{ background: "linear-gradient(135deg,#d97706,#f59e0b)", border: "none", borderRadius: 8, padding: "8px", color: "#0d0f14", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Change PIN</button>
                </div>
                <button onClick={handleLogout} style={{ width: "100%", background: "#2d1b1b", border: "1px solid #f8717133", borderRadius: 8, padding: "8px", color: "#f87171", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "flex" }}>
        {/* Desktop sidebar */}
        {!isMobile && (
          <div style={{ width: 220, background: "#0a0d13", borderRight: "1px solid #1e2535", minHeight: "calc(100vh - 56px)", padding: "16px 12px", position: "sticky", top: 56, height: "calc(100vh - 56px)", overflowY: "auto", flexShrink: 0 }}>
            {navItems.map(item => (
              <button key={item.id} onClick={() => setTab(item.id)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, border: "none", background: tab === item.id ? "#1e2535" : "none", color: tab === item.id ? "#f59e0b" : "#64748b", cursor: "pointer", fontSize: 13, fontWeight: tab === item.id ? 700 : 500, marginBottom: 2, textAlign: "left" }}>
                <span>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
              </button>
            ))}
            {/* Role info at bottom of sidebar */}
            <div style={{ marginTop: 20, padding: "12px", background: "#161b27", borderRadius: 10, border: "1px solid #2a2f45" }}>
              <div style={{ color: "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Logged in as</div>
              <div style={{ color: ROLE_COLORS[role], fontSize: 13, fontWeight: 700 }}>{ROLE_LABELS[role]}</div>
              <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>Flat {resident.flat_number}</div>
            </div>
          </div>
        )}

        {/* Main content */}
        <div style={{ flex: 1, padding: isMobile ? "16px 14px 110px" : "24px 28px", overflowX: "hidden", maxWidth: isMobile ? "100vw" : "calc(100vw - 220px)", width: "100%" }}>
          {renderTab()}
        </div>
      </div>

      {/* Mobile bottom nav */}
      {isMobile && (
        <>
          {showMore && <div onClick={() => setShowMore(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 299 }} />}
          {showMore && moreNav.length > 0 && (
            <div style={{ position: "fixed", bottom: 70, left: 12, right: 12, background: "#161b27", border: "1px solid #2a2f45", borderRadius: 20, zIndex: 300, padding: 16, animation: "slideUp 0.2s ease" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {moreNav.map(item => (
                  <button key={item.id} onClick={() => { setTab(item.id); setShowMore(false); }}
                    style={{ background: tab === item.id ? "#1e2535" : "#0d1117", border: `1px solid ${tab === item.id ? "#f59e0b44" : "#2a2f45"}`, borderRadius: 12, padding: "14px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <span style={{ fontSize: 20 }}>{item.icon}</span>
                    <span style={{ color: tab === item.id ? "#f59e0b" : "#64748b", fontSize: 10, fontWeight: 600, textAlign: "center" }}>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#0a0d13", borderTop: "1px solid #1e2535", zIndex: 200, display: "flex", height: 66 }}>
            {primaryNav.map(item => {
              const isActive = tab === item.id && !showMore;
              return (
                <button key={item.id} onClick={() => { setTab(item.id); setShowMore(false); }}
                  style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, border: "none", background: "none", cursor: "pointer", position: "relative" }}>
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <span style={{ fontSize: 9, fontWeight: isActive ? 700 : 400, color: isActive ? "#f59e0b" : "#475569" }}>{item.label}</span>
                  {isActive && <div style={{ position: "absolute", bottom: 0, width: 20, height: 2, background: "#f59e0b", borderRadius: 1 }} />}
                </button>
              );
            })}
            {moreNav.length > 0 && (
              <button onClick={() => setShowMore(p => !p)}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, border: "none", background: "none", cursor: "pointer" }}>
                <span style={{ fontSize: 18 }}>⋯</span>
                <span style={{ fontSize: 9, fontWeight: showMore ? 700 : 400, color: showMore ? "#f59e0b" : "#475569" }}>More</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
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

const NAV = [
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
];

export default function SocietyOS() {
  const [tab, setTab] = useState("dashboard");
  const [showMore, setShowMore] = useState(false);
  const [residentView, setResidentView] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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

  const PRIMARY_NAV = ["dashboard","conflicts","finances","notices","voting","staff","volunteers","ai"];
  const MORE_NAV = NAV.filter(n => !PRIMARY_NAV.includes(n.id));

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
          {!residentView && (
            <button onClick={() => { const f = prompt("Flat number:"); if(f) setResidentView(f); }}
              style={{ background: "#1b1b3a", border: "1px solid #818cf833", borderRadius: 8, padding: "5px 12px", color: "#818cf8", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
              👤 Resident View
            </button>
          )}
          <button onClick={() => setTab("admin")}
            style={{ width: 32, height: 32, borderRadius: "50%", background: "#1e2535", border: "1px solid #2a2f45", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 }}>
            ⚙️
          </button>
        </div>
      </div>

      <div style={{ display: "flex" }}>
        {/* Desktop sidebar */}
        {!isMobile && (
          <div style={{ width: 220, background: "#0a0d13", borderRight: "1px solid #1e2535", minHeight: "calc(100vh - 56px)", padding: "16px 12px", position: "sticky", top: 56, height: "calc(100vh - 56px)", overflowY: "auto", flexShrink: 0 }}>
            {NAV.map(item => (
              <button key={item.id} onClick={() => setTab(item.id)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, border: "none", background: tab === item.id ? "#1e2535" : "none", color: tab === item.id ? "#f59e0b" : "#64748b", cursor: "pointer", fontSize: 13, fontWeight: tab === item.id ? 700 : 500, marginBottom: 2, textAlign: "left" }}>
                <span>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
              </button>
            ))}
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
          {showMore && (
            <div style={{ position: "fixed", bottom: 70, left: 12, right: 12, background: "#161b27", border: "1px solid #2a2f45", borderRadius: 20, zIndex: 300, padding: 16, animation: "slideUp 0.2s ease" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {MORE_NAV.map(item => (
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
            {PRIMARY_NAV.map(id => {
              const item = NAV.find(n => n.id === id);
              const isActive = tab === id && !showMore;
              return (
                <button key={id} onClick={() => { setTab(id); setShowMore(false); }}
                  style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, border: "none", background: "none", cursor: "pointer" }}>
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                  <span style={{ fontSize: 9, fontWeight: isActive ? 700 : 400, color: isActive ? "#f59e0b" : "#475569" }}>{item.label}</span>
                  {isActive && <div style={{ position: "absolute", bottom: 0, width: 20, height: 2, background: "#f59e0b", borderRadius: 1 }} />}
                </button>
              );
            })}
            <button onClick={() => setShowMore(p => !p)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, border: "none", background: "none", cursor: "pointer" }}>
              <span style={{ fontSize: 20 }}>⋯</span>
              <span style={{ fontSize: 9, fontWeight: showMore ? 700 : 400, color: showMore ? "#f59e0b" : "#475569" }}>More</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

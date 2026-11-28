import { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "./lib/supabase.js";
import { brand, colors } from "./brand.js";
import { Mark } from "./brand/Mark.jsx";
import { RESIDENT_READ_COLUMNS, roleFromResident } from "./lib/residentAccess.js";
import Login from "./components/Login.jsx";
import QueryStatus from "./components/QueryStatus.jsx";

const DashboardReal = lazy(() => import("./components/Dashboard.jsx"));
const ComplaintsReal = lazy(() => import("./components/Complaints.jsx"));
const FinancesReal = lazy(() => import("./components/Finances.jsx"));
const ResidentsReal = lazy(() => import("./components/Residents.jsx"));
const GateReal = lazy(() => import("./components/Gate.jsx"));
const NoticesReal = lazy(() => import("./components/Notices.jsx"));
const PollsReal = lazy(() => import("./components/Polls.jsx"));
const MeetingsReal = lazy(() => import("./components/Meetings.jsx"));
const AmenitiesReal = lazy(() => import("./components/Amenities.jsx"));
const VolunteersReal = lazy(() => import("./components/Volunteers.jsx"));
const MaintenanceReal = lazy(() => import("./components/Maintenance.jsx"));
const CommitteeReal = lazy(() => import("./components/Committee.jsx"));
const WhatsAppCentreReal = lazy(() => import("./components/WhatsAppCentre.jsx"));
const AIAssistantReal = lazy(() => import("./components/AIAssistant.jsx"));
const SuperAdminReal = lazy(() => import("./components/SuperAdmin.jsx"));
const ResidentPortal = lazy(() => import("./components/ResidentPortal.jsx"));

const ROLE_NAV = {
  super_admin: [
    { id: "dashboard",   label: "Dashboard",    icon: "🏠" },
    { id: "conflicts",   label: "Complaints",   icon: "⚖️" },
    { id: "finances",    label: "Finances",     icon: "💰" },
    { id: "maintenance", label: "Maintenance",  icon: "🔧" },
    { id: "residents",   label: "Residents",    icon: "👥" },
    { id: "notices",     label: "Notices",      icon: "📢" },
    { id: "voting",      label: "Polls",        icon: "🗳️" },
    { id: "meetings",    label: "Meetings",     icon: "📅" },
    { id: "committee",   label: "Committee",    icon: "🏛️" },
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
  ],
  secretary: [
    { id: "dashboard",   label: "Dashboard",    icon: "🏠" },
    { id: "conflicts",   label: "Complaints",   icon: "⚖️" },
    { id: "maintenance", label: "Maintenance",  icon: "🔧" },
    { id: "residents",   label: "Residents",    icon: "👥" },
    { id: "notices",     label: "Notices",      icon: "📢" },
    { id: "meetings",    label: "Meetings",     icon: "📅" },
  ],
  treasurer: [
    { id: "finances",    label: "Finances",     icon: "💰" },
    { id: "dashboard",   label: "Dashboard",    icon: "🏠" },
    { id: "residents",   label: "Residents",    icon: "👥" },
  ],
  committee: [
    { id: "dashboard",   label: "Dashboard",    icon: "🏠" },
    { id: "conflicts",   label: "Complaints",   icon: "⚖️" },
    { id: "notices",     label: "Notices",      icon: "📢" },
    { id: "meetings",    label: "Meetings",     icon: "📅" },
    { id: "voting",      label: "Polls",        icon: "🗳️" },
  ],
  resident: [],
  tenant: [],
};

const ROLE_COLORS = {
  super_admin: "#f87171", president: colors.cyan, secretary: "#818cf8",
  treasurer: "#4ade80", committee: "#38bdf8", resident: "#64748b", tenant: "#475569",
};

const ROLE_LABELS = {
  super_admin: "Super Admin", president: "President", secretary: "Secretary",
  treasurer: "Treasurer", committee: "Committee", resident: "Resident", tenant: "Tenant",
};

export default function SocietyOS() {
  const [auth, setAuth] = useState(null);
  const [societyName, setSocietyName] = useState("");
  const [tab, setTab] = useState("dashboard");
  const [showMore, setShowMore] = useState(false);
  const [residentView, setResidentView] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [showProfile, setShowProfile] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const adoptSession = async (session) => {
    const { data, error } = await supabase
      .from("residents")
      .select(`${RESIDENT_READ_COLUMNS}, committee_members(role)`)
      .eq("auth_user_id", session.user.id)
      .eq("status", "active")
      .limit(1);
    if (error) {
      setAuth({ email: session.user.email, resident: null, role: null, error: "Could not load the community record." });
      return;
    }
    const resident = data?.[0] || null;
    setAuth({ email: session.user.email, resident, role: roleFromResident(resident) });
    if (resident?.society_id) loadSocietyName(resident.society_id);
  };

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    localStorage.removeItem("societyos_auth");
    let live = true;
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!live) return;
      if (error || !data.session) {
        if (error) await supabase.auth.signOut({ scope: "local" });
        setAuth(null);
      } else {
        await adoptSession(data.session);
      }
      if (live) setSessionReady(true);
    }).catch(async () => {
      await supabase.auth.signOut({ scope: "local" });
      if (live) {
        setAuth(null);
        setSessionReady(true);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!live) return;
      if (!session) setAuth(null);
      else if (event === "SIGNED_IN") adoptSession(session);
    });
    return () => {
      live = false;
      data.subscription.unsubscribe();
      window.removeEventListener("resize", check);
    };
  }, []);

  const loadSocietyName = async (societyId) => {
    if (!societyId) return;
    try {
      const { data, error } = await supabase.from("societies").select("name").eq("id", societyId).single();
      if (error || !data?.name) setSocietyName("Community name unavailable");
      else setSocietyName(data.name);
    } catch {
      setSocietyName("Community name unavailable");
    }
  };

  const handleLogin = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) await adoptSession(data.session);
  };

  const handleLogout = () => {
    setAuth(null);
    setSocietyName("");
    localStorage.removeItem("societyos_auth");
    supabase.auth.signOut();
  };

  if (!sessionReady) return <p style={{ padding: 24, color: "#94a3b8" }}>Checking your session…</p>;
  if (!auth) return <Login onLogin={handleLogin} />;
  if (!auth.resident) {
    return (
      <main style={{ minHeight: "100vh", background: colors.navy, color: colors.white, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <section style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>{brand.name}</h1>
          <p>Signed in as {auth.email}. This login is not linked to a resident record yet. Ask a community administrator to send an invitation.</p>
          {auth.error && <p>{auth.error}</p>}
          <button type="button" onClick={handleLogout} style={{ marginTop: 16, background: colors.blue, color: colors.white, border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 700 }}>Sign out</button>
        </section>
      </main>
    );
  }

  const { resident, role } = auth;
  const isResidentOnly = role === "resident" || role === "tenant";

  if (isResidentOnly) {
    return (
      <div style={{ minHeight: "100vh", background: "#0d1117", fontFamily: "'DM Sans',system-ui,sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap'); * { box-sizing: border-box; }`}</style>
        <div style={{ background: colors.navy, borderBottom: "1px solid #1e2535", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Mark size={28} />
            <div>
              <div style={{ color: "#f7f4ee", fontSize: 14, fontWeight: 700, letterSpacing: "0.14em" }}>{brand.name}</div>
              <div style={{ color: "#475569", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.8px" }}>{societyName || "Resident Portal"}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ background: "#1e2535", border: "1px solid #2a2f45", borderRadius: 8, padding: "5px 12px", color: "#64748b", cursor: "pointer", fontSize: 11 }}>Logout</button>
        </div>
        <div style={{ padding: "16px 16px 100px" }}>
          <Suspense fallback={<QueryStatus loading label="Loading your portal…" />}>
            <ResidentPortal flatNumber={resident.flat_number} residentId={resident.id} onExitResidentView={null} />
          </Suspense>
        </div>
      </div>
    );
  }

  const navItems = ROLE_NAV[role] || ROLE_NAV.super_admin;
  const primaryNav = navItems.slice(0, 8);
  const moreNav = navItems.slice(8);

  const renderTab = () => {
    const screen = (() => {
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
    })();
    return <Suspense fallback={<QueryStatus loading label="Loading…" />}>{screen}</Suspense>;
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
      <div style={{ background: colors.navy, borderBottom: "1px solid #1e2535", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Mark size={28} />
          <div>
            <div style={{ color: "#f7f4ee", fontSize: 14, fontWeight: 700, letterSpacing: "0.14em" }}>{brand.name}</div>
            <div style={{ color: "#475569", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px" }}>{societyName || "Loading…"}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {(role === "super_admin" || role === "secretary") && !residentView && (
            <button onClick={() => { const f = prompt("Flat number to preview:"); if(f) setResidentView(f); }}
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
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowProfile(p => !p)}
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

            {showProfile && (
              <div onClick={e => e.stopPropagation()} style={{ position: "absolute", right: 0, top: 42, background: "#161b27", border: "1px solid #2a2f45", borderRadius: 14, padding: 16, width: 240, zIndex: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid #2a2f45" }}>
                  <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700 }}>{resident.name}</div>
                  <div style={{ color: "#475569", fontSize: 12, marginTop: 2 }}>Flat {resident.flat_number}</div>
                  <div style={{ color: ROLE_COLORS[role], fontSize: 11, fontWeight: 700, marginTop: 4 }}>{ROLE_LABELS[role]}</div>
                </div>
                <div style={{ marginBottom: 12, color: "#94a3b8", fontSize: 12 }}>{auth.email}</div>
                <button onClick={handleLogout} style={{ width: "100%", background: "#2d1b1b", border: "1px solid #f8717133", borderRadius: 8, padding: "8px", color: "#f87171", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showProfile && <div onClick={() => setShowProfile(false)} style={{ position: "fixed", inset: 0, zIndex: 199 }} />}

      <div style={{ display: "flex" }}>
        {!isMobile && (
          <div style={{ width: 220, background: colors.navy, borderRight: "1px solid #1e2535", minHeight: "calc(100vh - 56px)", padding: "16px 12px", position: "sticky", top: 56, height: "calc(100vh - 56px)", overflowY: "auto", flexShrink: 0 }}>
            {navItems.map(item => (
              <button key={item.id} onClick={() => setTab(item.id)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, border: "none", background: tab === item.id ? "#1e2535" : "none", color: tab === item.id ? colors.cyan : "#64748b", cursor: "pointer", fontSize: 13, fontWeight: tab === item.id ? 700 : 500, marginBottom: 2, textAlign: "left" }}>
                <span>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
              </button>
            ))}
            <div style={{ marginTop: 20, padding: "12px", background: "#161b27", borderRadius: 10, border: "1px solid #2a2f45" }}>
              <div style={{ color: "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Logged in as</div>
              <div style={{ color: ROLE_COLORS[role], fontSize: 13, fontWeight: 700 }}>{ROLE_LABELS[role]}</div>
              <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>Flat {resident.flat_number}</div>
            </div>
          </div>
        )}
        <div style={{ flex: 1, padding: isMobile ? "16px 14px 110px" : "24px 28px", overflowX: "hidden", maxWidth: isMobile ? "100vw" : "calc(100vw - 220px)", width: "100%" }}>
          {renderTab()}
        </div>
      </div>

      {isMobile && (
        <>
          {showMore && <div onClick={() => setShowMore(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 299 }} />}
          {showMore && moreNav.length > 0 && (
            <div style={{ position: "fixed", bottom: 70, left: 12, right: 12, background: "#161b27", border: "1px solid #2a2f45", borderRadius: 20, zIndex: 300, padding: 16, animation: "slideUp 0.2s ease" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {moreNav.map(item => (
                  <button key={item.id} onClick={() => { setTab(item.id); setShowMore(false); }}
                    style={{ background: tab === item.id ? "#1e2535" : "#0d1117", border: `1px solid ${tab === item.id ? `${colors.cyan}44` : "#2a2f45"}`, borderRadius: 12, padding: "14px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <span style={{ fontSize: 20 }}>{item.icon}</span>
                    <span style={{ color: tab === item.id ? colors.cyan : "#64748b", fontSize: 10, fontWeight: 600, textAlign: "center" }}>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: colors.navy, borderTop: "1px solid #1e2535", zIndex: 200, display: "flex", height: 66 }}>
            {primaryNav.map(item => {
              const isActive = tab === item.id && !showMore;
              return (
                <button key={item.id} onClick={() => { setTab(item.id); setShowMore(false); }}
                  style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, border: "none", background: "none", cursor: "pointer", position: "relative" }}>
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <span style={{ fontSize: 9, fontWeight: isActive ? 700 : 400, color: isActive ? colors.cyan : "#475569" }}>{item.label}</span>
                  {isActive && <div style={{ position: "absolute", bottom: 0, width: 20, height: 2, background: colors.cyan, borderRadius: 1 }} />}
                </button>
              );
            })}
            {moreNav.length > 0 && (
              <button onClick={() => setShowMore(p => !p)}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, border: "none", background: "none", cursor: "pointer" }}>
                <span style={{ fontSize: 18 }}>⋯</span>
                <span style={{ fontSize: 9, fontWeight: showMore ? 700 : 400, color: showMore ? colors.cyan : "#475569" }}>More</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

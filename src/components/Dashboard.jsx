// src/components/Dashboard.jsx
import { useState, useEffect } from "react";
import { supabase, SOCIETY_ID } from "../lib/supabase";

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "85vh", overflow: "auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: 17 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 24 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default function Dashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHealthModal, setShowHealthModal] = useState(false);

  const load = async () => {
    setLoading(true);
    const currentMonth = new Date().toISOString().slice(0, 7);

    const [soc, comp, inv, maint, polls, visitors, deliveries, notices, vol] = await Promise.all([
      supabase.from("societies").select("name,city,balance,monthly_fee").eq("id", SOCIETY_ID).single(),
      supabase.from("complaints").select("id,status,category,title,flat_number,created_at").eq("society_id", SOCIETY_ID).order("created_at", { ascending: false }).limit(20),
      supabase.from("invoices").select("id,flat_number,status,total_amount,amount_paid,balance_due,month").eq("society_id", SOCIETY_ID).eq("month", currentMonth),
      supabase.from("maintenance_tasks").select("id,status,title,priority,created_at").eq("society_id", SOCIETY_ID).order("created_at", { ascending: false }).limit(20),
      supabase.from("polls").select("id,status,question").eq("society_id", SOCIETY_ID).eq("status", "active"),
      supabase.from("visitors").select("id,name,flat_number,in_time,status").eq("society_id", SOCIETY_ID).eq("status", "inside").order("in_time", { ascending: false }),
      supabase.from("deliveries").select("id,flat_number,courier,status,in_time").eq("society_id", SOCIETY_ID).eq("status", "at-gate").order("in_time", { ascending: false }),
      supabase.from("notices").select("id,title,type,created_at,pinned").eq("society_id", SOCIETY_ID).eq("pinned", true),
      supabase.from("volunteers").select("id,hero_points,residents(name,flat_number)").eq("society_id", SOCIETY_ID).order("hero_points", { ascending: false }).limit(3),
    ]);

    const complaints = comp.data || [];
    const invoices = inv.data || [];
    const tasks = maint.data || [];

    const openComplaints = complaints.filter(c => c.status === "open").length;
    const paidInvoices = invoices.filter(i => i.status === "paid").length;
    const totalInvoices = invoices.length || 1;
    const collectionRate = Math.round((paidInvoices / totalInvoices) * 100);
    const openTasks = tasks.filter(t => t.status !== "completed").length;
    const totalCollected = invoices.reduce((s, i) => s + Number(i.amount_paid || 0), 0);
    const totalPending = invoices.reduce((s, i) => s + Number(i.balance_due || 0), 0);

    // Health score calculation
    const score = Math.min(100, Math.max(0,
      collectionRate * 0.4 +
      Math.max(0, 30 - openComplaints * 5) +
      Math.max(0, 30 - openTasks * 3)
    ));

    // Activity feed from real data
    const activities = [
      ...complaints.slice(0, 3).map(c => ({ time: c.created_at, text: `Flat ${c.flat_number}: ${c.title}`, type: "complaint", nav: "conflicts" })),
      ...invoices.filter(i => i.status === "paid").slice(0, 2).map(i => ({ time: new Date().toISOString(), text: `Flat ${i.flat_number} paid ${i.month} dues`, type: "finance", nav: "finances" })),
      ...tasks.slice(0, 2).map(t => ({ time: t.created_at, text: `Maintenance: ${t.title}`, type: "maintenance", nav: "maintenance" })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);

    setData({
      society: soc.data,
      score: Math.round(score),
      collectionRate,
      openComplaints,
      openTasks,
      activePolls: polls.data?.length || 0,
      totalCollected,
      totalPending,
      balance: soc.data?.balance || 0,
      paidInvoices,
      totalInvoices: invoices.length,
      visitors: visitors.data || [],
      deliveries: deliveries.data || [],
      pinnedNotices: notices.data || [],
      topVolunteers: vol.data || [],
      activities,
      healthBreakdown: [
        { label: "Fee collection", value: `${collectionRate}%`, detail: `${paidInvoices}/${invoices.length} flats paid`, color: "#4ade80", nav: "finances" },
        { label: "Open complaints", value: openComplaints, detail: "Needs resolution", color: "#f87171", nav: "conflicts" },
        { label: "Maintenance backlog", value: openTasks, detail: "Pending tasks", color: "#fbbf24", nav: "maintenance" },
        { label: "Active polls", value: polls.data?.length || 0, detail: "Awaiting votes", color: "#818cf8", nav: "voting" },
        { label: "Visitors inside", value: visitors.data?.length || 0, detail: "Currently on premises", color: "#38bdf8", nav: "staff" },
        { label: "Pending deliveries", value: deliveries.data?.length || 0, detail: "Awaiting collection", color: "#fb923c", nav: "staff" },
      ],
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const timeAgo = (d) => {
    const hrs = Math.floor((Date.now() - new Date(d)) / 3600000);
    if (hrs < 1) return "just now";
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const typeColor = { complaint: "#f87171", ai: "#818cf8", finance: "#4ade80", notice: "#fbbf24", maintenance: "#38bdf8", poll: "#a78bfa" };
  const scoreColor = data?.score >= 80 ? "#4ade80" : data?.score >= 60 ? "#fbbf24" : "#f87171";

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#64748b", fontSize: 14 }}>
      Loading dashboard…
    </div>
  );

  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", color: "#e2e8f0" }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: "#e2e8f0", fontSize: 24, fontFamily: "'Playfair Display',serif", margin: "0 0 4px" }}>Society Dashboard</h2>
        <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>{data.society?.name}, {data.society?.city} — Live Overview</p>
      </div>

      {/* Health Score */}
      <div onClick={() => setShowHealthModal(true)} style={{ background: "linear-gradient(135deg,#1a1f35,#161b27)", border: `1px solid ${scoreColor}33`, borderRadius: 16, padding: 20, marginBottom: 14, cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: `conic-gradient(${scoreColor} 0% ${data.score}%, #2a2f45 ${data.score}% 100%)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ width: 54, height: 54, borderRadius: "50%", background: "#161b27", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: scoreColor, fontSize: 18, fontWeight: 900 }}>{data.score}</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 3 }}>Community Health Score</div>
            <div style={{ color: "#e2e8f0", fontSize: 18, fontWeight: 700, marginBottom: 3 }}>
              {data.score >= 80 ? "Excellent" : data.score >= 60 ? "Moderate — Needs Attention" : "Poor — Immediate Action Needed"}
            </div>
            <div style={{ color: "#64748b", fontSize: 12 }}>{data.collectionRate}% fee collection · {data.openComplaints} open complaints · {data.openTasks} pending tasks</div>
          </div>
          <div style={{ color: "#64748b", fontSize: 18 }}>›</div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {[
            { v: `${data.collectionRate}%`, l: "Collection", c: "#4ade80" },
            { v: data.openComplaints, l: "Open Issues", c: "#f87171" },
            { v: data.openTasks, l: "Maintenance", c: "#fbbf24" },
          ].map((x, i) => (
            <div key={i} style={{ background: "#0d1117", borderRadius: 8, padding: "6px 12px", textAlign: "center", flex: 1, minWidth: 80 }}>
              <div style={{ color: x.c, fontSize: 16, fontWeight: 800 }}>{x.v}</div>
              <div style={{ color: "#475569", fontSize: 10 }}>{x.l}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, color: "#475569", fontSize: 11, textAlign: "right" }}>Tap for full breakdown →</div>
      </div>

      {/* Quick stats - clickable */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Open Complaints", value: data.openComplaints, color: "#f87171", icon: "⚠", nav: "conflicts", sub: "Tap to manage" },
          { label: "Pending Tasks", value: data.openTasks, color: "#fbbf24", icon: "🔧", nav: "maintenance", sub: "Tap to view" },
          { label: "Unpaid Dues", value: `${data.totalInvoices - data.paidInvoices} flats`, color: "#fb923c", icon: "₹", nav: "finances", sub: `₹${data.totalPending?.toLocaleString("en-IN")} pending` },
          { label: "Active Polls", value: data.activePolls, color: "#818cf8", icon: "🗳️", nav: "voting", sub: "Awaiting votes" },
        ].map((s, i) => (
          <div key={i} onClick={() => onNavigate(s.nav)} style={{ background: "#161b27", border: `1px solid ${s.color}22`, borderLeft: `3px solid ${s.color}`, borderRadius: 12, padding: 16, cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ color: "#64748b", fontSize: 10, fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>{s.label}</div>
                <div style={{ color: s.color, fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{s.value}</div>
                <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>{s.sub} ›</div>
              </div>
              <span style={{ fontSize: 22, opacity: 0.5 }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Society balance */}
      <div onClick={() => onNavigate("finances")} style={{ background: "linear-gradient(135deg,#1b2d1b,#161b27)", border: "1px solid #4ade8033", borderRadius: 14, padding: 18, marginBottom: 14, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: "#64748b", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Society Fund Balance</div>
          <div style={{ color: "#4ade80", fontSize: 28, fontWeight: 900 }}>₹{data.balance?.toLocaleString("en-IN")}</div>
          <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>Collected this month: ₹{data.totalCollected?.toLocaleString("en-IN")} · Tap for ledger →</div>
        </div>
        <div style={{ fontSize: 32 }}>💰</div>
      </div>

      {/* Live alerts */}
      {(data.visitors.length > 0 || data.deliveries.length > 0) && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ color: "#38bdf8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>🔔 Live Alerts</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.visitors.slice(0, 3).map(v => (
              <div key={v.id} onClick={() => onNavigate("staff")} style={{ background: "#1b2535", border: "1px solid #38bdf833", borderRadius: 10, padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#e2e8f0", fontSize: 13 }}>👤 {v.name} inside — Flat {v.flat_number}</span>
                <span style={{ color: "#38bdf8", fontSize: 11 }}>{timeAgo(v.in_time)}</span>
              </div>
            ))}
            {data.deliveries.slice(0, 3).map(d => (
              <div key={d.id} onClick={() => onNavigate("staff")} style={{ background: "#2d1b10", border: "1px solid #fb923c33", borderRadius: 10, padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#e2e8f0", fontSize: 13 }}>📦 {d.courier} delivery — Flat {d.flat_number}</span>
                <span style={{ color: "#fb923c", fontSize: 11 }}>At gate</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pinned notices */}
      {data.pinnedNotices.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ color: "#fbbf24", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>📌 Pinned Notices</div>
          {data.pinnedNotices.map(n => (
            <div key={n.id} onClick={() => onNavigate("notices")} style={{ background: "#2d2510", border: "1px solid #fbbf2433", borderRadius: 10, padding: "10px 14px", marginBottom: 6, cursor: "pointer" }}>
              <span style={{ color: "#e2e8f0", fontSize: 13 }}>{n.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Activity feed */}
      <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 18, marginBottom: 14 }}>
        <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Live Activity Feed</div>
        {data.activities.length === 0 ? (
          <div style={{ color: "#475569", fontSize: 13 }}>No recent activity. Data will appear here as your society uses the app.</div>
        ) : (
          data.activities.map((a, i) => (
            <div key={i} onClick={() => onNavigate(a.nav)} style={{ display: "flex", gap: 10, marginBottom: 12, paddingBottom: 12, borderBottom: i < data.activities.length - 1 ? "1px solid #1e2535" : "none", cursor: "pointer" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: typeColor[a.type] || "#64748b", marginTop: 5, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.4 }}>{a.text}</div>
                <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>{timeAgo(a.time)}</div>
              </div>
              <span style={{ color: "#2a2f45", fontSize: 14 }}>›</span>
            </div>
          ))
        )}
      </div>

      {/* Top volunteers */}
      {data.topVolunteers.length > 0 && (
        <div style={{ background: "linear-gradient(135deg,#2d2510,#161b27)", border: "1px solid #fbbf2422", borderRadius: 12, padding: 18, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ color: "#fbbf24", fontSize: 14, fontWeight: 600 }}>🏆 Hero Volunteers</div>
            <button onClick={() => onNavigate("volunteers")} style={{ background: "none", border: "none", color: "#fbbf24", cursor: "pointer", fontSize: 12 }}>View all →</button>
          </div>
          {data.topVolunteers.map((v, i) => (
            <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: i === 0 ? 18 : 14 }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                <span style={{ color: "#e2e8f0", fontSize: 13 }}>{v.residents?.name || "Unknown"} <span style={{ color: "#475569" }}>· Flat {v.residents?.flat_number}</span></span>
              </div>
              <span style={{ color: "#fbbf24", fontWeight: 800, fontSize: 14 }}>{v.hero_points} pts</span>
            </div>
          ))}
        </div>
      )}

      {/* Health breakdown modal */}
      <Modal open={showHealthModal} onClose={() => setShowHealthModal(false)} title="Community Health Breakdown">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.healthBreakdown.map((h, i) => (
            <div key={i} onClick={() => { setShowHealthModal(false); onNavigate(h.nav); }}
              style={{ background: "#0d1117", borderRadius: 10, padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${h.color}22` }}>
              <div>
                <div style={{ color: "#94a3b8", fontSize: 13 }}>{h.label}</div>
                <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>{h.detail}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: h.color, fontSize: 20, fontWeight: 800 }}>{h.value}</span>
                <span style={{ color: "#475569" }}>›</span>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

// src/components/Notices.jsx
import { useState, useEffect } from "react";
import { supabase, SOCIETY_ID } from "../lib/supabase";

const inp = { width: "100%", background: "#0d1117", border: "1px solid #2a2f45", borderRadius: 8, padding: "10px 12px", color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const lbl = { color: "#94a3b8", fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 5, display: "block" };
const btnPrimary = { background: "linear-gradient(135deg,#d97706,#f59e0b)", border: "none", borderRadius: 8, padding: "10px 18px", color: "#0d0f14", fontWeight: 700, cursor: "pointer", fontSize: 14 };

const TYPE_CONFIG = {
  urgent:     { color: "#f87171", bg: "#2d1b1b", icon: "🚨" },
  info:       { color: "#38bdf8", bg: "#1b2535", icon: "ℹ️" },
  event:      { color: "#a78bfa", bg: "#1b1b3a", icon: "🎉" },
  compliance: { color: "#fbbf24", bg: "#2d2510", icon: "📋" },
  alert:      { color: "#fb923c", bg: "#2d1f0e", icon: "⚠️" },
};

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "88vh", overflow: "auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: 17 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 24 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default function Notices() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [form, setForm] = useState({ title: "", content: "", type: "info", target: "all", author: "Committee", pinned: false });

  const toast = (text, color = "#4ade80") => { setMsg({ text, color }); setTimeout(() => setMsg(null), 3000); };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("notices").select("*").eq("society_id", SOCIETY_ID).order("pinned", { ascending: false }).order("created_at", { ascending: false });
    setNotices(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createNotice = async () => {
    if (!form.title || !form.content) { toast("Title and content required", "#f87171"); return; }
    setSaving(true);
    const { error } = await supabase.from("notices").insert({ ...form, society_id: SOCIETY_ID, read_count: 0 });
    if (error) { toast(error.message, "#f87171"); setSaving(false); return; }
    toast("✓ Notice posted");
    setShowCreate(false);
    setForm({ title: "", content: "", type: "info", target: "all", author: "Committee", pinned: false });
    await load();
    setSaving(false);
  };

  const togglePin = async (n) => {
    await supabase.from("notices").update({ pinned: !n.pinned }).eq("id", n.id);
    setNotices(p => p.map(x => x.id === n.id ? { ...x, pinned: !n.pinned } : x));
    toast(n.pinned ? "Unpinned" : "📌 Pinned");
  };

  const deleteNotice = async (id) => {
    await supabase.from("notices").delete().eq("id", id);
    setNotices(p => p.filter(n => n.id !== id));
    toast("Notice deleted");
  };

  const filtered = notices.filter(n => filter === "all" || n.type === filter);
  const pinned = filtered.filter(n => n.pinned);
  const unpinned = filtered.filter(n => !n.pinned);

  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", color: "#e2e8f0" }}>
      {msg && <div style={{ position: "fixed", top: 20, right: 20, background: "#161b27", border: `1px solid ${msg.color}44`, borderRadius: 10, padding: "12px 20px", color: msg.color, fontSize: 13, fontWeight: 600, zIndex: 9999 }}>{msg.text}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ color: "#e2e8f0", fontSize: 24, fontFamily: "'Playfair Display',serif", margin: "0 0 4px" }}>Notice Board</h2>
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>{notices.length} notices · {pinned.length} pinned</p>
        </div>
        <button style={btnPrimary} onClick={() => setShowCreate(true)}>+ Post Notice</button>
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 5, marginBottom: 18, background: "#0d1117", borderRadius: 10, padding: 4, width: "fit-content", overflowX: "auto" }}>
        {["all", "urgent", "info", "event", "compliance", "alert"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? "#1e2535" : "none", border: filter === f ? "1px solid #2a2f45" : "none", borderRadius: 8, padding: "7px 14px", color: filter === f ? "#e2e8f0" : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: 600, textTransform: "capitalize", whiteSpace: "nowrap" }}>{f}</button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading…</div> : (
        <div>
          {/* Pinned */}
          {pinned.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: "#fbbf24", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>📌 Pinned</div>
              {pinned.map(n => <NoticeCard key={n.id} n={n} expanded={expanded} setExpanded={setExpanded} togglePin={togglePin} deleteNotice={deleteNotice} />)}
            </div>
          )}

          {/* All others */}
          {unpinned.length > 0 && (
            <div>
              {pinned.length > 0 && <div style={{ color: "#475569", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>All Notices</div>}
              {unpinned.map(n => <NoticeCard key={n.id} n={n} expanded={expanded} setExpanded={setExpanded} togglePin={togglePin} deleteNotice={deleteNotice} />)}
            </div>
          )}

          {filtered.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#475569" }}>No notices yet. Post one!</div>}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Post New Notice">
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div><label style={lbl}>Title *</label><input style={inp} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Notice title" /></div>
          <div><label style={lbl}>Content *</label><textarea style={{ ...inp, height: 100, resize: "vertical" }} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Full notice content…" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Type</label>
              <select style={inp} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {["info", "urgent", "event", "compliance", "alert"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Target</label>
              <select style={inp} value={form.target} onChange={e => setForm({ ...form, target: e.target.value })}>
                <option value="all">All Residents</option>
                <option value="owners">Owners Only</option>
                <option value="tenants">Tenants Only</option>
                <option value="committee">Committee Only</option>
              </select>
            </div>
          </div>
          <div><label style={lbl}>Posted By</label><input style={inp} value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} /></div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="checkbox" id="pin" checked={form.pinned} onChange={e => setForm({ ...form, pinned: e.target.checked })} />
            <label htmlFor="pin" style={{ color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>Pin this notice</label>
          </div>
          <button style={{ ...btnPrimary, justifyContent: "center", opacity: saving ? 0.6 : 1 }} onClick={createNotice} disabled={saving}>
            {saving ? "Posting…" : "Post Notice"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function NoticeCard({ n, expanded, setExpanded, togglePin, deleteNotice }) {
  const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
  const isExpanded = expanded === n.id;
  const timeAgo = (d) => {
    const hrs = Math.floor((Date.now() - new Date(d)) / 3600000);
    if (hrs < 1) return "just now";
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };
  return (
    <div style={{ background: "#161b27", border: `1px solid ${n.pinned ? cfg.color + "44" : "#2a2f45"}`, borderLeft: `3px solid ${cfg.color}`, borderRadius: 14, padding: 18, marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>{cfg.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6, alignItems: "center" }}>
            <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: "2px 10px", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{n.type}</span>
            {n.pinned && <span style={{ color: "#fbbf24", fontSize: 10, fontWeight: 700 }}>📌 PINNED</span>}
            <span style={{ color: "#475569", fontSize: 11 }}>{n.target !== "all" ? `→ ${n.target}` : "All residents"}</span>
            <span style={{ color: "#475569", fontSize: 11 }}>· {timeAgo(n.created_at)}</span>
          </div>
          <div style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{n.title}</div>
          <div style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6 }}>
            {isExpanded ? n.content : n.content.length > 120 ? n.content.slice(0, 120) + "…" : n.content}
          </div>
          {n.content.length > 120 && (
            <button onClick={() => setExpanded(isExpanded ? null : n.id)} style={{ background: "none", border: "none", color: cfg.color, cursor: "pointer", fontSize: 12, padding: "4px 0", marginTop: 4 }}>
              {isExpanded ? "Show less" : "Read more"}
            </button>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <span style={{ color: "#475569", fontSize: 11 }}>By {n.author}</span>
            {n.read_count > 0 && <span style={{ color: "#475569", fontSize: 11 }}>· {n.read_count} read</span>}
            <button onClick={() => togglePin(n)} style={{ background: "none", border: "none", color: n.pinned ? "#fbbf24" : "#475569", cursor: "pointer", fontSize: 11, padding: 0 }}>
              {n.pinned ? "📌 Unpin" : "Pin"}
            </button>
            <button onClick={() => deleteNotice(n.id)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 11, padding: 0 }}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}

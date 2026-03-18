// src/components/Complaints.jsx
import { useState, useEffect } from "react";
import { supabase, SOCIETY_ID } from "../lib/supabase";

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN") : "—";
const elapsed = (d) => {
  const hrs = Math.floor((Date.now() - new Date(d)) / 3600000);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const PRIORITY_COLOR = { high: "#f87171", medium: "#fbbf24", low: "#4ade80" };
const STATUS_COLOR = {
  open: "#f87171", assigned: "#38bdf8", "in-progress": "#fbbf24",
  escalated: "#fb923c", mediating: "#818cf8", resolved: "#4ade80",
  closed: "#64748b", reopened: "#f87171"
};

const Badge = ({ label, color }) => (
  <span style={{ background: `${color}18`, color, border: `1px solid ${color}33`, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{label}</span>
);

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "88vh", overflow: "auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: 17 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 24 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const inp = { width: "100%", background: "#0d1117", border: "1px solid #2a2f45", borderRadius: 8, padding: "10px 12px", color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const lbl = { color: "#94a3b8", fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 5, display: "block" };
const btnPrimary = { background: "linear-gradient(135deg,#d97706,#f59e0b)", border: "none", borderRadius: 8, padding: "10px 18px", color: "#0d0f14", fontWeight: 700, cursor: "pointer", fontSize: 14 };

const CATEGORIES = ["Noise", "Parking", "Water", "Electrical", "Hygiene", "Security", "Lift", "Maintenance", "Pets", "Other"];

export default function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [myVotes, setMyVotes] = useState({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState({});
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  // Forms
  const [showRaise, setShowRaise] = useState(false);
  const [showResolve, setShowResolve] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [resolveText, setResolveText] = useState("");
  const [form, setForm] = useState({ title: "", description: "", category: "Noise", priority: "medium", flat_number: "", anonymous: false });

  const toast = (text, color = "#4ade80") => { setMsg({ text, color }); setTimeout(() => setMsg(null), 3000); };

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("complaints")
      .select("*")
      .eq("society_id", SOCIETY_ID)
      .order("created_at", { ascending: false });
    setComplaints(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Realtime
  useEffect(() => {
    const channel = supabase.channel("complaints_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "complaints", filter: `society_id=eq.${SOCIETY_ID}` },
        () => load())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // ── Open detail ───────────────────────────────────────────────────────────
  const openDetail = async (c) => {
    setSelected(c);
    setDetail(c);
    const [cm, hist] = await Promise.all([
      supabase.from("complaint_comments").select("*").eq("complaint_id", c.id).order("created_at"),
      supabase.from("complaint_history").select("*").eq("complaint_id", c.id).order("created_at"),
    ]);
    setComments(cm.data || []);
    setHistory(hist.data || []);
  };

  // ── Raise complaint ───────────────────────────────────────────────────────
  const raiseComplaint = async () => {
    if (!form.title || !form.flat_number) { toast("Fill title and flat number", "#f87171"); return; }
    setSaving(true);
    const { data, error } = await supabase.from("complaints").insert({
      society_id: SOCIETY_ID,
      ...form,
      status: "open",
      votes: 0,
      sla_hours: form.priority === "high" ? 72 : form.priority === "medium" ? 168 : 336,
      source: "app",
    }).select().single();
    if (error) { toast(error.message, "#f87171"); setSaving(false); return; }
    toast(`✓ Complaint #${data.ticket_number || data.id.slice(0,8).toUpperCase()} raised`);
    setShowRaise(false);
    setForm({ title: "", description: "", category: "Noise", priority: "medium", flat_number: "", anonymous: false });
    await load();
    setSaving(false);
  };

  // ── Update status ─────────────────────────────────────────────────────────
  const updateStatus = async (id, newStatus, notes = "") => {
    const old = complaints.find(c => c.id === id);
    await supabase.from("complaint_history").insert({ complaint_id: id, from_status: old?.status, to_status: newStatus, changed_by: "Committee", notes });
    await supabase.from("complaints").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", id);
    if (selected?.id === id) setSelected(p => ({ ...p, status: newStatus }));
    setComplaints(p => p.map(c => c.id === id ? { ...c, status: newStatus } : c));
    toast(`Status → ${newStatus}`);
  };

  // ── Resolve ───────────────────────────────────────────────────────────────
  const resolve = async () => {
    if (!resolveText || !selected) return;
    setSaving(true);
    await supabase.from("complaint_history").insert({ complaint_id: selected.id, from_status: selected.status, to_status: "resolved", changed_by: "Committee", notes: resolveText });
    await supabase.from("complaints").update({ status: "resolved", resolution: resolveText, resolved_at: new Date().toISOString() }).eq("id", selected.id);
    toast("✓ Complaint resolved");
    setShowResolve(false);
    setResolveText("");
    setSelected(null);
    await load();
    setSaving(false);
  };

  // ── Vote toggle ───────────────────────────────────────────────────────────
  const vote = async (id) => {
    const c = complaints.find(x => x.id === id);
    const alreadyVoted = myVotes[id];
    setMyVotes(p => ({ ...p, [id]: !alreadyVoted }));
    const newVotes = alreadyVoted ? Math.max(0, (c.votes || 0) - 1) : (c.votes || 0) + 1;
    await supabase.from("complaints").update({ votes: newVotes }).eq("id", id);
    setComplaints(p => p.map(c => c.id === id ? { ...c, votes: newVotes } : c));
  };

  // ── Add comment ───────────────────────────────────────────────────────────
  const addComment = async (isInternal = false) => {
    if (!commentText || !selected) return;
    const { data } = await supabase.from("complaint_comments").insert({
      complaint_id: selected.id,
      author_name: "Committee",
      author_role: "Secretary",
      comment: commentText,
      is_internal: isInternal,
    }).select().single();
    setComments(p => [...p, data]);
    setCommentText("");
    toast("Comment added");
  };

  // ── AI Mediate ────────────────────────────────────────────────────────────
  const aiMediate = async (c) => {
    setAiLoading(true);
    try {
      const endpoint = import.meta.env.VITE_AI_ENDPOINT || "https://api.anthropic.com/v1/messages";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          system: "You are an expert community mediator for Indian apartment societies (RWAs). Suggest fair, practical resolutions. Be concise and specific.",
          messages: [{ role: "user", content: `Complaint: "${c.title}"\nDetails: ${c.description}\nCategory: ${c.category}\nFlat: ${c.flat_number}\nNeighbor support votes: ${c.votes}\n\nProvide a fair resolution in 3-4 sentences for Indian apartment society context.` }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "Unable to generate suggestion.";
      setAiResult(p => ({ ...p, [c.id]: text }));
      await supabase.from("complaints").update({ status: "mediating", ai_mediation_text: text }).eq("id", c.id);
      setComplaints(p => p.map(x => x.id === c.id ? { ...x, status: "mediating", ai_mediation_text: text } : x));
      toast("✓ AI mediation suggestion generated");
    } catch (e) {
      setAiResult(p => ({ ...p, [c.id]: "AI unavailable. Try again." }));
    }
    setAiLoading(false);
  };

  // ── Escalate ──────────────────────────────────────────────────────────────
  const escalate = async (c) => {
    await supabase.from("complaints").update({ status: "escalated", escalated_at: new Date().toISOString(), escalated_to: "President" }).eq("id", c.id);
    await supabase.from("complaint_history").insert({ complaint_id: c.id, from_status: c.status, to_status: "escalated", changed_by: "System", notes: "Manually escalated to President" });
    setComplaints(p => p.map(x => x.id === c.id ? { ...x, status: "escalated" } : x));
    toast("Escalated to President");
  };

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = complaints.filter(c => {
    if (filter === "all") return true;
    if (filter === "open") return ["open", "assigned", "in-progress"].includes(c.status);
    if (filter === "escalated") return c.status === "escalated";
    if (filter === "mediating") return c.status === "mediating";
    if (filter === "resolved") return ["resolved", "closed"].includes(c.status);
    return true;
  });

  const stats = {
    open: complaints.filter(c => c.status === "open").length,
    escalated: complaints.filter(c => c.status === "escalated").length,
    mediating: complaints.filter(c => c.status === "mediating").length,
    resolved: complaints.filter(c => ["resolved", "closed"].includes(c.status)).length,
    slaBreached: complaints.filter(c => {
      if (["resolved","closed"].includes(c.status)) return false;
      const hrs = (Date.now() - new Date(c.created_at)) / 3600000;
      return hrs > (c.sla_hours || 168);
    }).length,
  };

  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", color: "#e2e8f0" }}>
      {msg && <div style={{ position: "fixed", top: 20, right: 20, background: "#161b27", border: `1px solid ${msg.color}44`, borderRadius: 10, padding: "12px 20px", color: msg.color, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>{msg.text}</div>}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ color: "#e2e8f0", fontSize: 24, fontFamily: "'Playfair Display',serif", margin: "0 0 4px" }}>Conflict Resolution</h2>
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Transparent complaint management with AI mediation</p>
        </div>
        <button style={btnPrimary} onClick={() => setShowRaise(true)}>+ Raise Complaint</button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 10, marginBottom: 16 }}>
        {[
          { l: "Open", v: stats.open, c: "#f87171", f: "open" },
          { l: "Escalated", v: stats.escalated, c: "#fb923c", f: "escalated" },
          { l: "AI Mediating", v: stats.mediating, c: "#818cf8", f: "mediating" },
          { l: "Resolved", v: stats.resolved, c: "#4ade80", f: "resolved" },
          { l: "SLA Breached", v: stats.slaBreached, c: "#f87171", f: "open" },
        ].map((s, i) => (
          <div key={i} onClick={() => setFilter(s.f)} style={{ background: "#161b27", border: `1px solid ${s.c}22`, borderLeft: `3px solid ${s.c}`, borderRadius: 10, padding: "12px 14px", cursor: "pointer" }}>
            <div style={{ color: s.c, fontSize: 22, fontWeight: 900 }}>{s.v}</div>
            <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* AI Banner */}
      <div style={{ background: "linear-gradient(135deg,#1b1b3a,#161b27)", border: "1px solid #818cf833", borderRadius: 12, padding: "12px 18px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
        <span style={{ fontSize: 18 }}>✨</span>
        <div>
          <div style={{ color: "#818cf8", fontSize: 13, fontWeight: 600 }}>AI Mediator Active</div>
          <div style={{ color: "#475569", fontSize: 12 }}>Click "AI Mediate" on any complaint for an instant unbiased resolution suggestion</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 5, marginBottom: 14, background: "#0d1117", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {["all","open","escalated","mediating","resolved"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? "#1e2535" : "none", border: filter === f ? "1px solid #2a2f45" : "none", borderRadius: 8, padding: "7px 14px", color: filter === f ? "#e2e8f0" : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>{f}</button>
        ))}
      </div>

      {/* Complaints list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading complaints…</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 40, textAlign: "center", color: "#475569" }}>
          No complaints found. {filter === "all" && "Click '+ Raise Complaint' to add one."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(c => {
            const slaHrs = (Date.now() - new Date(c.created_at)) / 3600000;
            const slaBreach = !["resolved","closed"].includes(c.status) && slaHrs > (c.sla_hours || 168);
            const slaRemain = Math.max(0, (c.sla_hours || 168) - slaHrs);
            return (
              <div key={c.id} style={{ background: "#161b27", border: `1px solid ${slaBreach ? "#f8717144" : "#2a2f45"}`, borderRadius: 14, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6, alignItems: "center" }}>
                      <Badge label={c.priority} color={PRIORITY_COLOR[c.priority] || "#64748b"} />
                      <Badge label={c.status} color={STATUS_COLOR[c.status] || "#64748b"} />
                      <span style={{ color: "#475569", fontSize: 12 }}>#{c.category}</span>
                      {!c.anonymous && <span style={{ color: "#475569", fontSize: 12 }}>Flat {c.flat_number}</span>}
                      <span style={{ color: "#475569", fontSize: 12 }}>{elapsed(c.created_at)}</span>
                      {c.ticket_number && <span style={{ color: "#38bdf8", fontSize: 11, fontWeight: 700 }}>{c.ticket_number}</span>}
                    </div>
                    <h3 style={{ color: "#e2e8f0", fontSize: 15, margin: "0 0 4px", fontWeight: 600 }}>{c.title}</h3>
                    {c.description && <p style={{ color: "#64748b", fontSize: 13, margin: 0, lineHeight: 1.5 }}>{c.description}</p>}
                  </div>

                  {/* Vote */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flexShrink: 0 }}>
                    <button onClick={() => vote(c.id)} style={{ background: myVotes[c.id] ? "#2d2510" : "#0d1117", border: `1px solid ${myVotes[c.id] ? "#fbbf24" : "#2a2f45"}`, borderRadius: 8, padding: "6px 12px", color: myVotes[c.id] ? "#fbbf24" : "#64748b", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 48, transition: "all 0.15s" }}>
                      <span style={{ fontSize: 12 }}>▲</span>
                      <span style={{ fontSize: 16, fontWeight: 800 }}>{c.votes || 0}</span>
                      <span style={{ fontSize: 9 }}>{myVotes[c.id] ? "supported" : "support"}</span>
                    </button>
                    {myVotes[c.id] && <button onClick={() => vote(c.id)} style={{ background: "none", border: "none", color: "#f87171", fontSize: 9, cursor: "pointer", padding: 0, textDecoration: "underline" }}>unsupport</button>}
                  </div>
                </div>

                {/* SLA */}
                {!["resolved","closed"].includes(c.status) && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: "#475569", fontSize: 11 }}>SLA</span>
                      <span style={{ color: slaBreach ? "#f87171" : "#4ade80", fontSize: 11, fontWeight: 700 }}>
                        {slaBreach ? `⚠ Breached by ${Math.floor(slaHrs - (c.sla_hours || 168))}h` : `${Math.floor(slaRemain)}h remaining`}
                      </span>
                    </div>
                    <div style={{ height: 4, background: "#0d1117", borderRadius: 2 }}>
                      <div style={{ height: "100%", width: `${Math.min(100, (slaHrs / (c.sla_hours || 168)) * 100)}%`, background: slaBreach ? "#f87171" : "#4ade80", borderRadius: 2, transition: "width 0.5s" }} />
                    </div>
                  </div>
                )}

                {/* Resolution */}
                {c.resolution && (
                  <div style={{ background: "#1b2d1b", border: "1px solid #4ade8033", borderRadius: 8, padding: "10px 14px", marginBottom: 10 }}>
                    <div style={{ color: "#4ade80", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>✓ RESOLUTION</div>
                    <div style={{ color: "#94a3b8", fontSize: 13 }}>{c.resolution}</div>
                  </div>
                )}

                {/* AI result */}
                {(aiResult[c.id] || c.ai_mediation_text) && (
                  <div style={{ background: "#1b1b3a", border: "1px solid #818cf833", borderRadius: 8, padding: "10px 14px", marginBottom: 10 }}>
                    <div style={{ color: "#818cf8", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>✨ AI MEDIATION SUGGESTION</div>
                    <div style={{ color: "#c4b5fd", fontSize: 13, lineHeight: 1.6 }}>{aiResult[c.id] || c.ai_mediation_text}</div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  <button onClick={() => openDetail(c)} style={{ background: "#0d1117", border: "1px solid #2a2f45", borderRadius: 8, padding: "6px 12px", color: "#94a3b8", cursor: "pointer", fontSize: 12 }}>
                    💬 Comments
                  </button>
                  {!["resolved","closed","mediating"].includes(c.status) && (
                    <button onClick={() => aiMediate(c)} disabled={aiLoading} style={{ background: "linear-gradient(135deg,#312e81,#4f46e5)", border: "none", borderRadius: 8, padding: "6px 12px", color: "#e2e8f0", cursor: aiLoading ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600, opacity: aiLoading ? 0.6 : 1 }}>
                      {aiLoading ? "Thinking…" : "✨ AI Mediate"}
                    </button>
                  )}
                  {!["resolved","closed"].includes(c.status) && (
                    <>
                      <button onClick={() => { setSelected(c); setShowResolve(true); }} style={{ background: "#1b2d1b", border: "1px solid #4ade8033", borderRadius: 8, padding: "6px 12px", color: "#4ade80", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                        ✓ Resolve
                      </button>
                      {c.status !== "escalated" && (
                        <button onClick={() => escalate(c)} style={{ background: "#2d1b10", border: "1px solid #fb923c33", borderRadius: 8, padding: "6px 12px", color: "#fb923c", cursor: "pointer", fontSize: 12 }}>
                          🔺 Escalate
                        </button>
                      )}
                    </>
                  )}
                  {c.status === "resolved" && (
                    <button onClick={() => updateStatus(c.id, "reopened", "Resident reopened")} style={{ background: "#2d1b1b", border: "1px solid #f8717133", borderRadius: 8, padding: "6px 12px", color: "#f87171", cursor: "pointer", fontSize: 12 }}>
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── RAISE COMPLAINT MODAL ── */}
      <Modal open={showRaise} onClose={() => setShowRaise(false)} title="Raise a Complaint">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={lbl}>Your Flat Number *</label><input style={inp} value={form.flat_number} onChange={e => setForm({ ...form, flat_number: e.target.value })} placeholder="e.g. 203" /></div>
          <div><label style={lbl}>Title *</label><input style={inp} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Brief description of the issue" /></div>
          <div><label style={lbl}>Category</label>
            <select style={inp} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Priority</label>
            <select style={inp} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
          </div>
          <div><label style={lbl}>Description</label><textarea style={{ ...inp, height: 90, resize: "vertical" }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the issue in detail…" /></div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="checkbox" id="anon" checked={form.anonymous} onChange={e => setForm({ ...form, anonymous: e.target.checked })} />
            <label htmlFor="anon" style={{ color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>Submit anonymously</label>
          </div>
          <button style={{ ...btnPrimary, justifyContent: "center", opacity: saving ? 0.6 : 1 }} onClick={raiseComplaint} disabled={saving}>
            {saving ? "Submitting…" : "Submit Complaint"}
          </button>
        </div>
      </Modal>

      {/* ── RESOLVE MODAL ── */}
      <Modal open={showResolve} onClose={() => setShowResolve(false)} title={`Resolve: ${selected?.title}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "#0d1117", borderRadius: 8, padding: 12, color: "#64748b", fontSize: 13 }}>
            Resolution must be filled — it's visible to the resident and logged permanently.
          </div>
          <div><label style={lbl}>Resolution Description *</label>
            <textarea style={{ ...inp, height: 100, resize: "vertical" }} value={resolveText} onChange={e => setResolveText(e.target.value)} placeholder="What action was taken? What was the outcome?" />
          </div>
          <button style={{ ...btnPrimary, justifyContent: "center", opacity: saving ? 0.6 : 1 }} onClick={resolve} disabled={saving}>
            {saving ? "Resolving…" : "✓ Mark as Resolved"}
          </button>
        </div>
      </Modal>

      {/* ── COMMENTS / DETAIL MODAL ── */}
      <Modal open={!!selected && !showResolve} onClose={() => setSelected(null)} title={selected ? `#${selected.ticket_number || selected.id?.slice(0,8).toUpperCase()} — ${selected.title}` : ""}>
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Status timeline */}
            {history.length > 0 && (
              <div style={{ background: "#0d1117", borderRadius: 10, padding: 14 }}>
                <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Status Timeline</div>
                {history.map((h, i) => (
                  <div key={h.id} style={{ display: "flex", gap: 10, marginBottom: 8, paddingBottom: 8, borderBottom: i < history.length - 1 ? "1px solid #1e2535" : "none" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_COLOR[h.to_status] || "#64748b", marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <div style={{ color: "#e2e8f0", fontSize: 13 }}>{h.from_status} → <strong>{h.to_status}</strong></div>
                      <div style={{ color: "#475569", fontSize: 11 }}>{h.changed_by} · {elapsed(h.created_at)}</div>
                      {h.notes && <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{h.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Comments */}
            <div>
              <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Comments ({comments.length})</div>
              {comments.length === 0 && <div style={{ color: "#475569", fontSize: 13, marginBottom: 10 }}>No comments yet</div>}
              {comments.map(c => (
                <div key={c.id} style={{ background: c.is_internal ? "#1b1b2d" : "#0d1117", border: `1px solid ${c.is_internal ? "#818cf833" : "#2a2f45"}`, borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: c.is_internal ? "#818cf8" : "#fbbf24", fontSize: 12, fontWeight: 700 }}>{c.author_name} · {c.author_role} {c.is_internal && "🔒 Internal"}</span>
                    <span style={{ color: "#475569", fontSize: 11 }}>{elapsed(c.created_at)}</span>
                  </div>
                  <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.5 }}>{c.comment}</div>
                </div>
              ))}
            </div>

            {/* Add comment */}
            <div>
              <textarea style={{ ...inp, height: 70, resize: "vertical", marginBottom: 8 }} value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Add a comment…" />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => addComment(false)} style={{ flex: 1, background: "#1b2d1b", border: "1px solid #4ade8033", borderRadius: 8, padding: "8px 0", color: "#4ade80", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Post Comment</button>
                <button onClick={() => addComment(true)} style={{ flex: 1, background: "#1b1b3a", border: "1px solid #818cf833", borderRadius: 8, padding: "8px 0", color: "#818cf8", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>🔒 Internal Note</button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

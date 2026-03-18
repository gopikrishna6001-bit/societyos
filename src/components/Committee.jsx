// src/components/Committee.jsx
import { useState, useEffect } from "react";
import { supabase, SOCIETY_ID } from "../lib/supabase";

const inp = { width: "100%", background: "#0d1117", border: "1px solid #2a2f45", borderRadius: 8, padding: "10px 12px", color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const lbl = { color: "#94a3b8", fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 5, display: "block" };
const btnPrimary = { background: "linear-gradient(135deg,#d97706,#f59e0b)", border: "none", borderRadius: 8, padding: "10px 18px", color: "#0d0f14", fontWeight: 700, cursor: "pointer", fontSize: 14 };

const ROLE_COLORS = {
  "President": "#f59e0b", "Secretary": "#818cf8", "Treasurer": "#4ade80",
  "Joint Secretary": "#38bdf8", "Joint Treasurer": "#34d399",
  "Committee Member": "#a78bfa", "Welfare Officer": "#f472b6",
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

export default function Committee() {
  const [members, setMembers] = useState([]);
  const [residents, setResidents] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [tab, setTab] = useState("members");
  const [aiReport, setAiReport] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [form, setForm] = useState({ resident_id: "", role: "Committee Member", term_start: "", term_end: "", responsibilities: "" });

  const toast = (text, color = "#4ade80") => { setMsg({ text, color }); setTimeout(() => setMsg(null), 3000); };

  const load = async () => {
    setLoading(true);
    const [mem, res, log] = await Promise.all([
      supabase.from("committee_members").select("*, residents(name, flat_number, phone, email)").eq("society_id", SOCIETY_ID).eq("active", true),
      supabase.from("residents").select("id, name, flat_number").eq("society_id", SOCIETY_ID).eq("status", "active"),
      supabase.from("audit_log").select("*").eq("society_id", SOCIETY_ID).order("created_at", { ascending: false }).limit(50),
    ]);
    setMembers(mem.data || []);
    setResidents(res.data || []);
    setAuditLog(log.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addMember = async () => {
    if (!form.resident_id || !form.role) { toast("Resident and role required", "#f87171"); return; }
    setSaving(true);
    await supabase.from("committee_members").insert({
      society_id: SOCIETY_ID,
      resident_id: form.resident_id,
      role: form.role,
      term_start: form.term_start || null,
      term_end: form.term_end || null,
      responsibilities: form.responsibilities ? form.responsibilities.split(",").map(r => r.trim()) : [],
      active: true,
      elected_by: "committee",
    });
    toast(`✓ ${form.role} added`);
    setShowAdd(false);
    setForm({ resident_id: "", role: "Committee Member", term_start: "", term_end: "", responsibilities: "" });
    await load();
    setSaving(false);
  };

  const removeMember = async (id, name) => {
    if (!confirm(`Remove ${name} from committee?`)) return;
    await supabase.from("committee_members").update({ active: false }).eq("id", id);
    setMembers(p => p.filter(m => m.id !== id));
    toast(`${name} removed from committee`);
  };

  const updateRole = async (id, newRole) => {
    await supabase.from("committee_members").update({ role: newRole }).eq("id", id);
    setMembers(p => p.map(m => m.id === id ? { ...m, role: newRole } : m));
    toast(`Role updated to ${newRole}`);
  };

  const generateReport = async () => {
    setAiLoading(true);
    try {
      const endpoint = import.meta.env.VITE_AI_ENDPOINT || "https://api.anthropic.com/v1/messages";
      const [complaints, invoices, maintenance] = await Promise.all([
        supabase.from("complaints").select("status, category").eq("society_id", SOCIETY_ID),
        supabase.from("invoices").select("status, total_amount, amount_paid").eq("society_id", SOCIETY_ID).ilike("month", `${new Date().toISOString().slice(0, 7)}%`),
        supabase.from("maintenance_tasks").select("status").eq("society_id", SOCIETY_ID),
      ]);
      const openComplaints = complaints.data?.filter(c => c.status === "open").length || 0;
      const paidInvoices = invoices.data?.filter(i => i.status === "paid").length || 0;
      const totalInvoices = invoices.data?.length || 0;
      const openTasks = maintenance.data?.filter(t => t.status !== "completed").length || 0;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 600,
          system: "You are a professional secretary for an Indian apartment society. Generate a concise monthly management report.",
          messages: [{
            role: "user",
            content: `Generate a monthly committee report for ${new Date().toLocaleString("en-IN", { month: "long", year: "numeric" })}:
- Open complaints: ${openComplaints}
- Fee collection: ${paidInvoices}/${totalInvoices} flats paid
- Pending maintenance tasks: ${openTasks}
- Committee members: ${members.length}

Write a professional 3-4 paragraph report suitable for AGM records. Include key achievements, pending items, and recommendations.`
          }]
        })
      });
      const data = await res.json();
      setAiReport(data.content?.[0]?.text || "Unable to generate report");
      toast("✓ Monthly report generated");
    } catch (e) {
      toast("AI unavailable", "#f87171");
    }
    setAiLoading(false);
  };

  const daysLeft = (date) => {
    if (!date) return null;
    const diff = Math.ceil((new Date(date) - new Date()) / 86400000);
    return diff;
  };

  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", color: "#e2e8f0" }}>
      {msg && <div style={{ position: "fixed", top: 20, right: 20, background: "#161b27", border: `1px solid ${msg.color}44`, borderRadius: 10, padding: "12px 20px", color: msg.color, fontSize: 13, fontWeight: 600, zIndex: 9999 }}>{msg.text}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ color: "#e2e8f0", fontSize: 24, fontFamily: "'Playfair Display',serif", margin: "0 0 4px" }}>Committee</h2>
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>{members.length} members · roles, terms, AI reports, audit log</p>
        </div>
        {tab === "members" && <button style={btnPrimary} onClick={() => setShowAdd(true)}>+ Add Member</button>}
        {tab === "reports" && <button style={{ ...btnPrimary, opacity: aiLoading ? 0.6 : 1 }} onClick={generateReport} disabled={aiLoading}>{aiLoading ? "Generating…" : "✨ Generate Monthly Report"}</button>}
      </div>

      <div style={{ display: "flex", gap: 5, marginBottom: 18, background: "#0d1117", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {["members", "reports", "audit log"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? "#1e2535" : "none", border: tab === t ? "1px solid #2a2f45" : "none", borderRadius: 8, padding: "7px 14px", color: tab === t ? "#e2e8f0" : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: 600, textTransform: "capitalize", whiteSpace: "nowrap" }}>{t}</button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading…</div> : (
        <>
          {/* MEMBERS */}
          {tab === "members" && (
            <div>
              {members.length === 0 && <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 40, textAlign: "center", color: "#475569" }}>No committee members. Add the President, Secretary and Treasurer first.</div>}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
                {members.map(m => {
                  const roleColor = ROLE_COLORS[m.role] || "#64748b";
                  const termDays = daysLeft(m.term_end);
                  const termExpiring = termDays !== null && termDays <= 30;
                  return (
                    <div key={m.id} style={{ background: "#161b27", border: `1px solid ${roleColor}33`, borderRadius: 14, padding: 18 }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: `${roleColor}22`, border: `2px solid ${roleColor}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: roleColor, flexShrink: 0 }}>
                          {m.residents?.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700 }}>{m.residents?.name}</div>
                          <div style={{ color: "#475569", fontSize: 12 }}>Flat {m.residents?.flat_number}</div>
                          <div style={{ color: "#475569", fontSize: 11 }}>{m.residents?.phone}</div>
                        </div>
                      </div>

                      <div style={{ marginBottom: 10 }}>
                        <select value={m.role} onChange={e => updateRole(m.id, e.target.value)}
                          style={{ ...inp, padding: "6px 10px", fontSize: 12, color: roleColor, border: `1px solid ${roleColor}44`, background: `${roleColor}11` }}>
                          {Object.keys(ROLE_COLORS).map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>

                      {(m.term_start || m.term_end) && (
                        <div style={{ background: "#0d1117", borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
                          <div style={{ color: "#475569", fontSize: 11 }}>
                            Term: {m.term_start || "?"} → {m.term_end || "ongoing"}
                            {termExpiring && <span style={{ color: "#f87171", marginLeft: 8, fontWeight: 700 }}>⚠ Expiring in {termDays}d</span>}
                          </div>
                        </div>
                      )}

                      {m.responsibilities?.length > 0 && (
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                          {m.responsibilities.map((r, i) => (
                            <span key={i} style={{ background: "#0d1117", borderRadius: 20, padding: "2px 8px", color: "#64748b", fontSize: 10 }}>{r}</span>
                          ))}
                        </div>
                      )}

                      <button onClick={() => removeMember(m.id, m.residents?.name)} style={{ background: "#2d1b1b", border: "1px solid #f8717133", borderRadius: 8, padding: "6px 12px", color: "#f87171", cursor: "pointer", fontSize: 12 }}>Remove</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* REPORTS */}
          {tab === "reports" && (
            <div>
              {!aiReport ? (
                <div style={{ background: "linear-gradient(135deg,#1b1b3a,#161b27)", border: "1px solid #818cf833", borderRadius: 14, padding: 30, textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>
                  <div style={{ color: "#818cf8", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>AI Monthly Report</div>
                  <div style={{ color: "#475569", fontSize: 13, marginBottom: 20 }}>Generate a professional monthly committee report based on real data from your society</div>
                  <button style={{ ...btnPrimary, opacity: aiLoading ? 0.6 : 1 }} onClick={generateReport} disabled={aiLoading}>{aiLoading ? "Generating…" : "Generate Report"}</button>
                </div>
              ) : (
                <div>
                  <div style={{ background: "#161b27", border: "1px solid #818cf833", borderRadius: 14, padding: 24, marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                      <div style={{ color: "#818cf8", fontSize: 13, fontWeight: 700 }}>✨ AI Monthly Report — {new Date().toLocaleString("en-IN", { month: "long", year: "numeric" })}</div>
                      <button onClick={generateReport} style={{ background: "#1b1b3a", border: "1px solid #818cf833", borderRadius: 8, padding: "5px 12px", color: "#818cf8", cursor: "pointer", fontSize: 12 }}>Regenerate</button>
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{aiReport}</div>
                  </div>
                  <button onClick={() => navigator.clipboard.writeText(aiReport)} style={{ background: "#1e2535", border: "1px solid #2a2f45", borderRadius: 8, padding: "8px 16px", color: "#64748b", cursor: "pointer", fontSize: 13 }}>Copy to Clipboard</button>
                </div>
              )}
            </div>
          )}

          {/* AUDIT LOG */}
          {tab === "audit log" && (
            <div>
              <div style={{ color: "#64748b", fontSize: 13, marginBottom: 14 }}>Every action in the system is logged here — immutable record for audits</div>
              {auditLog.length === 0 && <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 24, textAlign: "center", color: "#475569" }}>No audit entries yet</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {auditLog.map(log => (
                  <div key={log.id} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ color: "#e2e8f0", fontSize: 13 }}>
                        <span style={{ color: "#fbbf24", fontWeight: 600 }}>{log.action}</span> on <span style={{ color: "#38bdf8" }}>{log.module}</span>
                        {log.by_name && <span style={{ color: "#64748b" }}> by {log.by_name}</span>}
                      </div>
                      {log.by_flat && <div style={{ color: "#475569", fontSize: 11 }}>Flat {log.by_flat}</div>}
                    </div>
                    <div style={{ color: "#475569", fontSize: 11, flexShrink: 0 }}>{new Date(log.created_at).toLocaleString("en-IN")}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ADD MEMBER MODAL */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Committee Member">
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div><label style={lbl}>Resident *</label>
            <select style={inp} value={form.resident_id} onChange={e => setForm({ ...form, resident_id: e.target.value })}>
              <option value="">Select resident…</option>
              {residents.filter(r => !members.some(m => m.resident_id === r.id)).map(r => (
                <option key={r.id} value={r.id}>{r.flat_number} — {r.name}</option>
              ))}
            </select>
          </div>
          <div><label style={lbl}>Role *</label>
            <select style={inp} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              {Object.keys(ROLE_COLORS).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Term Start</label><input type="date" style={inp} value={form.term_start} onChange={e => setForm({ ...form, term_start: e.target.value })} /></div>
            <div><label style={lbl}>Term End</label><input type="date" style={inp} value={form.term_end} onChange={e => setForm({ ...form, term_end: e.target.value })} /></div>
          </div>
          <div><label style={lbl}>Responsibilities (comma separated)</label><input style={inp} value={form.responsibilities} onChange={e => setForm({ ...form, responsibilities: e.target.value })} placeholder="e.g. Fee collection, Vendor management" /></div>
          <button style={{ ...btnPrimary, justifyContent: "center", opacity: saving ? 0.6 : 1 }} onClick={addMember} disabled={saving}>{saving ? "Adding…" : "Add to Committee"}</button>
        </div>
      </Modal>
    </div>
  );
}

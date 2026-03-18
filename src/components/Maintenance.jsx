// src/components/Maintenance.jsx
import { useState, useEffect } from "react";
import { supabase, SOCIETY_ID } from "../lib/supabase";

const inp = { width: "100%", background: "#0d1117", border: "1px solid #2a2f45", borderRadius: 8, padding: "10px 12px", color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const lbl = { color: "#94a3b8", fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 5, display: "block" };
const btnPrimary = { background: "linear-gradient(135deg,#d97706,#f59e0b)", border: "none", borderRadius: 8, padding: "10px 18px", color: "#0d0f14", fontWeight: 700, cursor: "pointer", fontSize: 14 };

const PRIORITY_COLOR = { high: "#f87171", medium: "#fbbf24", low: "#4ade80", emergency: "#f87171" };
const STATUS_COLOR = { open: "#f87171", assigned: "#38bdf8", "in-progress": "#fbbf24", completed: "#4ade80", cancelled: "#64748b" };

const Modal = ({ open, onClose, title, wide, children }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 16, width: "100%", maxWidth: wide ? 680 : 520, maxHeight: "90vh", overflow: "auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: 17 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 24 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Badge = ({ label, color }) => (
  <span style={{ background: `${color}18`, color, border: `1px solid ${color}33`, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{label}</span>
);

const daysUntil = (date) => {
  if (!date) return null;
  const diff = Math.ceil((new Date(date) - new Date()) / 86400000);
  return diff;
};

export default function Maintenance() {
  const [tab, setTab] = useState("tasks");
  const [tasks, setTasks] = useState([]);
  const [assets, setAssets] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showAddAMC, setShowAddAMC] = useState(null);
  const [showTask, setShowTask] = useState(null);

  const [taskForm, setTaskForm] = useState({ title: "", description: "", category: "Electrical", type: "corrective", priority: "medium", flat_number: "", estimated_cost: "", scheduled_date: "" });
  const [assetForm, setAssetForm] = useState({ name: "", category: "lift", make: "", model: "", location: "", purchase_date: "", purchase_cost: "", warranty_expiry: "", life_years: 10 });
  const [vendorForm, setVendorForm] = useState({ name: "", category: "electrician", contact_name: "", phone: "", email: "", gstin: "" });
  const [amcForm, setAmcForm] = useState({ vendor_id: "", contract_number: "", start_date: "", end_date: "", annual_cost: "", service_visits: 2, contact_name: "", contact_phone: "" });

  const toast = (text, color = "#4ade80") => { setMsg({ text, color }); setTimeout(() => setMsg(null), 3000); };

  const load = async () => {
    setLoading(true);
    const [tsk, ast, vnd, sch] = await Promise.all([
      supabase.from("maintenance_tasks").select("*").eq("society_id", SOCIETY_ID).order("created_at", { ascending: false }),
      supabase.from("assets").select("*").eq("society_id", SOCIETY_ID).order("created_at", { ascending: false }),
      supabase.from("vendors").select("*").eq("society_id", SOCIETY_ID).order("name"),
      supabase.from("preventive_schedule").select("*").eq("society_id", SOCIETY_ID).order("next_due"),
    ]);
    setTasks(tsk.data || []);
    setAssets(ast.data || []);
    setVendors(vnd.data || []);
    setSchedule(sch.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addTask = async () => {
    if (!taskForm.title) { toast("Title required", "#f87171"); return; }
    setSaving(true);
    await supabase.from("maintenance_tasks").insert({ ...taskForm, society_id: SOCIETY_ID, status: "open", estimated_cost: taskForm.estimated_cost ? Number(taskForm.estimated_cost) : null });
    toast("✓ Task created");
    setShowAddTask(false);
    setTaskForm({ title: "", description: "", category: "Electrical", type: "corrective", priority: "medium", flat_number: "", estimated_cost: "", scheduled_date: "" });
    await load();
    setSaving(false);
  };

  const updateTaskStatus = async (id, status) => {
    await supabase.from("maintenance_tasks").update({ status, updated_at: new Date().toISOString(), ...(status === "completed" ? { completed_date: new Date().toISOString().slice(0, 10) } : {}) }).eq("id", id);
    setTasks(p => p.map(t => t.id === id ? { ...t, status } : t));
    toast(`Status → ${status}`);
  };

  const addAsset = async () => {
    if (!assetForm.name) { toast("Asset name required", "#f87171"); return; }
    setSaving(true);
    await supabase.from("assets").insert({ ...assetForm, society_id: SOCIETY_ID, status: "operational", purchase_cost: assetForm.purchase_cost ? Number(assetForm.purchase_cost) : null });
    toast("✓ Asset added");
    setShowAddAsset(false);
    setAssetForm({ name: "", category: "lift", make: "", model: "", location: "", purchase_date: "", purchase_cost: "", warranty_expiry: "", life_years: 10 });
    await load();
    setSaving(false);
  };

  const addVendor = async () => {
    if (!vendorForm.name || !vendorForm.phone) { toast("Name and phone required", "#f87171"); return; }
    setSaving(true);
    await supabase.from("vendors").insert({ ...vendorForm, society_id: SOCIETY_ID, rating: 5.0, total_jobs: 0, blacklisted: false });
    toast("✓ Vendor added");
    setShowAddVendor(false);
    setVendorForm({ name: "", category: "electrician", contact_name: "", phone: "", email: "", gstin: "" });
    await load();
    setSaving(false);
  };

  const addAMC = async () => {
    if (!showAddAMC || !amcForm.end_date) { toast("End date required", "#f87171"); return; }
    setSaving(true);
    await supabase.from("amc_contracts").insert({ ...amcForm, asset_id: showAddAMC.id, society_id: SOCIETY_ID, status: "active", annual_cost: amcForm.annual_cost ? Number(amcForm.annual_cost) : null, vendor_id: amcForm.vendor_id || null });
    toast("✓ AMC contract added");
    setShowAddAMC(null);
    setAmcForm({ vendor_id: "", contract_number: "", start_date: "", end_date: "", annual_cost: "", service_visits: 2, contact_name: "", contact_phone: "" });
    await load();
    setSaving(false);
  };

  const blacklistVendor = async (id, name) => {
    const reason = prompt(`Reason for blacklisting ${name}?`);
    if (!reason) return;
    await supabase.from("vendors").update({ blacklisted: true, blacklist_reason: reason }).eq("id", id);
    setVendors(p => p.map(v => v.id === id ? { ...v, blacklisted: true } : v));
    toast(`${name} blacklisted`);
  };

  const stats = {
    open: tasks.filter(t => t.status === "open").length,
    inProgress: tasks.filter(t => t.status === "in-progress").length,
    completed: tasks.filter(t => t.status === "completed").length,
    expiringAMC: assets.flatMap(a => a.amc_contracts || []).filter(amc => { const d = daysUntil(amc.end_date); return d !== null && d <= 60 && d >= 0; }).length,
  };

  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", color: "#e2e8f0" }}>
      {msg && <div style={{ position: "fixed", top: 20, right: 20, background: "#161b27", border: `1px solid ${msg.color}44`, borderRadius: 10, padding: "12px 20px", color: msg.color, fontSize: 13, fontWeight: 600, zIndex: 9999 }}>{msg.text}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ color: "#e2e8f0", fontSize: 24, fontFamily: "'Playfair Display',serif", margin: "0 0 4px" }}>Maintenance</h2>
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Tasks, assets, vendors, AMC tracking</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {tab === "tasks" && <button style={btnPrimary} onClick={() => setShowAddTask(true)}>+ New Task</button>}
          {tab === "assets" && <button style={btnPrimary} onClick={() => setShowAddAsset(true)}>+ Add Asset</button>}
          {tab === "vendors" && <button style={btnPrimary} onClick={() => setShowAddVendor(true)}>+ Add Vendor</button>}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 10, marginBottom: 16 }}>
        {[
          { l: "Open", v: stats.open, c: "#f87171" },
          { l: "In Progress", v: stats.inProgress, c: "#fbbf24" },
          { l: "Completed", v: stats.completed, c: "#4ade80" },
          { l: "AMC Expiring", v: stats.expiringAMC, c: "#fb923c" },
        ].map((s, i) => (
          <div key={i} style={{ background: "#161b27", border: `1px solid ${s.c}22`, borderLeft: `3px solid ${s.c}`, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ color: s.c, fontSize: 22, fontWeight: 900 }}>{s.v}</div>
            <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 5, marginBottom: 18, background: "#0d1117", borderRadius: 10, padding: 4, width: "fit-content", overflowX: "auto" }}>
        {["tasks", "assets", "vendors", "schedule"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? "#1e2535" : "none", border: tab === t ? "1px solid #2a2f45" : "none", borderRadius: 8, padding: "7px 14px", color: tab === t ? "#e2e8f0" : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: 600, textTransform: "capitalize", whiteSpace: "nowrap" }}>{t}</button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading…</div> : (
        <>
          {/* TASKS */}
          {tab === "tasks" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tasks.length === 0 && <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 40, textAlign: "center", color: "#475569" }}>No tasks. Click "+ New Task" to add one.</div>}
              {tasks.map(t => (
                <div key={t.id} style={{ background: "#161b27", border: `1px solid ${PRIORITY_COLOR[t.priority] || "#2a2f45"}22`, borderLeft: `3px solid ${PRIORITY_COLOR[t.priority] || "#64748b"}`, borderRadius: 12, padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                        <Badge label={t.priority} color={PRIORITY_COLOR[t.priority] || "#64748b"} />
                        <Badge label={t.status} color={STATUS_COLOR[t.status] || "#64748b"} />
                        <span style={{ color: "#475569", fontSize: 11 }}>{t.category}</span>
                        {t.type === "preventive" && <span style={{ color: "#4ade80", fontSize: 11 }}>🔄 Preventive</span>}
                        {t.type === "emergency" && <span style={{ color: "#f87171", fontSize: 11 }}>🚨 Emergency</span>}
                      </div>
                      <div style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{t.title}</div>
                      {t.description && <div style={{ color: "#64748b", fontSize: 13 }}>{t.description}</div>}
                      <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>
                        {t.flat_number && `Flat ${t.flat_number} · `}
                        {t.assets?.name && `Asset: ${t.assets.name} · `}
                        {t.vendors?.name && `Vendor: ${t.vendors.name} · `}
                        {t.estimated_cost && `Est: ₹${Number(t.estimated_cost).toLocaleString("en-IN")} · `}
                        {t.scheduled_date && `Scheduled: ${t.scheduled_date}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {t.status === "open" && <button onClick={() => updateTaskStatus(t.id, "in-progress")} style={{ background: "#2d2510", border: "1px solid #fbbf2433", borderRadius: 8, padding: "6px 12px", color: "#fbbf24", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>▶ Start</button>}
                    {t.status === "in-progress" && <button onClick={() => updateTaskStatus(t.id, "completed")} style={{ background: "#1b2d1b", border: "1px solid #4ade8033", borderRadius: 8, padding: "6px 12px", color: "#4ade80", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>✓ Complete</button>}
                    {t.status === "open" && <button onClick={() => updateTaskStatus(t.id, "cancelled")} style={{ background: "#1e2535", border: "1px solid #2a2f45", borderRadius: 8, padding: "6px 12px", color: "#64748b", cursor: "pointer", fontSize: 12 }}>Cancel</button>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ASSETS */}
          {tab === "assets" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {assets.length === 0 && <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 40, textAlign: "center", color: "#475569" }}>No assets. Add lifts, generators, pumps etc.</div>}
              {assets.map(a => {
                const warrantyDays = a.warranty_expiry ? daysUntil(a.warranty_expiry) : null;
                return (
                  <div key={a.id} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 14, padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                      <div>
                        <div style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{a.name}</div>
                        <div style={{ color: "#64748b", fontSize: 12 }}>{a.category} · {a.location} {a.make && `· ${a.make} ${a.model}`}</div>
                      </div>
                      <Badge label={a.status || "operational"} color={a.status === "operational" ? "#4ade80" : "#f87171"} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8, marginBottom: 12 }}>
                      {a.purchase_date && <div style={{ background: "#0d1117", borderRadius: 8, padding: "8px 10px" }}><div style={{ color: "#475569", fontSize: 10 }}>Purchased</div><div style={{ color: "#e2e8f0", fontSize: 12 }}>{a.purchase_date}</div></div>}
                      {a.purchase_cost && <div style={{ background: "#0d1117", borderRadius: 8, padding: "8px 10px" }}><div style={{ color: "#475569", fontSize: 10 }}>Cost</div><div style={{ color: "#fbbf24", fontSize: 12 }}>₹{Number(a.purchase_cost).toLocaleString("en-IN")}</div></div>}
                      {warrantyDays !== null && <div style={{ background: warrantyDays <= 30 ? "#2d1b1b" : "#0d1117", borderRadius: 8, padding: "8px 10px" }}><div style={{ color: "#475569", fontSize: 10 }}>Warranty</div><div style={{ color: warrantyDays <= 30 ? "#f87171" : "#4ade80", fontSize: 12 }}>{warrantyDays > 0 ? `${warrantyDays}d left` : "Expired"}</div></div>}
                      {a.life_years && <div style={{ background: "#0d1117", borderRadius: 8, padding: "8px 10px" }}><div style={{ color: "#475569", fontSize: 10 }}>Life</div><div style={{ color: "#94a3b8", fontSize: 12 }}>{a.life_years} years</div></div>}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setShowAddAMC(a)} style={{ background: "#1b2d1b", border: "1px solid #4ade8033", borderRadius: 8, padding: "6px 14px", color: "#4ade80", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>+ Add AMC</button>
                      <button onClick={async () => { if (confirm(`Delete asset "${a.name}"?`)) { await supabase.from("assets").delete().eq("id", a.id); setAssets(p => p.filter(x => x.id !== a.id)); toast("Asset deleted"); } }} style={{ background: "#2d1b1b", border: "1px solid #f8717133", borderRadius: 8, padding: "6px 14px", color: "#f87171", cursor: "pointer", fontSize: 12 }}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VENDORS */}
          {tab === "vendors" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {vendors.length === 0 && <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 40, textAlign: "center", color: "#475569" }}>No vendors. Add plumbers, electricians, security agencies etc.</div>}
              {vendors.map(v => (
                <div key={v.id} style={{ background: "#161b27", border: `1px solid ${v.blacklisted ? "#f8717133" : "#2a2f45"}`, borderRadius: 12, padding: 16, opacity: v.blacklisted ? 0.7 : 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <span style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700 }}>{v.name}</span>
                        {v.blacklisted && <span style={{ background: "#2d1b1b", color: "#f87171", borderRadius: 20, padding: "1px 9px", fontSize: 10, fontWeight: 700 }}>BLACKLISTED</span>}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 12 }}>{v.category} · {v.contact_name} · {v.phone}</div>
                      {v.blacklist_reason && <div style={{ color: "#f87171", fontSize: 11, marginTop: 3 }}>Reason: {v.blacklist_reason}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ color: "#fbbf24", fontSize: 16, fontWeight: 800 }}>{"★".repeat(Math.round(v.rating || 5))}</div>
                        <div style={{ color: "#475569", fontSize: 10 }}>{v.rating || 5}/5 · {v.total_jobs || 0} jobs</div>
                      </div>
                      {!v.blacklisted && (
                        <button onClick={() => blacklistVendor(v.id, v.name)} style={{ background: "#2d1b1b", border: "1px solid #f8717133", borderRadius: 8, padding: "5px 10px", color: "#f87171", cursor: "pointer", fontSize: 11 }}>Blacklist</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PREVENTIVE SCHEDULE */}
          {tab === "schedule" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {schedule.length === 0 && <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 40, textAlign: "center", color: "#475569" }}>No preventive schedule. Add assets first, then set up recurring maintenance.</div>}
              {schedule.map(s => {
                const days = daysUntil(s.next_due);
                const isOverdue = days !== null && days < 0;
                const isDueSoon = days !== null && days <= 7;
                return (
                  <div key={s.id} style={{ background: "#161b27", border: `1px solid ${isOverdue ? "#f8717133" : isDueSoon ? "#fbbf2433" : "#2a2f45"}`, borderRadius: 12, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{s.task_name}</div>
                        <div style={{ color: "#64748b", fontSize: 12 }}>{s.assets?.name} · {s.frequency}</div>
                        <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>Last done: {s.last_done || "Never"} · Next: {s.next_due}</div>
                      </div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ color: isOverdue ? "#f87171" : isDueSoon ? "#fbbf24" : "#4ade80", fontSize: 18, fontWeight: 900 }}>
                            {isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? "Today!" : `${days}d`}
                          </div>
                        </div>
                        <button onClick={async () => { await supabase.from("preventive_schedule").update({ last_done: new Date().toISOString().slice(0, 10) }).eq("id", s.id); await load(); toast("✓ Marked as done"); }}
                          style={{ background: "#1b2d1b", border: "1px solid #4ade8033", borderRadius: 8, padding: "6px 12px", color: "#4ade80", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>✓ Done</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ADD TASK MODAL */}
      <Modal open={showAddTask} onClose={() => setShowAddTask(false)} title="Create Maintenance Task">
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div><label style={lbl}>Title *</label><input style={inp} value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="e.g. Fix lift door sensor" /></div>
          <div><label style={lbl}>Description</label><textarea style={{ ...inp, height: 70, resize: "vertical" }} value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Category</label>
              <select style={inp} value={taskForm.category} onChange={e => setTaskForm({ ...taskForm, category: e.target.value })}>
                {["Electrical", "Plumbing", "Civil", "Lift", "Generator", "CCTV", "Landscaping", "Cleaning", "Other"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Type</label>
              <select style={inp} value={taskForm.type} onChange={e => setTaskForm({ ...taskForm, type: e.target.value })}>
                <option value="corrective">Corrective</option><option value="preventive">Preventive</option><option value="emergency">Emergency</option>
              </select>
            </div>
            <div><label style={lbl}>Priority</label>
              <select style={inp} value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select>
            </div>
            <div><label style={lbl}>Flat (if applicable)</label><input style={inp} value={taskForm.flat_number} onChange={e => setTaskForm({ ...taskForm, flat_number: e.target.value })} placeholder="203" /></div>
            <div><label style={lbl}>Estimated Cost ₹</label><input type="number" style={inp} value={taskForm.estimated_cost} onChange={e => setTaskForm({ ...taskForm, estimated_cost: e.target.value })} /></div>
            <div><label style={lbl}>Scheduled Date</label><input type="date" style={inp} value={taskForm.scheduled_date} onChange={e => setTaskForm({ ...taskForm, scheduled_date: e.target.value })} /></div>
          </div>
          <button style={{ ...btnPrimary, justifyContent: "center", opacity: saving ? 0.6 : 1 }} onClick={addTask} disabled={saving}>{saving ? "Creating…" : "Create Task"}</button>
        </div>
      </Modal>

      {/* ADD ASSET MODAL */}
      <Modal open={showAddAsset} onClose={() => setShowAddAsset(false)} title="Add Asset" wide>
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Asset Name *</label><input style={inp} value={assetForm.name} onChange={e => setAssetForm({ ...assetForm, name: e.target.value })} placeholder="e.g. Main Elevator - Tower A" /></div>
            <div><label style={lbl}>Category</label>
              <select style={inp} value={assetForm.category} onChange={e => setAssetForm({ ...assetForm, category: e.target.value })}>
                {["lift", "generator", "pump", "cctv", "tank", "gym", "fire", "electrical", "other"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Location</label><input style={inp} value={assetForm.location} onChange={e => setAssetForm({ ...assetForm, location: e.target.value })} placeholder="e.g. Block A lobby" /></div>
            <div><label style={lbl}>Make</label><input style={inp} value={assetForm.make} onChange={e => setAssetForm({ ...assetForm, make: e.target.value })} placeholder="e.g. Otis" /></div>
            <div><label style={lbl}>Model</label><input style={inp} value={assetForm.model} onChange={e => setAssetForm({ ...assetForm, model: e.target.value })} placeholder="e.g. GeN2" /></div>
            <div><label style={lbl}>Purchase Date</label><input type="date" style={inp} value={assetForm.purchase_date} onChange={e => setAssetForm({ ...assetForm, purchase_date: e.target.value })} /></div>
            <div><label style={lbl}>Purchase Cost ₹</label><input type="number" style={inp} value={assetForm.purchase_cost} onChange={e => setAssetForm({ ...assetForm, purchase_cost: e.target.value })} /></div>
            <div><label style={lbl}>Warranty Expiry</label><input type="date" style={inp} value={assetForm.warranty_expiry} onChange={e => setAssetForm({ ...assetForm, warranty_expiry: e.target.value })} /></div>
            <div><label style={lbl}>Life (years)</label><input type="number" style={inp} value={assetForm.life_years} onChange={e => setAssetForm({ ...assetForm, life_years: Number(e.target.value) })} /></div>
          </div>
          <button style={{ ...btnPrimary, justifyContent: "center", opacity: saving ? 0.6 : 1 }} onClick={addAsset} disabled={saving}>{saving ? "Adding…" : "Add Asset"}</button>
        </div>
      </Modal>

      {/* ADD VENDOR MODAL */}
      <Modal open={showAddVendor} onClose={() => setShowAddVendor(false)} title="Add Vendor">
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Company/Person Name *</label><input style={inp} value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })} placeholder="e.g. Ravi Electricals" /></div>
            <div><label style={lbl}>Category</label>
              <select style={inp} value={vendorForm.category} onChange={e => setVendorForm({ ...vendorForm, category: e.target.value })}>
                {["electrician", "plumber", "lift", "pest", "security", "cleaning", "landscaping", "civil", "hvac", "other"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Contact Name</label><input style={inp} value={vendorForm.contact_name} onChange={e => setVendorForm({ ...vendorForm, contact_name: e.target.value })} /></div>
            <div><label style={lbl}>Phone *</label><input style={inp} value={vendorForm.phone} onChange={e => setVendorForm({ ...vendorForm, phone: e.target.value })} /></div>
            <div><label style={lbl}>Email</label><input style={inp} value={vendorForm.email} onChange={e => setVendorForm({ ...vendorForm, email: e.target.value })} /></div>
            <div><label style={lbl}>GSTIN</label><input style={inp} value={vendorForm.gstin} onChange={e => setVendorForm({ ...vendorForm, gstin: e.target.value })} /></div>
          </div>
          <button style={{ ...btnPrimary, justifyContent: "center", opacity: saving ? 0.6 : 1 }} onClick={addVendor} disabled={saving}>{saving ? "Adding…" : "Add Vendor"}</button>
        </div>
      </Modal>

      {/* ADD AMC MODAL */}
      <Modal open={!!showAddAMC} onClose={() => setShowAddAMC(null)} title={`AMC Contract — ${showAddAMC?.name}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div><label style={lbl}>Vendor</label>
            <select style={inp} value={amcForm.vendor_id} onChange={e => setAmcForm({ ...amcForm, vendor_id: e.target.value })}>
              <option value="">Select vendor…</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Contract Number</label><input style={inp} value={amcForm.contract_number} onChange={e => setAmcForm({ ...amcForm, contract_number: e.target.value })} /></div>
            <div><label style={lbl}>Annual Cost ₹</label><input type="number" style={inp} value={amcForm.annual_cost} onChange={e => setAmcForm({ ...amcForm, annual_cost: e.target.value })} /></div>
            <div><label style={lbl}>Start Date</label><input type="date" style={inp} value={amcForm.start_date} onChange={e => setAmcForm({ ...amcForm, start_date: e.target.value })} /></div>
            <div><label style={lbl}>End Date *</label><input type="date" style={inp} value={amcForm.end_date} onChange={e => setAmcForm({ ...amcForm, end_date: e.target.value })} /></div>
            <div><label style={lbl}>Service Visits/yr</label><input type="number" style={inp} value={amcForm.service_visits} onChange={e => setAmcForm({ ...amcForm, service_visits: Number(e.target.value) })} /></div>
            <div><label style={lbl}>Contact Phone</label><input style={inp} value={amcForm.contact_phone} onChange={e => setAmcForm({ ...amcForm, contact_phone: e.target.value })} /></div>
          </div>
          <button style={{ ...btnPrimary, justifyContent: "center", opacity: saving ? 0.6 : 1 }} onClick={addAMC} disabled={saving}>{saving ? "Saving…" : "Save AMC Contract"}</button>
        </div>
      </Modal>
    </div>
  );
}

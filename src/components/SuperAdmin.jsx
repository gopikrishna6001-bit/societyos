// src/components/SuperAdmin.jsx
import { useState, useEffect } from "react";
import { supabase, SOCIETY_ID } from "../lib/supabase";

const inp = { width: "100%", background: "#0d1117", border: "1px solid #2a2f45", borderRadius: 8, padding: "10px 12px", color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const lbl = { color: "#94a3b8", fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 5, display: "block" };
const btnPrimary = { background: "linear-gradient(135deg,#d97706,#f59e0b)", border: "none", borderRadius: 8, padding: "10px 18px", color: "#0d0f14", fontWeight: 700, cursor: "pointer", fontSize: 14 };

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: 17 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 24 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default function SuperAdmin() {
  const [tab, setTab] = useState("overview");
  const [society, setSociety] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [flats, setFlats] = useState([]);
  const [roles, setRoles] = useState([]);
  const [models, setModels] = useState([]);
  const [residents, setResidents] = useState([]);
  const [features, setFeatures] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [editSociety, setEditSociety] = useState({});
  const [editRole, setEditRole] = useState(null);

  const DEFAULT_FEATURES = {
    finances: true, complaints: true, maintenance: true, residents: true,
    gate: true, notices: true, polls: true, meetings: true,
    amenities: true, volunteers: true, committee: true, whatsapp: true, ai: true,
  };

  const [showAddBlock, setShowAddBlock] = useState(false);
  const [showAddFlat, setShowAddFlat] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);
  const [blockForm, setBlockForm] = useState({ name: "", floors: 3, flats_per_floor: 2 });
  const [flatForm, setFlatForm] = useState({ number: "", block_id: "", floor: 1, sqft: 1200, type: "2BHK", parking_slots: 1, status: "occupied" });
  const [roleForm, setRoleForm] = useState({ name: "", color: "#64748b", description: "", permissions: "" });

  const toast = (text, color = "#4ade80") => { setMsg({ text, color }); setTimeout(() => setMsg(null), 3000); };

  const load = async () => {
    setLoading(true);
    const [s, b, f, r, m, res] = await Promise.all([
      supabase.from("societies").select("*").eq("id", SOCIETY_ID).single(),
      supabase.from("blocks").select("*").eq("society_id", SOCIETY_ID),
      supabase.from("flats").select("*").eq("society_id", SOCIETY_ID).order("number"),
      supabase.from("roles").select("*").eq("society_id", SOCIETY_ID),
      supabase.from("maintenance_models").select("*").eq("society_id", SOCIETY_ID),
      supabase.from("residents").select("id,name,flat_number").eq("society_id", SOCIETY_ID).eq("status", "active"),
    ]);
    setSociety(s.data);
    setEditSociety(s.data || {});
    setBlocks(b.data || []);
    setFlats(f.data || []);
    setRoles(r.data || []);
    setModels(m.data || []);
    setResidents(res.data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // Load feature toggles from localStorage
    const saved = localStorage.getItem(`features_${SOCIETY_ID}`);
    setFeatures(saved ? JSON.parse(saved) : DEFAULT_FEATURES);
  }, []);

  const saveFeatures = (newFeatures) => {
    setFeatures(newFeatures);
    localStorage.setItem(`features_${SOCIETY_ID}`, JSON.stringify(newFeatures));
  };

  const deleteBlock = async (id, name) => {
    const hasFlats = flats.some(f => f.block_id === id);
    if (hasFlats) { toast(`Remove all flats in Block ${name} first`, "#f87171"); return; }
    if (!confirm(`Delete Block ${name}? This cannot be undone.`)) return;
    await supabase.from("blocks").delete().eq("id", id);
    setBlocks(p => p.filter(b => b.id !== id));
    toast(`Block ${name} deleted`);
  };

  const deleteFlat = async (id, number) => {
    if (!confirm(`Delete Flat ${number}? This will also remove associated data.`)) return;
    await supabase.from("flats").delete().eq("id", id);
    setFlats(p => p.filter(f => f.id !== id));
    toast(`Flat ${number} deleted`);
  };

  const updateFlat = async (id, field, value) => {
    await supabase.from("flats").update({ [field]: value }).eq("id", id);
    setFlats(p => p.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const saveEditRole = async () => {
    if (!editRole) return;
    setSaving(true);
    const perms = typeof editRole.permissions === "string"
      ? editRole.permissions.split(",").map(p => p.trim()).filter(Boolean)
      : editRole.permissions;
    await supabase.from("roles").update({
      name: editRole.name,
      color: editRole.color,
      description: editRole.description,
      permissions: perms,
    }).eq("id", editRole.id);
    setRoles(p => p.map(r => r.id === editRole.id ? { ...r, ...editRole, permissions: perms } : r));
    toast("✓ Role updated");
    setEditRole(null);
    setSaving(false);
  };
    setSaving(true);
    const { error } = await supabase.from("societies").update(editSociety).eq("id", SOCIETY_ID);
    if (error) { toast(error.message, "#f87171"); setSaving(false); return; }
    setSociety(editSociety);
    toast("✓ Society settings saved");
    setSaving(false);
  };

  const addBlock = async () => {
    if (!blockForm.name) { toast("Block name required", "#f87171"); return; }
    setSaving(true);
    await supabase.from("blocks").insert({ ...blockForm, society_id: SOCIETY_ID });
    toast(`✓ Block ${blockForm.name} added`);
    setShowAddBlock(false);
    setBlockForm({ name: "", floors: 3, flats_per_floor: 2 });
    await load();
    setSaving(false);
  };

  const addFlat = async () => {
    if (!flatForm.number) { toast("Flat number required", "#f87171"); return; }
    setSaving(true);
    await supabase.from("flats").insert({ ...flatForm, society_id: SOCIETY_ID, floor: Number(flatForm.floor), sqft: Number(flatForm.sqft), parking_slots: Number(flatForm.parking_slots) });
    toast(`✓ Flat ${flatForm.number} added`);
    setShowAddFlat(false);
    setFlatForm({ number: "", block_id: "", floor: 1, sqft: 1200, type: "2BHK", parking_slots: 1, status: "occupied" });
    await load();
    setSaving(false);
  };

  const addRole = async () => {
    if (!roleForm.name) { toast("Role name required", "#f87171"); return; }
    setSaving(true);
    await supabase.from("roles").insert({
      name: roleForm.name,
      color: roleForm.color,
      description: roleForm.description,
      permissions: roleForm.permissions.split(",").map(p => p.trim()).filter(Boolean),
      society_id: SOCIETY_ID,
      is_system: false,
    });
    toast(`✓ Role "${roleForm.name}" created`);
    setShowAddRole(false);
    setRoleForm({ name: "", color: "#64748b", description: "", permissions: "" });
    await load();
    setSaving(false);
  };

  const deleteRole = async (id, name, isSystem) => {
    if (isSystem) { toast("Cannot delete system roles", "#f87171"); return; }
    if (!confirm(`Delete role "${name}"?`)) return;
    await supabase.from("roles").delete().eq("id", id);
    setRoles(p => p.filter(r => r.id !== id));
    toast(`Role "${name}" deleted`);
  };

  const setActiveModel = async (id) => {
    await supabase.from("maintenance_models").update({ active: false }).eq("society_id", SOCIETY_ID);
    await supabase.from("maintenance_models").update({ active: true }).eq("id", id);
    setModels(p => p.map(m => ({ ...m, active: m.id === id })));
    toast("✓ Maintenance model updated — takes effect next billing cycle");
  };

  const updateModelAmount = async (id, amount) => {
    await supabase.from("maintenance_models").update({ amount: Number(amount) }).eq("id", id);
    setModels(p => p.map(m => m.id === id ? { ...m, amount: Number(amount) } : m));
  };

  const stats = {
    blocks: blocks.length,
    flats: flats.length,
    occupied: flats.filter(f => f.status === "occupied").length,
    vacant: flats.filter(f => f.status === "vacant").length,
    residents: residents.length,
    roles: roles.length,
  };

  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", color: "#e2e8f0" }}>
      {msg && <div style={{ position: "fixed", top: 20, right: 20, background: "#161b27", border: `1px solid ${msg.color}44`, borderRadius: 10, padding: "12px 20px", color: msg.color, fontSize: 13, fontWeight: 600, zIndex: 9999 }}>{msg.text}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ color: "#e2e8f0", fontSize: 24, fontFamily: "'Playfair Display',serif", margin: "0 0 4px" }}>Super Admin</h2>
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Society setup · blocks · flats · roles · maintenance models</p>
        </div>
        <div style={{ background: "#2d1b1b", border: "1px solid #f8717133", borderRadius: 20, padding: "4px 14px", display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f87171" }} />
          <span style={{ color: "#f87171", fontSize: 12, fontWeight: 700 }}>Super Admin Mode</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 5, marginBottom: 18, background: "#0d1117", borderRadius: 10, padding: 4, overflowX: "auto" }}>
        {["overview", "society", "blocks & flats", "roles", "maintenance model", "features", "settings"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? "#1e2535" : "none", border: tab === t ? "1px solid #2a2f45" : "none", borderRadius: 8, padding: "7px 14px", color: tab === t ? "#e2e8f0" : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: 600, textTransform: "capitalize", whiteSpace: "nowrap" }}>{t}</button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading…</div> : (
        <>
          {/* OVERVIEW */}
          {tab === "overview" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
              {[
                { l: "Blocks", v: stats.blocks, c: "#38bdf8", icon: "🏗️", t: "blocks & flats" },
                { l: "Total Flats", v: stats.flats, c: "#818cf8", icon: "🏠", t: "blocks & flats" },
                { l: "Occupied", v: stats.occupied, c: "#4ade80", icon: "✅", t: "blocks & flats" },
                { l: "Vacant", v: stats.vacant, c: "#f87171", icon: "⬜", t: "blocks & flats" },
                { l: "Residents", v: stats.residents, c: "#fbbf24", icon: "👥", t: "society" },
                { l: "Custom Roles", v: roles.filter(r => !r.is_system).length, c: "#f472b6", icon: "🎭", t: "roles" },
              ].map((s, i) => (
                <div key={i} onClick={() => setTab(s.t)} style={{ background: "#161b27", border: `1px solid ${s.c}22`, borderLeft: `3px solid ${s.c}`, borderRadius: 12, padding: 16, cursor: "pointer" }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
                  <div style={{ color: s.c, fontSize: 24, fontWeight: 900 }}>{s.v}</div>
                  <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>{s.l}</div>
                </div>
              ))}
            </div>
          )}

          {/* SOCIETY */}
          {tab === "society" && society && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 14, padding: 20 }}>
                <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 14 }}>Society Information</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { l: "Society Name", k: "name" },
                    { l: "Display Name", k: "display_name" },
                    { l: "City", k: "city" },
                    { l: "State", k: "state" },
                    { l: "Registration No.", k: "reg_number" },
                    { l: "PAN", k: "pan" },
                    { l: "GSTIN", k: "gstin" },
                    { l: "WhatsApp Number", k: "wa_number" },
                  ].map(f => (
                    <div key={f.k}>
                      <label style={lbl}>{f.l}</label>
                      <input style={inp} value={editSociety[f.k] || ""} onChange={e => setEditSociety(p => ({ ...p, [f.k]: e.target.value }))} />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 14, padding: 20 }}>
                <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 14 }}>Billing Configuration</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>Monthly Fee ₹</label><input type="number" style={inp} value={editSociety.monthly_fee || ""} onChange={e => setEditSociety(p => ({ ...p, monthly_fee: Number(e.target.value) }))} /></div>
                  <div><label style={lbl}>Due Date (day)</label><input type="number" style={inp} min={1} max={28} value={editSociety.due_date_day || 1} onChange={e => setEditSociety(p => ({ ...p, due_date_day: Number(e.target.value) }))} /></div>
                  <div><label style={lbl}>Late Fee ₹</label><input type="number" style={inp} value={editSociety.late_fee_amount || ""} onChange={e => setEditSociety(p => ({ ...p, late_fee_amount: Number(e.target.value) }))} /></div>
                  <div><label style={lbl}>Late Fee After (days)</label><input type="number" style={inp} value={editSociety.late_fee_after_days || 7} onChange={e => setEditSociety(p => ({ ...p, late_fee_after_days: Number(e.target.value) }))} /></div>
                  <div><label style={lbl}>FY Start Month</label>
                    <select style={inp} value={editSociety.fy_start_month || 4} onChange={e => setEditSociety(p => ({ ...p, fy_start_month: Number(e.target.value) }))}>
                      <option value={4}>April (Apr-Mar)</option><option value={1}>January (Jan-Dec)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 14, padding: 20 }}>
                <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 14 }}>Bank Details</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { l: "Bank Name", k: "bank_name" },
                    { l: "Account Number", k: "bank_account" },
                    { l: "IFSC Code", k: "bank_ifsc" },
                    { l: "Branch", k: "bank_branch" },
                  ].map(f => (
                    <div key={f.k}>
                      <label style={lbl}>{f.l}</label>
                      <input style={inp} value={editSociety[f.k] || ""} onChange={e => setEditSociety(p => ({ ...p, [f.k]: e.target.value }))} />
                    </div>
                  ))}
                </div>
              </div>
              <button style={{ ...btnPrimary, alignSelf: "flex-start", opacity: saving ? 0.6 : 1 }} onClick={saveSociety} disabled={saving}>{saving ? "Saving…" : "Save All Settings"}</button>
            </div>
          )}

          {/* BLOCKS & FLATS */}
          {tab === "blocks & flats" && (
            <div>
              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <button style={btnPrimary} onClick={() => setShowAddBlock(true)}>+ Add Block</button>
                <button style={{ background: "#1e2535", border: "1px solid #2a2f45", borderRadius: 8, padding: "10px 18px", color: "#94a3b8", cursor: "pointer", fontSize: 14, fontWeight: 600 }} onClick={() => setShowAddFlat(true)}>+ Add Flat</button>
              </div>
              {blocks.map(b => (
                <div key={b.id} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 14, padding: 18, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 700 }}>Block {b.name}</div>
                      <div style={{ color: "#64748b", fontSize: 12 }}>{b.floors} floors · {b.flats_per_floor} flats/floor · {flats.filter(f => f.block_id === b.id).length} flats added</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ color: "#4ade80", fontSize: 13, fontWeight: 600 }}>{flats.filter(f => f.block_id === b.id && f.status === "occupied").length} occupied</div>
                      <button onClick={() => deleteBlock(b.id, b.name)} style={{ background: "#2d1b1b", border: "1px solid #f8717133", borderRadius: 8, padding: "5px 10px", color: "#f87171", cursor: "pointer", fontSize: 12 }}>Delete Block</button>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {flats.filter(f => f.block_id === b.id).map(f => (
                      <div key={f.id} style={{ background: f.status === "occupied" ? "#1b2d1b" : f.status === "vacant" ? "#2d1b1b" : "#2d2510", border: `1px solid ${f.status === "occupied" ? "#4ade8033" : f.status === "vacant" ? "#f8717133" : "#fbbf2433"}`, borderRadius: 8, padding: "8px 12px", textAlign: "center", minWidth: 80 }}>
                        <div style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 700 }}>{f.number}</div>
                        <div style={{ color: "#475569", fontSize: 10 }}>{f.type} · {f.sqft}sqft</div>
                        <select value={f.status} onChange={e => updateFlat(f.id, "status", e.target.value)}
                          style={{ background: "none", border: "none", color: f.status === "occupied" ? "#4ade80" : f.status === "vacant" ? "#f87171" : "#fbbf24", fontSize: 9, fontWeight: 700, cursor: "pointer", padding: 0, marginTop: 3, textTransform: "uppercase" }}>
                          <option value="occupied">Occupied</option>
                          <option value="vacant">Vacant</option>
                          <option value="under-renovation">Renovation</option>
                        </select>
                        <button onClick={() => deleteFlat(f.id, f.number)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 10, display: "block", margin: "4px auto 0", padding: 0 }}>× remove</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ROLES */}
          {tab === "roles" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ color: "#64748b", fontSize: 13 }}>{roles.length} roles · {roles.filter(r => r.is_system).length} system · {roles.filter(r => !r.is_system).length} custom</div>
                <button style={btnPrimary} onClick={() => setShowAddRole(true)}>+ Create Role</button>
              </div>
              {roles.map(r => (
                <div key={r.id} style={{ background: "#161b27", border: `1px solid ${r.color}22`, borderLeft: `3px solid ${r.color}`, borderRadius: 12, padding: 18, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <span style={{ color: r.color, fontSize: 15, fontWeight: 700 }}>{r.name}</span>
                        {r.is_system && <span style={{ background: "#1e2535", color: "#64748b", borderRadius: 20, padding: "1px 8px", fontSize: 9, fontWeight: 700 }}>SYSTEM</span>}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 12 }}>{r.description}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setEditRole({ ...r, permissions: Array.isArray(r.permissions) ? r.permissions.join(", ") : r.permissions })}
                        style={{ background: "#1e2535", border: "1px solid #2a2f45", borderRadius: 8, padding: "5px 12px", color: "#94a3b8", cursor: "pointer", fontSize: 12 }}>✏ Edit</button>
                      {!r.is_system && (
                        <button onClick={() => deleteRole(r.id, r.name, r.is_system)} style={{ background: "#2d1b1b", border: "1px solid #f8717133", borderRadius: 8, padding: "5px 12px", color: "#f87171", cursor: "pointer", fontSize: 12 }}>Delete</button>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {(r.permissions?.[0] === "all" ? ["all permissions"] : r.permissions || []).map((p, i) => (
                      <span key={i} style={{ background: "#0d1117", border: "1px solid #2a2f45", borderRadius: 20, padding: "2px 9px", color: "#64748b", fontSize: 10 }}>{p.replace(/_/g, " ")}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MAINTENANCE MODEL */}
          {tab === "maintenance model" && (
            <div>
              <div style={{ background: "#1b2d1b", border: "1px solid #4ade8033", borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <div style={{ color: "#4ade80", fontSize: 13, fontWeight: 600 }}>Active: <strong>{models.find(m => m.active)?.name || "None"}</strong></div>
                <div style={{ color: "#16a34a", fontSize: 12, marginTop: 3 }}>Changing model recalculates dues from next billing cycle</div>
              </div>
              {models.map(m => (
                <div key={m.id} onClick={() => setActiveModel(m.id)}
                  style={{ background: m.active ? "#1b2d1b" : "#161b27", border: `2px solid ${m.active ? "#4ade80" : "#2a2f45"}`, borderRadius: 14, padding: 20, marginBottom: 12, cursor: "pointer", transition: "all 0.2s" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${m.active ? "#4ade80" : "#2a2f45"}`, background: m.active ? "#4ade80" : "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                      {m.active && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#0d1117" }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                        <div>
                          <div style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 700 }}>{m.name}</div>
                          <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>
                            {m.type === "flat_rate" && "Fixed amount per flat regardless of size"}
                            {m.type === "per_sqft" && "Calculated based on carpet area"}
                            {m.type === "bhk_tiered" && "Different rates for 1BHK, 2BHK, 3BHK"}
                          </div>
                        </div>
                        {m.active && <span style={{ background: "#1b2d1b", color: "#4ade80", borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700 }}>Active</span>}
                      </div>
                    </div>
                  </div>

                  {m.type === "flat_rate" && (
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }} onClick={e => e.stopPropagation()}>
                      <span style={{ color: "#64748b", fontSize: 13 }}>₹</span>
                      <input type="number" style={{ ...inp, width: 150 }} value={m.amount || ""} onChange={e => updateModelAmount(m.id, e.target.value)} onClick={e => e.stopPropagation()} />
                      <span style={{ color: "#64748b", fontSize: 13 }}>per flat / month</span>
                    </div>
                  )}
                  {m.type === "per_sqft" && (
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }} onClick={e => e.stopPropagation()}>
                      <span style={{ color: "#64748b", fontSize: 13 }}>₹</span>
                      <input type="number" step="0.5" style={{ ...inp, width: 120 }} value={m.amount || ""} onChange={e => updateModelAmount(m.id, e.target.value)} onClick={e => e.stopPropagation()} />
                      <span style={{ color: "#64748b", fontSize: 13 }}>per sqft / month</span>
                    </div>
                  )}
                  {m.type === "bhk_tiered" && m.bhk_rates && (
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {Object.entries(m.bhk_rates).map(([type, amt]) => (
                        <div key={type} style={{ background: "#0d1117", borderRadius: 8, padding: "8px 14px", textAlign: "center" }}>
                          <div style={{ color: "#fbbf24", fontSize: 16, fontWeight: 800 }}>₹{amt}</div>
                          <div style={{ color: "#475569", fontSize: 11 }}>{type}/month</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* FEATURES */}
          {tab === "features" && (
            <div>
              <div style={{ background: "#1b1b3a", border: "1px solid #818cf833", borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <div style={{ color: "#818cf8", fontSize: 13, fontWeight: 600 }}>💡 Feature Toggles</div>
                <div style={{ color: "#475569", fontSize: 12, marginTop: 3 }}>Turn off modules your society doesn't need. Disabled modules are hidden from navigation.</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { key: "finances", label: "Finances & Billing", desc: "Invoices, payments, expenses, ledger", icon: "💰" },
                  { key: "complaints", label: "Complaints & Conflicts", desc: "Raise and track complaints, AI mediation", icon: "⚖️" },
                  { key: "maintenance", label: "Maintenance", desc: "Tasks, assets, vendors, AMC tracking", icon: "🔧" },
                  { key: "residents", label: "Residents Management", desc: "Profiles, roles, vehicles, family", icon: "👥" },
                  { key: "gate", label: "Gate & Staff", desc: "Visitor log, deliveries, staff attendance", icon: "🚦" },
                  { key: "notices", label: "Notice Board", desc: "Post and manage society notices", icon: "📢" },
                  { key: "polls", label: "Polls & Voting", desc: "Community polls and decision making", icon: "🗳️" },
                  { key: "meetings", label: "Meetings", desc: "Schedule, RSVP, minutes", icon: "📅" },
                  { key: "amenities", label: "Amenities & Booking", desc: "Pool, gym, clubhouse booking", icon: "🏊" },
                  { key: "volunteers", label: "Volunteers & Campaigns", desc: "Hero points, tasks, community events", icon: "🤝" },
                  { key: "committee", label: "Committee", desc: "Members, roles, AI reports, audit log", icon: "🏛️" },
                  { key: "whatsapp", label: "WhatsApp Centre", desc: "Broadcast, templates, delivery tracking", icon: "📱" },
                  { key: "ai", label: "AI Assistant", desc: "AI chat for RWA advice and drafting", icon: "✨" },
                ].map(f => {
                  const enabled = features[f.key] !== false;
                  return (
                    <div key={f.key} style={{ background: "#161b27", border: `1px solid ${enabled ? "#2a2f45" : "#2d1b1b"}`, borderRadius: 12, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: enabled ? 1 : 0.7 }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <span style={{ fontSize: 20 }}>{f.icon}</span>
                        <div>
                          <div style={{ color: enabled ? "#e2e8f0" : "#64748b", fontSize: 14, fontWeight: 600 }}>{f.label}</div>
                          <div style={{ color: "#475569", fontSize: 12 }}>{f.desc}</div>
                        </div>
                      </div>
                      <button onClick={() => saveFeatures({ ...features, [f.key]: !enabled })}
                        style={{ background: enabled ? "#1b2d1b" : "#2d1b1b", border: `1px solid ${enabled ? "#4ade8033" : "#f8717133"}`, borderRadius: 20, padding: "6px 16px", color: enabled ? "#4ade80" : "#f87171", cursor: "pointer", fontSize: 12, fontWeight: 700, minWidth: 72 }}>
                        {enabled ? "ON" : "OFF"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "#2d1b1b", border: "1px solid #f8717133", borderRadius: 12, padding: 16 }}>
                <div style={{ color: "#f87171", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>⚠ Danger Zone</div>
                <div style={{ color: "#64748b", fontSize: 13, marginBottom: 12 }}>These actions are irreversible. Proceed with caution.</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button onClick={async () => { if (confirm("Delete ALL invoices for this society? This cannot be undone.")) { await supabase.from("invoices").delete().eq("society_id", SOCIETY_ID); toast("All invoices deleted"); } }} style={{ background: "#2d1b1b", border: "1px solid #f8717133", borderRadius: 8, padding: "8px 16px", color: "#f87171", cursor: "pointer", fontSize: 13 }}>Delete All Invoices</button>
                  <button onClick={async () => { if (confirm("Delete ALL complaints? This cannot be undone.")) { await supabase.from("complaints").delete().eq("society_id", SOCIETY_ID); toast("All complaints deleted"); } }} style={{ background: "#2d1b1b", border: "1px solid #f8717133", borderRadius: 8, padding: "8px 16px", color: "#f87171", cursor: "pointer", fontSize: 13 }}>Delete All Complaints</button>
                </div>
              </div>
              <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 16 }}>
                <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Society ID</div>
                <div style={{ background: "#0d1117", borderRadius: 8, padding: "10px 14px", color: "#64748b", fontSize: 12, fontFamily: "monospace" }}>{SOCIETY_ID}</div>
              </div>
              <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 16 }}>
                <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Supabase Project</div>
                <div style={{ background: "#0d1117", borderRadius: 8, padding: "10px 14px", color: "#64748b", fontSize: 12, fontFamily: "monospace" }}>wzchqxwwezklxsxmjvyt.supabase.co</div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ADD BLOCK MODAL */}
      <Modal open={showAddBlock} onClose={() => setShowAddBlock(false)} title="Add Block">
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div><label style={lbl}>Block Name *</label><input style={inp} value={blockForm.name} onChange={e => setBlockForm({ ...blockForm, name: e.target.value })} placeholder="A, B, Tower 1…" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Floors</label><input type="number" style={inp} value={blockForm.floors} onChange={e => setBlockForm({ ...blockForm, floors: Number(e.target.value) })} /></div>
            <div><label style={lbl}>Flats per Floor</label><input type="number" style={inp} value={blockForm.flats_per_floor} onChange={e => setBlockForm({ ...blockForm, flats_per_floor: Number(e.target.value) })} /></div>
          </div>
          <div style={{ background: "#0d1117", borderRadius: 8, padding: 12, color: "#64748b", fontSize: 13 }}>Total flats: {blockForm.floors * blockForm.flats_per_floor}</div>
          <button style={{ ...btnPrimary, justifyContent: "center", opacity: saving ? 0.6 : 1 }} onClick={addBlock} disabled={saving}>{saving ? "Adding…" : "Add Block"}</button>
        </div>
      </Modal>

      {/* ADD FLAT MODAL */}
      <Modal open={showAddFlat} onClose={() => setShowAddFlat(false)} title="Add Flat">
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Flat Number *</label><input style={inp} value={flatForm.number} onChange={e => setFlatForm({ ...flatForm, number: e.target.value })} placeholder="101" /></div>
            <div><label style={lbl}>Block</label>
              <select style={inp} value={flatForm.block_id} onChange={e => setFlatForm({ ...flatForm, block_id: e.target.value })}>
                <option value="">Select…</option>
                {blocks.map(b => <option key={b.id} value={b.id}>Block {b.name}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Floor</label><input type="number" style={inp} value={flatForm.floor} onChange={e => setFlatForm({ ...flatForm, floor: e.target.value })} /></div>
            <div><label style={lbl}>Sq Ft</label><input type="number" style={inp} value={flatForm.sqft} onChange={e => setFlatForm({ ...flatForm, sqft: e.target.value })} /></div>
            <div><label style={lbl}>Type</label>
              <select style={inp} value={flatForm.type} onChange={e => setFlatForm({ ...flatForm, type: e.target.value })}>
                {["1BHK", "2BHK", "3BHK", "4BHK", "studio", "villa"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Status</label>
              <select style={inp} value={flatForm.status} onChange={e => setFlatForm({ ...flatForm, status: e.target.value })}>
                <option value="occupied">Occupied</option><option value="vacant">Vacant</option><option value="under-renovation">Under Renovation</option>
              </select>
            </div>
            <div><label style={lbl}>Parking Slots</label><input type="number" style={inp} value={flatForm.parking_slots} onChange={e => setFlatForm({ ...flatForm, parking_slots: e.target.value })} /></div>
          </div>
          <button style={{ ...btnPrimary, justifyContent: "center", opacity: saving ? 0.6 : 1 }} onClick={addFlat} disabled={saving}>{saving ? "Adding…" : "Add Flat"}</button>
        </div>
      </Modal>

      {/* EDIT ROLE MODAL */}
      <Modal open={!!editRole} onClose={() => setEditRole(null)} title={`Edit Role — ${editRole?.name}`}>
        {editRole && (
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <div><label style={lbl}>Role Name</label>
              <input style={inp} value={editRole.name} onChange={e => setEditRole(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div><label style={lbl}>Description</label>
              <input style={inp} value={editRole.description || ""} onChange={e => setEditRole(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div><label style={lbl}>Color</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["#f87171","#fb923c","#fbbf24","#4ade80","#38bdf8","#818cf8","#f472b6","#a78bfa","#64748b"].map(c => (
                  <div key={c} onClick={() => setEditRole(p => ({ ...p, color: c }))} style={{ width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer", border: editRole.color === c ? "3px solid #fff" : "3px solid transparent" }} />
                ))}
              </div>
            </div>
            <div>
              <label style={lbl}>Permissions (comma separated)</label>
              <textarea style={{ ...inp, height: 80, resize: "vertical" }} value={typeof editRole.permissions === "string" ? editRole.permissions : (editRole.permissions || []).join(", ")} onChange={e => setEditRole(p => ({ ...p, permissions: e.target.value }))} />
              <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>
                Available: all, view_all, view_finances, approve_expenses, mark_paid, send_reminders, manage_complaints, post_notices, assign_maintenance, raise_complaint, vote_polls, book_amenity, view_notices, view_residents, manage_committee, final_approvals, override
              </div>
            </div>
            <button style={{ ...btnPrimary, justifyContent: "center", opacity: saving ? 0.6 : 1 }} onClick={saveEditRole} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</button>
          </div>
        )}
      </Modal>
      <Modal open={showAddRole} onClose={() => setShowAddRole(false)} title="Create Custom Role">
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div><label style={lbl}>Role Name *</label><input style={inp} value={roleForm.name} onChange={e => setRoleForm({ ...roleForm, name: e.target.value })} placeholder="e.g. Block Captain" /></div>
          <div><label style={lbl}>Description</label><input style={inp} value={roleForm.description} onChange={e => setRoleForm({ ...roleForm, description: e.target.value })} placeholder="What does this role do?" /></div>
          <div><label style={lbl}>Color</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["#f87171","#fb923c","#fbbf24","#4ade80","#38bdf8","#818cf8","#f472b6","#a78bfa","#64748b"].map(c => (
                <div key={c} onClick={() => setRoleForm({ ...roleForm, color: c })} style={{ width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer", border: roleForm.color === c ? "3px solid #fff" : "3px solid transparent" }} />
              ))}
            </div>
          </div>
          <div><label style={lbl}>Permissions (comma separated)</label>
            <input style={inp} value={roleForm.permissions} onChange={e => setRoleForm({ ...roleForm, permissions: e.target.value })} placeholder="view_notices, raise_complaint, book_amenity" />
            <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>Available: view_all, view_finances, approve_expenses, mark_paid, manage_complaints, post_notices, assign_maintenance, raise_complaint, vote_polls, book_amenity, view_notices, view_residents</div>
          </div>
          <button style={{ ...btnPrimary, justifyContent: "center", opacity: saving ? 0.6 : 1 }} onClick={addRole} disabled={saving}>{saving ? "Creating…" : "Create Role"}</button>
        </div>
      </Modal>
    </div>
  );
}

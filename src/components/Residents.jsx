// src/components/Residents.jsx
import { useState, useEffect } from "react";
import { supabase, SOCIETY_ID } from "../lib/supabase";

const inp = { width: "100%", background: "#0d1117", border: "1px solid #2a2f45", borderRadius: 8, padding: "10px 12px", color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const lbl = { color: "#94a3b8", fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 5, display: "block" };
const btnPrimary = { background: "linear-gradient(135deg,#d97706,#f59e0b)", border: "none", borderRadius: 8, padding: "10px 18px", color: "#0d0f14", fontWeight: 700, cursor: "pointer", fontSize: 14 };
const btnSec = (color = "#38bdf8") => ({ background: `${color}18`, border: `1px solid ${color}33`, borderRadius: 8, padding: "6px 12px", color, cursor: "pointer", fontSize: 12, fontWeight: 600 });

const Modal = ({ open, onClose, title, wide, children }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 16, width: "100%", maxWidth: wide ? 720 : 520, maxHeight: "90vh", overflow: "auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: 17 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 24 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const calcHarmony = (r, invoices, complaints) => {
  const unpaid = invoices.filter(i => i.flat_number === r.flat_number && i.status !== "paid").length;
  const against = complaints.filter(c => c.flat_number === r.flat_number && c.status !== "resolved").length;
  const score = Math.max(0, Math.min(100, 100 - unpaid * 10 - against * 15));
  return score;
};

const harmonyColor = (s) => s >= 80 ? "#4ade80" : s >= 60 ? "#fbbf24" : "#f87171";

export default function Residents() {
  const [residents, setResidents] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [roles, setRoles] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileData, setProfileData] = useState({});
  const [showRoles, setShowRoles] = useState(null); // resident for role assignment
  const [showVehicle, setShowVehicle] = useState(null);
  const [showFamily, setShowFamily] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);

  // Forms
  const [form, setForm] = useState({ name: "", flat_number: "", phone: "", email: "", type: "owner", move_in_date: new Date().toISOString().slice(0, 10) });
  const [vehicleForm, setVehicleForm] = useState({ type: "car", number: "", make: "", model: "", color: "", parking_slot: "" });
  const [familyForm, setFamilyForm] = useState({ name: "", relation: "spouse", age: "" });

  const toast = (text, color = "#4ade80") => { setMsg({ text, color }); setTimeout(() => setMsg(null), 3000); };

  const load = async () => {
    setLoading(true);
    const [res, inv, comp, rl, ur, veh] = await Promise.all([
      supabase.from("residents").select("*").eq("society_id", SOCIETY_ID).eq("status", "active").order("flat_number"),
      supabase.from("invoices").select("flat_number,status,balance_due,month").eq("society_id", SOCIETY_ID),
      supabase.from("complaints").select("flat_number,status").eq("society_id", SOCIETY_ID),
      supabase.from("roles").select("*").eq("society_id", SOCIETY_ID),
      supabase.from("user_roles").select("*, roles(name,color)").eq("society_id", SOCIETY_ID).eq("active", true),
      supabase.from("vehicles").select("*").eq("society_id", SOCIETY_ID),
    ]);
    setResidents(res.data || []);
    setInvoices(inv.data || []);
    setComplaints(comp.data || []);
    setRoles(rl.data || []);
    setUserRoles(ur.data || []);
    setVehicles(veh.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // ── Add resident ──────────────────────────────────────────────────────────
  const addResident = async () => {
    if (!form.name || !form.flat_number) { toast("Name and flat number required", "#f87171"); return; }
    setSaving(true);
    const { error } = await supabase.from("residents").insert({ ...form, society_id: SOCIETY_ID, status: "active" });
    if (error) { toast(error.message, "#f87171"); setSaving(false); return; }
    toast(`✓ ${form.name} added to Flat ${form.flat_number}`);
    setShowAdd(false);
    setForm({ name: "", flat_number: "", phone: "", email: "", type: "owner", move_in_date: new Date().toISOString().slice(0, 10) });
    await load();
    setSaving(false);
  };

  // ── Open profile ──────────────────────────────────────────────────────────
  const openProfile = async (r) => {
    setProfile(r);
    setProfileData(r);
    const { data: fm } = await supabase.from("family_members").select("*").eq("resident_id", r.id);
    setFamilyMembers(fm || []);
  };

  // ── Update profile ────────────────────────────────────────────────────────
  const saveProfile = async () => {
    setSaving(true);
    await supabase.from("residents").update(profileData).eq("id", profile.id);
    setResidents(p => p.map(r => r.id === profile.id ? { ...r, ...profileData } : r));
    toast("✓ Profile updated");
    setSaving(false);
  };

  // ── Deactivate ────────────────────────────────────────────────────────────
  const deactivate = async (id, name) => {
    if (!confirm(`Move out ${name}? This will mark them as inactive.`)) return;
    await supabase.from("residents").update({ status: "inactive", move_out_date: new Date().toISOString().slice(0, 10) }).eq("id", id);
    setResidents(p => p.filter(r => r.id !== id));
    setProfile(null);
    toast(`${name} moved out`);
  };

  // ── Assign role ───────────────────────────────────────────────────────────
  const assignRole = async (residentId, roleId) => {
    const existing = userRoles.find(ur => ur.resident_id === residentId && ur.role_id === roleId);
    if (existing) {
      await supabase.from("user_roles").update({ active: false }).eq("id", existing.id);
      setUserRoles(p => p.filter(ur => ur.id !== existing.id));
      toast("Role removed");
    } else {
      const { data } = await supabase.from("user_roles").insert({ resident_id: residentId, role_id: roleId, society_id: SOCIETY_ID, assigned_by: "Admin", active: true }).select("*, roles(name,color)").single();
      setUserRoles(p => [...p, data]);
      toast("✓ Role assigned");
    }
  };

  // ── Add vehicle ───────────────────────────────────────────────────────────
  const addVehicle = async () => {
    if (!vehicleForm.number) { toast("Vehicle number required", "#f87171"); return; }
    setSaving(true);
    const { data } = await supabase.from("vehicles").insert({ ...vehicleForm, resident_id: showVehicle.id, society_id: SOCIETY_ID }).select().single();
    setVehicles(p => [...p, data]);
    setVehicleForm({ type: "car", number: "", make: "", model: "", color: "", parking_slot: "" });
    toast("✓ Vehicle added");
    setSaving(false);
  };

  const removeVehicle = async (id) => {
    await supabase.from("vehicles").delete().eq("id", id);
    setVehicles(p => p.filter(v => v.id !== id));
    toast("Vehicle removed");
  };

  // ── Add family member ─────────────────────────────────────────────────────
  const addFamilyMember = async () => {
    if (!familyForm.name) return;
    const { data } = await supabase.from("family_members").insert({ ...familyForm, resident_id: showFamily.id }).select().single();
    setFamilyMembers(p => [...p, data]);
    setFamilyForm({ name: "", relation: "spouse", age: "" });
    toast("✓ Family member added");
  };

  const removeFamilyMember = async (id) => {
    await supabase.from("family_members").delete().eq("id", id);
    setFamilyMembers(p => p.filter(f => f.id !== id));
  };

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = residents.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.flat_number.includes(search);
    const matchType = filterType === "all" || r.type === filterType;
    return matchSearch && matchType;
  });

  const getResidentRoles = (id) => userRoles.filter(ur => ur.resident_id === id && ur.active);
  const getResidentVehicles = (id) => vehicles.filter(v => v.resident_id === id);

  const stats = {
    total: residents.length,
    owners: residents.filter(r => r.type === "owner").length,
    tenants: residents.filter(r => r.type === "tenant").length,
    lowHarmony: residents.filter(r => calcHarmony(r, invoices, complaints) < 60).length,
  };

  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", color: "#e2e8f0" }}>
      {msg && <div style={{ position: "fixed", top: 20, right: 20, background: "#161b27", border: `1px solid ${msg.color}44`, borderRadius: 10, padding: "12px 20px", color: msg.color, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>{msg.text}</div>}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ color: "#e2e8f0", fontSize: 24, fontFamily: "'Playfair Display',serif", margin: "0 0 4px" }}>Residents</h2>
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Profiles, roles, vehicles, family members</p>
        </div>
        <button style={btnPrimary} onClick={() => setShowAdd(true)}>+ Add Resident</button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 10, marginBottom: 16 }}>
        {[
          { l: "Total", v: stats.total, c: "#e2e8f0" },
          { l: "Owners", v: stats.owners, c: "#4ade80" },
          { l: "Tenants", v: stats.tenants, c: "#fbbf24" },
          { l: "Low Harmony", v: stats.lowHarmony, c: "#f87171" },
        ].map((s, i) => (
          <div key={i} style={{ background: "#161b27", border: `1px solid ${s.c}22`, borderLeft: `3px solid ${s.c}`, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ color: s.c, fontSize: 22, fontWeight: 900 }}>{s.v}</div>
            <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input style={{ ...inp, flex: 1, minWidth: 200 }} placeholder="Search by name or flat…" value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ display: "flex", gap: 5, background: "#0d1117", borderRadius: 10, padding: 4 }}>
          {["all", "owner", "tenant"].map(t => (
            <button key={t} onClick={() => setFilterType(t)} style={{ background: filterType === t ? "#1e2535" : "none", border: filterType === t ? "1px solid #2a2f45" : "none", borderRadius: 8, padding: "7px 14px", color: filterType === t ? "#e2e8f0" : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Residents grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading residents…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
          {filtered.map(r => {
            const harmony = calcHarmony(r, invoices, complaints);
            const hColor = harmonyColor(harmony);
            const resRoles = getResidentRoles(r.id);
            const resVehicles = getResidentVehicles(r.id);
            const unpaidCount = invoices.filter(i => i.flat_number === r.flat_number && i.status !== "paid").length;

            return (
              <div key={r.id} onClick={() => openProfile(r)} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 14, padding: 18, cursor: "pointer", transition: "border-color 0.2s" }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  {/* Avatar */}
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: `${hColor}22`, border: `2px solid ${hColor}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: hColor, flexShrink: 0 }}>
                    {r.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{r.name}</div>
                    <div style={{ color: "#fbbf24", fontSize: 12, fontWeight: 600 }}>Flat {r.flat_number}</div>
                    <div style={{ color: "#475569", fontSize: 11 }}>{r.phone}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ color: hColor, fontSize: 18, fontWeight: 900 }}>{harmony}</div>
                    <div style={{ color: "#475569", fontSize: 9, fontWeight: 600 }}>HARMONY</div>
                  </div>
                </div>

                {/* Roles */}
                {resRoles.length > 0 && (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                    {resRoles.map(ur => (
                      <span key={ur.id} style={{ background: `${ur.roles?.color || "#64748b"}22`, color: ur.roles?.color || "#64748b", border: `1px solid ${ur.roles?.color || "#64748b"}33`, borderRadius: 20, padding: "2px 9px", fontSize: 10, fontWeight: 700 }}>
                        {ur.roles?.name}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ background: r.type === "owner" ? "#1b2d1b" : "#2d2510", color: r.type === "owner" ? "#4ade80" : "#fbbf24", borderRadius: 20, padding: "2px 9px", fontSize: 10, fontWeight: 700 }}>{r.type}</span>
                    {resVehicles.length > 0 && <span style={{ color: "#475569", fontSize: 11 }}>🚗 {resVehicles.length}</span>}
                  </div>
                  {unpaidCount > 0 && <span style={{ background: "#2d1b1b", color: "#f87171", borderRadius: 20, padding: "2px 9px", fontSize: 10, fontWeight: 700 }}>₹ {unpaidCount} unpaid</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ADD RESIDENT MODAL ── */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Resident">
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Full Name *</label><input style={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Arun Kumar" /></div>
            <div><label style={lbl}>Flat Number *</label><input style={inp} value={form.flat_number} onChange={e => setForm({ ...form, flat_number: e.target.value })} placeholder="401" /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Phone</label><input style={inp} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="9XXXXXXXXX" /></div>
            <div><label style={lbl}>Email</label><input style={inp} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Type</label>
              <select style={inp} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="owner">Owner</option><option value="tenant">Tenant</option><option value="co-owner">Co-owner</option>
              </select>
            </div>
            <div><label style={lbl}>Move-in Date</label><input type="date" style={inp} value={form.move_in_date} onChange={e => setForm({ ...form, move_in_date: e.target.value })} /></div>
          </div>
          <button style={{ ...btnPrimary, justifyContent: "center", opacity: saving ? 0.6 : 1 }} onClick={addResident} disabled={saving}>
            {saving ? "Adding…" : "Add Resident"}
          </button>
        </div>
      </Modal>

      {/* ── RESIDENT PROFILE MODAL ── */}
      <Modal open={!!profile && !showRoles && !showVehicle && !showFamily} onClose={() => setProfile(null)} title={`Flat ${profile?.flat_number} — ${profile?.name}`} wide>
        {profile && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Harmony score */}
            {(() => {
              const harmony = calcHarmony(profile, invoices, complaints);
              const hColor = harmonyColor(harmony);
              return (
                <div style={{ background: "#0d1117", borderRadius: 10, padding: 14, display: "flex", gap: 16, alignItems: "center" }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: `conic-gradient(${hColor} 0% ${harmony}%, #2a2f45 ${harmony}% 100%)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#0d1117", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: hColor, fontSize: 15, fontWeight: 900 }}>{harmony}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ color: hColor, fontSize: 14, fontWeight: 700 }}>Harmony Score: {harmony >= 80 ? "Excellent" : harmony >= 60 ? "Good" : "Needs Attention"}</div>
                    <div style={{ color: "#475569", fontSize: 12, marginTop: 3 }}>
                      {invoices.filter(i => i.flat_number === profile.flat_number && i.status !== "paid").length} unpaid invoices ·
                      {complaints.filter(c => c.flat_number === profile.flat_number && c.status !== "resolved").length} open complaints
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Edit fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={lbl}>Name</label><input style={inp} value={profileData.name || ""} onChange={e => setProfileData({ ...profileData, name: e.target.value })} /></div>
              <div><label style={lbl}>Phone</label><input style={inp} value={profileData.phone || ""} onChange={e => setProfileData({ ...profileData, phone: e.target.value })} /></div>
              <div><label style={lbl}>Email</label><input style={inp} value={profileData.email || ""} onChange={e => setProfileData({ ...profileData, email: e.target.value })} /></div>
              <div><label style={lbl}>Type</label>
                <select style={inp} value={profileData.type || "owner"} onChange={e => setProfileData({ ...profileData, type: e.target.value })}>
                  <option value="owner">Owner</option><option value="tenant">Tenant</option><option value="co-owner">Co-owner</option>
                </select>
              </div>
              <div><label style={lbl}>Move-in Date</label><input type="date" style={inp} value={profileData.move_in_date || ""} onChange={e => setProfileData({ ...profileData, move_in_date: e.target.value })} /></div>
              <div>
                <label style={lbl}>WhatsApp Notifications</label>
                <select style={inp} value={profileData.whatsapp_opt_in ? "yes" : "no"} onChange={e => setProfileData({ ...profileData, whatsapp_opt_in: e.target.value === "yes" })}>
                  <option value="yes">Enabled</option><option value="no">Disabled</option>
                </select>
              </div>
            </div>

            {/* Roles */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={{ ...lbl, margin: 0 }}>Assigned Roles</label>
                <button onClick={() => setShowRoles(profile)} style={btnSec("#818cf8")}>Manage Roles</button>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {getResidentRoles(profile.id).length === 0 && <span style={{ color: "#475569", fontSize: 13 }}>No roles assigned — default: Resident</span>}
                {getResidentRoles(profile.id).map(ur => (
                  <span key={ur.id} style={{ background: `${ur.roles?.color}22`, color: ur.roles?.color, border: `1px solid ${ur.roles?.color}33`, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>{ur.roles?.name}</span>
                ))}
              </div>
            </div>

            {/* Family */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={{ ...lbl, margin: 0 }}>Family Members ({familyMembers.length})</label>
                <button onClick={() => setShowFamily(profile)} style={btnSec("#4ade80")}>+ Add</button>
              </div>
              {familyMembers.map(f => (
                <div key={f.id} style={{ background: "#0d1117", borderRadius: 8, padding: "8px 12px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#e2e8f0", fontSize: 13 }}>{f.name} <span style={{ color: "#64748b" }}>· {f.relation}{f.age ? `, ${f.age}yr` : ""}</span></span>
                  <button onClick={() => removeFamilyMember(f.id)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 16 }}>×</button>
                </div>
              ))}
            </div>

            {/* Vehicles */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={{ ...lbl, margin: 0 }}>Vehicles ({getResidentVehicles(profile.id).length})</label>
                <button onClick={() => setShowVehicle(profile)} style={btnSec("#38bdf8")}>+ Add</button>
              </div>
              {getResidentVehicles(profile.id).map(v => (
                <div key={v.id} style={{ background: "#0d1117", borderRadius: 8, padding: "8px 12px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#e2e8f0", fontSize: 13 }}>🚗 {v.number} <span style={{ color: "#64748b" }}>· {v.type} {v.make} {v.color}</span></span>
                  <button onClick={() => removeVehicle(v.id)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 16 }}>×</button>
                </div>
              ))}
            </div>

            {/* Invoice history */}
            <div>
              <label style={lbl}>Recent Invoices</label>
              {invoices.filter(i => i.flat_number === profile.flat_number).slice(0, 6).map(i => (
                <div key={`${i.flat_number}-${i.month}`} style={{ background: "#0d1117", borderRadius: 8, padding: "8px 12px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#e2e8f0", fontSize: 13 }}>{i.month}</span>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {Number(i.balance_due) > 0 && <span style={{ color: "#f87171", fontSize: 12 }}>₹{Number(i.balance_due).toLocaleString("en-IN")} due</span>}
                    <span style={{ background: i.status === "paid" ? "#1b2d1b" : "#2d1b1b", color: i.status === "paid" ? "#4ade80" : "#f87171", borderRadius: 20, padding: "2px 9px", fontSize: 10, fontWeight: 700 }}>{i.status}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...btnPrimary, flex: 1, justifyContent: "center", opacity: saving ? 0.6 : 1 }} onClick={saveProfile} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</button>
              <button onClick={() => deactivate(profile.id, profile.name)} style={{ background: "#2d1b1b", border: "1px solid #f8717133", borderRadius: 8, padding: "10px 18px", color: "#f87171", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Move Out</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── ROLE ASSIGNMENT MODAL ── */}
      <Modal open={!!showRoles} onClose={() => setShowRoles(null)} title={`Assign Roles — ${showRoles?.name}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ color: "#64748b", fontSize: 13, marginBottom: 6 }}>Tap a role to assign or remove. Multiple roles allowed.</div>
          {roles.map(role => {
            const assigned = userRoles.some(ur => ur.resident_id === showRoles?.id && ur.role_id === role.id && ur.active);
            return (
              <div key={role.id} onClick={() => assignRole(showRoles.id, role.id)}
                style={{ background: assigned ? `${role.color}18` : "#0d1117", border: `2px solid ${assigned ? role.color : "#2a2f45"}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.15s" }}>
                <div>
                  <div style={{ color: assigned ? role.color : "#e2e8f0", fontSize: 14, fontWeight: 700 }}>{role.name}</div>
                  <div style={{ color: "#475569", fontSize: 12, marginTop: 2 }}>{role.description}</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                    {role.permissions?.slice(0, 4).map(p => (
                      <span key={p} style={{ background: "#0d1117", border: "1px solid #2a2f45", borderRadius: 20, padding: "2px 8px", color: "#64748b", fontSize: 10 }}>{p.replace(/_/g, " ")}</span>
                    ))}
                  </div>
                </div>
                <div style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${assigned ? role.color : "#2a2f45"}`, background: assigned ? role.color : "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {assigned && <span style={{ color: "#0d1117", fontSize: 14, fontWeight: 900 }}>✓</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* ── VEHICLE MODAL ── */}
      <Modal open={!!showVehicle} onClose={() => setShowVehicle(null)} title={`Add Vehicle — ${showVehicle?.name}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Type</label>
              <select style={inp} value={vehicleForm.type} onChange={e => setVehicleForm({ ...vehicleForm, type: e.target.value })}>
                <option value="car">Car</option><option value="bike">Bike</option><option value="cycle">Cycle</option><option value="other">Other</option>
              </select>
            </div>
            <div><label style={lbl}>Number Plate *</label><input style={inp} value={vehicleForm.number} onChange={e => setVehicleForm({ ...vehicleForm, number: e.target.value.toUpperCase() })} placeholder="TS09EF1234" /></div>
            <div><label style={lbl}>Make</label><input style={inp} value={vehicleForm.make} onChange={e => setVehicleForm({ ...vehicleForm, make: e.target.value })} placeholder="Honda" /></div>
            <div><label style={lbl}>Model</label><input style={inp} value={vehicleForm.model} onChange={e => setVehicleForm({ ...vehicleForm, model: e.target.value })} placeholder="City" /></div>
            <div><label style={lbl}>Color</label><input style={inp} value={vehicleForm.color} onChange={e => setVehicleForm({ ...vehicleForm, color: e.target.value })} placeholder="White" /></div>
            <div><label style={lbl}>Parking Slot</label><input style={inp} value={vehicleForm.parking_slot} onChange={e => setVehicleForm({ ...vehicleForm, parking_slot: e.target.value })} placeholder="B-12" /></div>
          </div>
          <button style={{ ...btnPrimary, justifyContent: "center", opacity: saving ? 0.6 : 1 }} onClick={addVehicle} disabled={saving}>Add Vehicle</button>
          {getResidentVehicles(showVehicle?.id).length > 0 && (
            <div style={{ marginTop: 8 }}>
              <label style={lbl}>Existing Vehicles</label>
              {getResidentVehicles(showVehicle?.id).map(v => (
                <div key={v.id} style={{ background: "#0d1117", borderRadius: 8, padding: "8px 12px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#e2e8f0", fontSize: 13 }}>{v.number} · {v.type} · {v.color}</span>
                  <button onClick={() => removeVehicle(v.id)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* ── FAMILY MODAL ── */}
      <Modal open={!!showFamily} onClose={() => setShowFamily(null)} title={`Family Members — ${showFamily?.name}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 10 }}>
            <div><label style={lbl}>Name</label><input style={inp} value={familyForm.name} onChange={e => setFamilyForm({ ...familyForm, name: e.target.value })} placeholder="Name" /></div>
            <div><label style={lbl}>Relation</label>
              <select style={inp} value={familyForm.relation} onChange={e => setFamilyForm({ ...familyForm, relation: e.target.value })}>
                {["spouse","child","parent","sibling","other"].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Age</label><input type="number" style={inp} value={familyForm.age} onChange={e => setFamilyForm({ ...familyForm, age: e.target.value })} placeholder="30" /></div>
          </div>
          <button style={{ ...btnPrimary, justifyContent: "center" }} onClick={addFamilyMember}>Add Member</button>
          {familyMembers.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <label style={lbl}>Family Members ({familyMembers.length})</label>
              {familyMembers.map(f => (
                <div key={f.id} style={{ background: "#0d1117", borderRadius: 8, padding: "8px 12px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#e2e8f0", fontSize: 13 }}>{f.name} · {f.relation}{f.age ? `, ${f.age}yr` : ""}</span>
                  <button onClick={() => removeFamilyMember(f.id)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

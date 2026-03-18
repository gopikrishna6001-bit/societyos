// src/components/Amenities.jsx
import { useState, useEffect } from "react";
import { supabase, SOCIETY_ID } from "../lib/supabase";

const inp = { width: "100%", background: "#0d1117", border: "1px solid #2a2f45", borderRadius: 8, padding: "10px 12px", color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const lbl = { color: "#94a3b8", fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 5, display: "block" };
const btnPrimary = { background: "linear-gradient(135deg,#d97706,#f59e0b)", border: "none", borderRadius: 8, padding: "10px 18px", color: "#0d0f14", fontWeight: 700, cursor: "pointer", fontSize: 14 };

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

const DEFAULT_AMENITIES = [
  { name: "Clubhouse", icon: "🏛️", capacity: 50, monthly_limit: 2 },
  { name: "Gym", icon: "💪", capacity: 10, monthly_limit: 30 },
  { name: "Swimming Pool", icon: "🏊", capacity: 20, monthly_limit: 30 },
  { name: "Terrace Garden", icon: "🌿", capacity: 30, monthly_limit: 4 },
  { name: "Kids Play Area", icon: "🎠", capacity: 15, monthly_limit: 30 },
  { name: "Badminton Court", icon: "🏸", capacity: 4, monthly_limit: 8 },
];

export default function Amenities() {
  const [amenities, setAmenities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showBook, setShowBook] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showMaint, setShowMaint] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [viewDate, setViewDate] = useState(new Date().toISOString().slice(0, 10));
  const [bookForm, setBookForm] = useState({ flat_number: "", purpose: "", date: new Date().toISOString().slice(0, 10), slot_start: "06:00", slot_end: "08:00", attendees: 1 });
  const [addForm, setAddForm] = useState({ name: "", icon: "🏛️", description: "", capacity: 10, monthly_limit: 4, deposit: 0, charges: 0 });
  const [maintNote, setMaintNote] = useState("");

  const toast = (text, color = "#4ade80") => { setMsg({ text, color }); setTimeout(() => setMsg(null), 3000); };

  const load = async () => {
    setLoading(true);
    const [am, bk] = await Promise.all([
      supabase.from("amenities").select("*").eq("society_id", SOCIETY_ID),
      supabase.from("amenity_bookings").select("*, amenities(name,icon)").eq("society_id", SOCIETY_ID).gte("date", viewDate).order("date"),
    ]);
    setAmenities(am.data || []);
    setBookings(bk.data || []);
    setLoading(false);
  };

  const seedAmenities = async () => {
    const rows = DEFAULT_AMENITIES.map(a => ({ ...a, society_id: SOCIETY_ID, status: "available", slots: [], rules: [] }));
    await supabase.from("amenities").insert(rows);
    await load();
    toast("✓ Default amenities added");
  };

  useEffect(() => { load(); }, [viewDate]);

  const book = async () => {
    if (!bookForm.flat_number || !showBook) { toast("Flat number required", "#f87171"); return; }
    setSaving(true);
    const { error } = await supabase.from("amenity_bookings").insert({
      amenity_id: showBook.id,
      society_id: SOCIETY_ID,
      flat_number: bookForm.flat_number,
      date: bookForm.date,
      slot_start: bookForm.slot_start,
      slot_end: bookForm.slot_end,
      purpose: bookForm.purpose,
      attendees: bookForm.attendees,
      status: "confirmed",
    });
    if (error) {
      if (error.code === "23505") toast("This slot is already booked", "#f87171");
      else toast(error.message, "#f87171");
      setSaving(false);
      return;
    }
    toast(`✓ ${showBook.name} booked for ${bookForm.date} at ${bookForm.slot_start}`);
    setShowBook(null);
    setBookForm({ flat_number: "", purpose: "", date: new Date().toISOString().slice(0, 10), slot_start: "06:00", slot_end: "08:00", attendees: 1 });
    await load();
    setSaving(false);
  };

  const cancelBooking = async (id) => {
    await supabase.from("amenity_bookings").update({ status: "cancelled" }).eq("id", id);
    setBookings(p => p.map(b => b.id === id ? { ...b, status: "cancelled" } : b));
    toast("Booking cancelled");
  };

  const addAmenity = async () => {
    if (!addForm.name) { toast("Name required", "#f87171"); return; }
    setSaving(true);
    await supabase.from("amenities").insert({ ...addForm, society_id: SOCIETY_ID, status: "available", slots: [], rules: [] });
    toast(`✓ ${addForm.name} added`);
    setShowAdd(false);
    setAddForm({ name: "", icon: "🏛️", description: "", capacity: 10, monthly_limit: 4, deposit: 0, charges: 0 });
    await load();
    setSaving(false);
  };

  const setMaintenance = async (id) => {
    await supabase.from("amenities").update({ status: "maintenance", maintenance_note: maintNote }).eq("id", id);
    setAmenities(p => p.map(a => a.id === id ? { ...a, status: "maintenance", maintenance_note: maintNote } : a));
    toast("Set to maintenance mode");
    setShowMaint(null);
    setMaintNote("");
  };

  const restoreAmenity = async (id) => {
    await supabase.from("amenities").update({ status: "available", maintenance_note: null }).eq("id", id);
    setAmenities(p => p.map(a => a.id === id ? { ...a, status: "available", maintenance_note: null } : a));
    toast("✓ Amenity restored");
  };

  const todayBookings = bookings.filter(b => b.date === viewDate && b.status === "confirmed");

  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", color: "#e2e8f0" }}>
      {msg && <div style={{ position: "fixed", top: 20, right: 20, background: "#161b27", border: `1px solid ${msg.color}44`, borderRadius: 10, padding: "12px 20px", color: msg.color, fontSize: 13, fontWeight: 600, zIndex: 9999 }}>{msg.text}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ color: "#e2e8f0", fontSize: 24, fontFamily: "'Playfair Display',serif", margin: "0 0 4px" }}>Amenities & Booking</h2>
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>{amenities.filter(a => a.status === "available").length} available · {todayBookings.length} booked today</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {amenities.length === 0 && <button onClick={seedAmenities} style={{ background: "#1e2535", border: "1px solid #2a2f45", borderRadius: 8, padding: "10px 16px", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>Add Default Amenities</button>}
          <button style={btnPrimary} onClick={() => setShowAdd(true)}>+ Add Amenity</button>
        </div>
      </div>

      {/* Amenity cards */}
      {loading ? <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading…</div> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12, marginBottom: 24 }}>
            {amenities.map(a => {
              const todayCount = bookings.filter(b => b.amenity_id === a.id && b.date === viewDate && b.status === "confirmed").length;
              return (
                <div key={a.id} style={{ background: "#161b27", border: `1px solid ${a.status === "maintenance" ? "#fbbf2433" : "#2a2f45"}`, borderRadius: 14, padding: 18, cursor: "pointer" }}
                  onClick={() => setSelected(selected === a.id ? null : a.id)}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{a.icon}</div>
                  <div style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{a.name}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    <span style={{ background: a.status === "available" ? "#1b2d1b" : "#2d2510", color: a.status === "available" ? "#4ade80" : "#fbbf24", borderRadius: 20, padding: "2px 9px", fontSize: 10, fontWeight: 700 }}>{a.status}</span>
                    <span style={{ color: "#475569", fontSize: 11 }}>👥 {a.capacity}</span>
                    {todayCount > 0 && <span style={{ color: "#818cf8", fontSize: 11 }}>{todayCount} today</span>}
                  </div>
                  {a.maintenance_note && <div style={{ color: "#fbbf24", fontSize: 11, marginBottom: 8 }}>⚠ {a.maintenance_note}</div>}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {a.status === "available" ? (
                      <>
                        <button onClick={e => { e.stopPropagation(); setShowBook(a); }} style={{ ...btnPrimary, padding: "6px 12px", fontSize: 12 }}>Book</button>
                        <button onClick={e => { e.stopPropagation(); setShowMaint(a); }} style={{ background: "#2d2510", border: "1px solid #fbbf2433", borderRadius: 8, padding: "6px 10px", color: "#fbbf24", cursor: "pointer", fontSize: 11 }}>Maintenance</button>
                      </>
                    ) : (
                      <button onClick={e => { e.stopPropagation(); restoreAmenity(a.id); }} style={{ background: "#1b2d1b", border: "1px solid #4ade8033", borderRadius: 8, padding: "6px 12px", color: "#4ade80", cursor: "pointer", fontSize: 12 }}>✓ Restore</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bookings section */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
              <h3 style={{ color: "#e2e8f0", fontSize: 16, margin: 0 }}>Bookings</h3>
              <input type="date" style={{ ...inp, width: "auto", padding: "7px 12px", fontSize: 13 }} value={viewDate} onChange={e => setViewDate(e.target.value)} />
            </div>

            {bookings.filter(b => b.date === viewDate).length === 0 ? (
              <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 24, textAlign: "center", color: "#475569" }}>No bookings for {viewDate}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {bookings.filter(b => b.date === viewDate).map(b => (
                  <div key={b.id} style={{ background: "#161b27", border: `1px solid ${b.status === "confirmed" ? "#818cf833" : "#2a2f45"}`, borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 16 }}>{b.amenities?.icon}</span>
                        <span style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600 }}>{b.amenities?.name}</span>
                        <span style={{ background: b.status === "confirmed" ? "#1b1b3a" : "#2d1b1b", color: b.status === "confirmed" ? "#818cf8" : "#f87171", borderRadius: 20, padding: "1px 9px", fontSize: 10, fontWeight: 700 }}>{b.status}</span>
                      </div>
                      <div style={{ color: "#64748b", fontSize: 12 }}>
                        Flat {b.flat_number} · {b.slot_start}–{b.slot_end}
                        {b.purpose && ` · ${b.purpose}`}
                        {b.attendees > 1 && ` · ${b.attendees} people`}
                      </div>
                    </div>
                    {b.status === "confirmed" && (
                      <button onClick={() => cancelBooking(b.id)} style={{ background: "#2d1b1b", border: "1px solid #f8717133", borderRadius: 8, padding: "6px 12px", color: "#f87171", cursor: "pointer", fontSize: 12 }}>Cancel</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Book Modal */}
      <Modal open={!!showBook} onClose={() => setShowBook(null)} title={`Book ${showBook?.name}`}>
        {showBook && (
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <div style={{ background: "#0d1117", borderRadius: 10, padding: 12, display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 24 }}>{showBook.icon}</span>
              <div>
                <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600 }}>{showBook.name}</div>
                <div style={{ color: "#64748b", fontSize: 12 }}>Capacity: {showBook.capacity} · Monthly limit: {showBook.monthly_limit} bookings</div>
              </div>
            </div>
            <div><label style={lbl}>Your Flat Number *</label><input style={inp} value={bookForm.flat_number} onChange={e => setBookForm({ ...bookForm, flat_number: e.target.value })} placeholder="e.g. 203" /></div>
            <div><label style={lbl}>Date</label><input type="date" style={inp} value={bookForm.date} onChange={e => setBookForm({ ...bookForm, date: e.target.value })} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={lbl}>From</label><input type="time" style={inp} value={bookForm.slot_start} onChange={e => setBookForm({ ...bookForm, slot_start: e.target.value })} /></div>
              <div><label style={lbl}>To</label><input type="time" style={inp} value={bookForm.slot_end} onChange={e => setBookForm({ ...bookForm, slot_end: e.target.value })} /></div>
            </div>
            <div><label style={lbl}>Purpose</label><input style={inp} value={bookForm.purpose} onChange={e => setBookForm({ ...bookForm, purpose: e.target.value })} placeholder="e.g. Birthday party" /></div>
            <div><label style={lbl}>Number of People</label><input type="number" style={inp} value={bookForm.attendees} onChange={e => setBookForm({ ...bookForm, attendees: Number(e.target.value) })} min={1} max={showBook.capacity} /></div>
            {Number(showBook.deposit) > 0 && <div style={{ background: "#2d2510", borderRadius: 8, padding: "10px 14px", color: "#fbbf24", fontSize: 13 }}>⚠ Deposit required: ₹{showBook.deposit}</div>}
            <button style={{ ...btnPrimary, justifyContent: "center", opacity: saving ? 0.6 : 1 }} onClick={book} disabled={saving}>{saving ? "Booking…" : "Confirm Booking"}</button>
          </div>
        )}
      </Modal>

      {/* Add Amenity Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Amenity">
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 12 }}>
            <div><label style={lbl}>Icon</label><input style={inp} value={addForm.icon} onChange={e => setAddForm({ ...addForm, icon: e.target.value })} placeholder="🏛️" /></div>
            <div><label style={lbl}>Name *</label><input style={inp} value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} placeholder="Clubhouse" /></div>
          </div>
          <div><label style={lbl}>Description</label><input style={inp} value={addForm.description} onChange={e => setAddForm({ ...addForm, description: e.target.value })} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
            <div><label style={lbl}>Capacity</label><input type="number" style={inp} value={addForm.capacity} onChange={e => setAddForm({ ...addForm, capacity: Number(e.target.value) })} /></div>
            <div><label style={lbl}>Monthly Limit</label><input type="number" style={inp} value={addForm.monthly_limit} onChange={e => setAddForm({ ...addForm, monthly_limit: Number(e.target.value) })} /></div>
            <div><label style={lbl}>Deposit ₹</label><input type="number" style={inp} value={addForm.deposit} onChange={e => setAddForm({ ...addForm, deposit: Number(e.target.value) })} /></div>
            <div><label style={lbl}>Charges ₹/hr</label><input type="number" style={inp} value={addForm.charges} onChange={e => setAddForm({ ...addForm, charges: Number(e.target.value) })} /></div>
          </div>
          <button style={{ ...btnPrimary, justifyContent: "center", opacity: saving ? 0.6 : 1 }} onClick={addAmenity} disabled={saving}>{saving ? "Adding…" : "Add Amenity"}</button>
        </div>
      </Modal>

      {/* Maintenance Modal */}
      <Modal open={!!showMaint} onClose={() => setShowMaint(null)} title={`Set Maintenance — ${showMaint?.name}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div style={{ background: "#2d2510", borderRadius: 8, padding: 12, color: "#fbbf24", fontSize: 13 }}>
            This will block all new bookings until restored.
          </div>
          <div><label style={lbl}>Reason / Note</label><textarea style={{ ...inp, height: 80, resize: "vertical" }} value={maintNote} onChange={e => setMaintNote(e.target.value)} placeholder="e.g. Cleaning in progress until March 22" /></div>
          <button style={{ background: "#2d2510", border: "1px solid #fbbf2433", borderRadius: 8, padding: "10px 0", color: "#fbbf24", cursor: "pointer", fontSize: 14, fontWeight: 700, opacity: !maintNote ? 0.5 : 1 }} onClick={() => showMaint && setMaintenance(showMaint.id)} disabled={!maintNote}>Set Maintenance Mode</button>
        </div>
      </Modal>
    </div>
  );
}

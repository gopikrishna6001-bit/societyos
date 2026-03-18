// src/components/Meetings.jsx
import { useState, useEffect } from "react";
import { supabase, SOCIETY_ID } from "../lib/supabase";

const inp = { width: "100%", background: "#0d1117", border: "1px solid #2a2f45", borderRadius: 8, padding: "10px 12px", color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const lbl = { color: "#94a3b8", fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 5, display: "block" };
const btnPrimary = { background: "linear-gradient(135deg,#d97706,#f59e0b)", border: "none", borderRadius: 8, padding: "10px 18px", color: "#0d0f14", fontWeight: 700, cursor: "pointer", fontSize: 14 };

const TYPE_COLOR = { agm: "#f87171", egm: "#fb923c", committee: "#818cf8", welfare: "#4ade80", emergency: "#f87171" };
const STATUS_COLOR = { scheduled: "#38bdf8", completed: "#4ade80", cancelled: "#64748b" };

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

export default function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("upcoming");
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showMinutes, setShowMinutes] = useState(null);
  const [minutesDraft, setMinutesDraft] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [agendaItems, setAgendaItems] = useState([{ item: "", duration_mins: 15 }]);
  const [actionItems, setActionItems] = useState([{ item: "", owner: "", due_date: "" }]);
  const [form, setForm] = useState({ title: "", type: "committee", date: "", time: "18:00", venue: "Community Hall", meeting_link: "", quorum_required: 5 });

  const toast = (text, color = "#4ade80") => { setMsg({ text, color }); setTimeout(() => setMsg(null), 3000); };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("meetings").select("*").eq("society_id", SOCIETY_ID).order("date", { ascending: false });
    setMeetings(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createMeeting = async () => {
    if (!form.title || !form.date) { toast("Title and date required", "#f87171"); return; }
    setSaving(true);
    const validAgenda = agendaItems.filter(a => a.item.trim());
    const { error } = await supabase.from("meetings").insert({
      ...form,
      society_id: SOCIETY_ID,
      agenda: validAgenda,
      action_items: [],
      attendees: [],
      rsvp: { yes: 0, no: 0, maybe: 0 },
      status: "scheduled",
    });
    if (error) { toast(error.message, "#f87171"); setSaving(false); return; }
    toast("✓ Meeting scheduled");
    setShowCreate(false);
    setForm({ title: "", type: "committee", date: "", time: "18:00", venue: "Community Hall", meeting_link: "", quorum_required: 5 });
    setAgendaItems([{ item: "", duration_mins: 15 }]);
    await load();
    setSaving(false);
  };

  const rsvp = async (meetingId, response) => {
    const m = meetings.find(x => x.id === meetingId);
    const newRsvp = { ...m.rsvp, [response]: (m.rsvp?.[response] || 0) + 1 };
    await supabase.from("meetings").update({ rsvp: newRsvp }).eq("id", meetingId);
    setMeetings(p => p.map(x => x.id === meetingId ? { ...x, rsvp: newRsvp } : x));
    toast(`✓ RSVP: ${response}`);
  };

  const saveMinutes = async (isFinal = false) => {
    if (!showMinutes) return;
    setSaving(true);
    const updates = isFinal
      ? { minutes_final: minutesDraft, status: "completed" }
      : { minutes_draft: minutesDraft };
    if (actionItems.filter(a => a.item.trim()).length > 0) {
      updates.action_items = actionItems.filter(a => a.item.trim());
    }
    await supabase.from("meetings").update(updates).eq("id", showMinutes.id);
    setMeetings(p => p.map(x => x.id === showMinutes.id ? { ...x, ...updates } : x));
    toast(isFinal ? "✓ Minutes finalised" : "✓ Draft saved");
    setSaving(false);
    if (isFinal) setShowMinutes(null);
  };

  const generateAIMinutes = async () => {
    if (!showMinutes) return;
    setAiLoading(true);
    try {
      const endpoint = import.meta.env.VITE_AI_ENDPOINT || "https://api.anthropic.com/v1/messages";
      const agenda = (showMinutes.agenda || []).map((a, i) => `${i + 1}. ${a.item}`).join("\n");
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          system: "You are a professional secretary for an Indian apartment society (RWA). Write formal meeting minutes in a structured, professional format suitable for Indian RWA compliance.",
          messages: [{
            role: "user",
            content: `Generate formal meeting minutes for:\nMeeting: ${showMinutes.title}\nType: ${showMinutes.type.toUpperCase()}\nDate: ${showMinutes.date} at ${showMinutes.time}\nVenue: ${showMinutes.venue}\n\nAgenda:\n${agenda || "General discussions"}\n\nWrite complete formal minutes including: attendance placeholder, agenda items discussed, decisions taken, action items, and closing. Keep it professional and formal.`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      setMinutesDraft(text);
      toast("✓ AI minutes generated — review and edit before saving");
    } catch (e) {
      toast("AI unavailable", "#f87171");
    }
    setAiLoading(false);
  };

  const cancelMeeting = async (id) => {
    await supabase.from("meetings").update({ status: "cancelled" }).eq("id", id);
    setMeetings(p => p.map(x => x.id === id ? { ...x, status: "cancelled" } : x));
    toast("Meeting cancelled");
  };

  const today = new Date().toISOString().slice(0, 10);
  const filtered = meetings.filter(m => {
    if (filter === "upcoming") return m.status === "scheduled" && m.date >= today;
    if (filter === "past") return m.status === "completed" || m.date < today;
    if (filter === "all") return true;
    return m.status === filter;
  });

  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", color: "#e2e8f0" }}>
      {msg && <div style={{ position: "fixed", top: 20, right: 20, background: "#161b27", border: `1px solid ${msg.color}44`, borderRadius: 10, padding: "12px 20px", color: msg.color, fontSize: 13, fontWeight: 600, zIndex: 9999 }}>{msg.text}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ color: "#e2e8f0", fontSize: 24, fontFamily: "'Playfair Display',serif", margin: "0 0 4px" }}>Meetings</h2>
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Schedule, RSVP, minutes, action items</p>
        </div>
        <button style={btnPrimary} onClick={() => setShowCreate(true)}>+ Schedule Meeting</button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10, marginBottom: 16 }}>
        {[
          { l: "Upcoming", v: meetings.filter(m => m.status === "scheduled" && m.date >= today).length, c: "#38bdf8" },
          { l: "Completed", v: meetings.filter(m => m.status === "completed").length, c: "#4ade80" },
          { l: "Total", v: meetings.length, c: "#818cf8" },
        ].map((s, i) => (
          <div key={i} style={{ background: "#161b27", border: `1px solid ${s.c}22`, borderLeft: `3px solid ${s.c}`, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ color: s.c, fontSize: 22, fontWeight: 900 }}>{s.v}</div>
            <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 5, marginBottom: 18, background: "#0d1117", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {["upcoming", "past", "all"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? "#1e2535" : "none", border: filter === f ? "1px solid #2a2f45" : "none", borderRadius: 8, padding: "7px 14px", color: filter === f ? "#e2e8f0" : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>{f}</button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading…</div> : filtered.length === 0 ? (
        <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 40, textAlign: "center", color: "#475569" }}>
          No {filter} meetings. Schedule one!
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(m => {
            const typeColor = TYPE_COLOR[m.type] || "#818cf8";
            const statusColor = STATUS_COLOR[m.status] || "#64748b";
            const totalRsvp = (m.rsvp?.yes || 0) + (m.rsvp?.no || 0) + (m.rsvp?.maybe || 0);
            return (
              <div key={m.id} style={{ background: "#161b27", border: `1px solid ${typeColor}33`, borderRadius: 14, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                  <div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ background: `${typeColor}22`, color: typeColor, borderRadius: 20, padding: "2px 10px", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{m.type}</span>
                      <span style={{ background: `${statusColor}22`, color: statusColor, borderRadius: 20, padding: "2px 10px", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{m.status}</span>
                    </div>
                    <div style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{m.title}</div>
                    <div style={{ color: "#64748b", fontSize: 13 }}>
                      📅 {m.date} at {m.time} · 📍 {m.venue}
                      {m.meeting_link && <span> · <a href={m.meeting_link} target="_blank" rel="noreferrer" style={{ color: "#38bdf8" }}>Join online</a></span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "#818cf8", fontSize: 18, fontWeight: 900 }}>{totalRsvp}</div>
                    <div style={{ color: "#475569", fontSize: 10 }}>RSVPs</div>
                  </div>
                </div>

                {/* RSVP counts */}
                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  {[{ l: "✓ Yes", v: m.rsvp?.yes || 0, c: "#4ade80" }, { l: "✗ No", v: m.rsvp?.no || 0, c: "#f87171" }, { l: "? Maybe", v: m.rsvp?.maybe || 0, c: "#fbbf24" }].map((r, i) => (
                    <div key={i} style={{ background: "#0d1117", borderRadius: 8, padding: "6px 12px", textAlign: "center" }}>
                      <div style={{ color: r.c, fontSize: 14, fontWeight: 700 }}>{r.v}</div>
                      <div style={{ color: "#475569", fontSize: 10 }}>{r.l}</div>
                    </div>
                  ))}
                  {m.quorum_required && <div style={{ background: "#0d1117", borderRadius: 8, padding: "6px 12px", textAlign: "center" }}>
                    <div style={{ color: (m.rsvp?.yes || 0) >= m.quorum_required ? "#4ade80" : "#f87171", fontSize: 14, fontWeight: 700 }}>{m.quorum_required}</div>
                    <div style={{ color: "#475569", fontSize: 10 }}>Quorum</div>
                  </div>}
                </div>

                {/* Agenda preview */}
                {m.agenda?.length > 0 && (
                  <div style={{ background: "#0d1117", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
                    <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Agenda</div>
                    {m.agenda.slice(0, 3).map((a, i) => (
                      <div key={i} style={{ color: "#94a3b8", fontSize: 13, marginBottom: 3 }}>{i + 1}. {a.item} {a.duration_mins && <span style={{ color: "#475569" }}>({a.duration_mins}m)</span>}</div>
                    ))}
                    {m.agenda.length > 3 && <div style={{ color: "#475569", fontSize: 12 }}>+{m.agenda.length - 3} more items</div>}
                  </div>
                )}

                {/* Action items */}
                {m.action_items?.length > 0 && (
                  <div style={{ background: "#1b2d1b", border: "1px solid #4ade8022", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
                    <div style={{ color: "#4ade80", fontSize: 11, fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Action Items</div>
                    {m.action_items.map((a, i) => (
                      <div key={i} style={{ color: "#94a3b8", fontSize: 13, marginBottom: 3 }}>• {a.item} <span style={{ color: "#475569" }}>— {a.owner} by {a.due_date}</span></div>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {m.status === "scheduled" && (
                    <>
                      <button onClick={() => rsvp(m.id, "yes")} style={{ background: "#1b2d1b", border: "1px solid #4ade8033", borderRadius: 8, padding: "6px 12px", color: "#4ade80", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>✓ Attending</button>
                      <button onClick={() => rsvp(m.id, "no")} style={{ background: "#2d1b1b", border: "1px solid #f8717133", borderRadius: 8, padding: "6px 12px", color: "#f87171", cursor: "pointer", fontSize: 12 }}>✗ Not Attending</button>
                      <button onClick={() => rsvp(m.id, "maybe")} style={{ background: "#2d2510", border: "1px solid #fbbf2433", borderRadius: 8, padding: "6px 12px", color: "#fbbf24", cursor: "pointer", fontSize: 12 }}>? Maybe</button>
                      <button onClick={() => { setShowMinutes(m); setMinutesDraft(m.minutes_draft || ""); setActionItems(m.action_items?.length ? m.action_items : [{ item: "", owner: "", due_date: "" }]); }} style={{ background: "#1b1b3a", border: "1px solid #818cf833", borderRadius: 8, padding: "6px 12px", color: "#818cf8", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>✍ Write Minutes</button>
                      <button onClick={() => cancelMeeting(m.id)} style={{ background: "#1e2535", border: "1px solid #2a2f45", borderRadius: 8, padding: "6px 12px", color: "#64748b", cursor: "pointer", fontSize: 12 }}>Cancel</button>
                    </>
                  )}
                  {m.status === "completed" && m.minutes_final && (
                    <button onClick={() => { setShowMinutes(m); setMinutesDraft(m.minutes_final || ""); }} style={{ background: "#1b2d1b", border: "1px solid #4ade8033", borderRadius: 8, padding: "6px 12px", color: "#4ade80", cursor: "pointer", fontSize: 12 }}>📄 View Minutes</button>
                  )}
                  {m.status === "completed" && !m.minutes_final && (
                    <button onClick={() => { setShowMinutes(m); setMinutesDraft(m.minutes_draft || ""); setActionItems(m.action_items?.length ? m.action_items : [{ item: "", owner: "", due_date: "" }]); }} style={{ background: "#2d2510", border: "1px solid #fbbf2433", borderRadius: 8, padding: "6px 12px", color: "#fbbf24", cursor: "pointer", fontSize: 12 }}>✍ Finalise Minutes</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE MEETING MODAL ── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Schedule Meeting" wide>
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Title *</label><input style={inp} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. March Committee Meeting" /></div>
            <div><label style={lbl}>Type</label>
              <select style={inp} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {["committee", "agm", "egm", "welfare", "emergency"].map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Quorum Required</label><input type="number" style={inp} value={form.quorum_required} onChange={e => setForm({ ...form, quorum_required: Number(e.target.value) })} /></div>
            <div><label style={lbl}>Date *</label><input type="date" style={inp} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            <div><label style={lbl}>Time</label><input type="time" style={inp} value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></div>
            <div><label style={lbl}>Venue</label><input style={inp} value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} /></div>
            <div><label style={lbl}>Online Link (optional)</label><input style={inp} value={form.meeting_link} onChange={e => setForm({ ...form, meeting_link: e.target.value })} placeholder="https://meet.google.com/..." /></div>
          </div>

          <div>
            <label style={lbl}>Agenda Items</label>
            {agendaItems.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input style={{ ...inp, flex: 3 }} value={a.item} onChange={e => { const ag = [...agendaItems]; ag[i].item = e.target.value; setAgendaItems(ag); }} placeholder={`Agenda item ${i + 1}`} />
                <input type="number" style={{ ...inp, flex: 1 }} value={a.duration_mins} onChange={e => { const ag = [...agendaItems]; ag[i].duration_mins = Number(e.target.value); setAgendaItems(ag); }} placeholder="Mins" />
                {agendaItems.length > 1 && <button onClick={() => setAgendaItems(agendaItems.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 20 }}>×</button>}
              </div>
            ))}
            <button onClick={() => setAgendaItems([...agendaItems, { item: "", duration_mins: 15 }])} style={{ background: "#1e2535", border: "1px solid #2a2f45", borderRadius: 8, padding: "7px 14px", color: "#64748b", cursor: "pointer", fontSize: 12 }}>+ Add Agenda Item</button>
          </div>

          <button style={{ ...btnPrimary, justifyContent: "center", opacity: saving ? 0.6 : 1 }} onClick={createMeeting} disabled={saving}>{saving ? "Scheduling…" : "Schedule Meeting"}</button>
        </div>
      </Modal>

      {/* ── MINUTES MODAL ── */}
      <Modal open={!!showMinutes} onClose={() => setShowMinutes(null)} title="Meeting Minutes" wide>
        {showMinutes && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "#0d1117", borderRadius: 10, padding: 12, fontSize: 13, color: "#64748b" }}>
              {showMinutes.title} · {showMinutes.date} · {showMinutes.venue}
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
              <button onClick={generateAIMinutes} disabled={aiLoading} style={{ background: "linear-gradient(135deg,#312e81,#4f46e5)", border: "none", borderRadius: 8, padding: "8px 16px", color: "#e2e8f0", cursor: aiLoading ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600, opacity: aiLoading ? 0.6 : 1 }}>
                {aiLoading ? "Generating…" : "✨ AI Generate Draft"}
              </button>
              <span style={{ color: "#475569", fontSize: 12, alignSelf: "center" }}>or write manually below</span>
            </div>

            <div>
              <label style={lbl}>Minutes</label>
              <textarea style={{ ...inp, height: 200, resize: "vertical", fontFamily: "monospace", fontSize: 12 }} value={minutesDraft} onChange={e => setMinutesDraft(e.target.value)} placeholder="Write meeting minutes here…" />
            </div>

            <div>
              <label style={lbl}>Action Items</label>
              {actionItems.map((a, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, marginBottom: 8 }}>
                  <input style={inp} value={a.item} onChange={e => { const ac = [...actionItems]; ac[i].item = e.target.value; setActionItems(ac); }} placeholder="Action item" />
                  <input style={inp} value={a.owner} onChange={e => { const ac = [...actionItems]; ac[i].owner = e.target.value; setActionItems(ac); }} placeholder="Owner" />
                  <input type="date" style={inp} value={a.due_date} onChange={e => { const ac = [...actionItems]; ac[i].due_date = e.target.value; setActionItems(ac); }} />
                  {actionItems.length > 1 && <button onClick={() => setActionItems(actionItems.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 20 }}>×</button>}
                </div>
              ))}
              <button onClick={() => setActionItems([...actionItems, { item: "", owner: "", due_date: "" }])} style={{ background: "#1e2535", border: "1px solid #2a2f45", borderRadius: 8, padding: "7px 14px", color: "#64748b", cursor: "pointer", fontSize: 12 }}>+ Add Action Item</button>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => saveMinutes(false)} style={{ flex: 1, background: "#1e2535", border: "1px solid #2a2f45", borderRadius: 8, padding: "10px 0", color: "#94a3b8", cursor: "pointer", fontSize: 13, opacity: saving ? 0.6 : 1 }} disabled={saving}>Save Draft</button>
              <button onClick={() => saveMinutes(true)} style={{ ...btnPrimary, flex: 1, justifyContent: "center", opacity: saving ? 0.6 : 1 }} disabled={saving}>{saving ? "Saving…" : "✓ Finalise Minutes"}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

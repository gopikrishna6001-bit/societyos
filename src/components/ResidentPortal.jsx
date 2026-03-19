// src/components/ResidentPortal.jsx
// Simplified view for residents - only what they need
import { useState, useEffect } from "react";
import { supabase, SOCIETY_ID } from "../lib/supabase";

const btnPrimary = { background: "linear-gradient(135deg,#d97706,#f59e0b)", border: "none", borderRadius: 8, padding: "10px 18px", color: "#0d0f14", fontWeight: 700, cursor: "pointer", fontSize: 14 };
const inp = { width: "100%", background: "#0d1117", border: "1px solid #2a2f45", borderRadius: 8, padding: "10px 12px", color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const lbl = { color: "#94a3b8", fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 5, display: "block" };

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "88vh", overflow: "auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: 17 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 24 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default function ResidentPortal({ flatNumber, onExitResidentView }) {
  const [tab, setTab] = useState("home");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showComplaint, setShowComplaint] = useState(false);
  const [complaintForm, setComplaintForm] = useState({ title: "", category: "Noise", priority: "medium", description: "", anonymous: false });

  const toast = (text, color = "#4ade80") => { setMsg({ text, color }); setTimeout(() => setMsg(null), 3000); };

  const load = async () => {
    setLoading(true);
    const flat = flatNumber || "101";
    const [res, inv, comp, notices, polls, amenities, bookings] = await Promise.all([
      supabase.from("residents").select("*").eq("society_id", SOCIETY_ID).eq("flat_number", flat).eq("status", "active").single(),
      supabase.from("invoices").select("*").eq("society_id", SOCIETY_ID).eq("flat_number", flat).order("month", { ascending: false }).limit(6),
      supabase.from("complaints").select("*").eq("society_id", SOCIETY_ID).eq("flat_number", flat).order("created_at", { ascending: false }).limit(10),
      supabase.from("notices").select("*").eq("society_id", SOCIETY_ID).order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(10),
      supabase.from("polls").select("*").eq("society_id", SOCIETY_ID).eq("status", "active"),
      supabase.from("amenities").select("*").eq("society_id", SOCIETY_ID).eq("status", "available"),
      supabase.from("amenity_bookings").select("*, amenities(name,icon)").eq("society_id", SOCIETY_ID).eq("flat_number", flat).gte("date", new Date().toISOString().slice(0, 10)).order("date"),
    ]);
    setData({
      resident: res.data,
      invoices: inv.data || [],
      complaints: comp.data || [],
      notices: notices.data || [],
      polls: polls.data || [],
      amenities: amenities.data || [],
      bookings: bookings.data || [],
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, [flatNumber]);

  const raiseComplaint = async () => {
    if (!complaintForm.title) { toast("Title required", "#f87171"); return; }
    setSaving(true);
    await supabase.from("complaints").insert({
      society_id: SOCIETY_ID,
      flat_number: flatNumber || "101",
      title: complaintForm.title,
      category: complaintForm.category,
      priority: complaintForm.priority,
      description: complaintForm.description,
      anonymous: complaintForm.anonymous,
      status: "open",
      votes: 0,
      sla_hours: 168,
      source: "app",
    });
    toast("✓ Complaint submitted");
    setShowComplaint(false);
    setComplaintForm({ title: "", category: "Noise", priority: "medium", description: "", anonymous: false });
    await load();
    setSaving(false);
  };

  const currentInvoice = data?.invoices?.[0];
  const unpaidCount = data?.invoices?.filter(i => i.status !== "paid").length || 0;

  const TYPE_ICON = { urgent: "🚨", info: "ℹ️", event: "🎉", compliance: "📋", alert: "⚠️" };

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: "#64748b" }}>Loading your portal…</div>;

  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", color: "#e2e8f0" }}>
      {msg && <div style={{ position: "fixed", top: 20, right: 20, background: "#161b27", border: `1px solid ${msg.color}44`, borderRadius: 10, padding: "12px 20px", color: msg.color, fontSize: 13, fontWeight: 600, zIndex: 9999 }}>{msg.text}</div>}

      {/* Resident header */}
      <div style={{ background: "linear-gradient(135deg,#1a1f35,#161b27)", border: "1px solid #2a2f45", borderRadius: 14, padding: 18, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "#f59e0b22", border: "2px solid #f59e0b44", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#f59e0b" }}>
            {data?.resident?.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?"}
          </div>
          <div>
            <div style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 700 }}>{data?.resident?.name || `Flat ${flatNumber}`}</div>
            <div style={{ color: "#fbbf24", fontSize: 12 }}>Flat {flatNumber} · {data?.resident?.type || "Resident"}</div>
            <div style={{ color: "#475569", fontSize: 11 }}>{data?.resident?.phone}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {unpaidCount > 0 && <span style={{ background: "#2d1b1b", color: "#f87171", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>₹ {unpaidCount} unpaid</span>}
          {onExitResidentView && (
            <button onClick={onExitResidentView} style={{ background: "#1e2535", border: "1px solid #2a2f45", borderRadius: 8, padding: "7px 14px", color: "#64748b", cursor: "pointer", fontSize: 12 }}>← Admin View</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 5, marginBottom: 16, background: "#0d1117", borderRadius: 10, padding: 4, overflowX: "auto" }}>
        {["home", "my dues", "complaints", "notices", "polls", "amenities"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? "#1e2535" : "none", border: tab === t ? "1px solid #2a2f45" : "none", borderRadius: 8, padding: "7px 14px", color: tab === t ? "#e2e8f0" : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: 600, textTransform: "capitalize", whiteSpace: "nowrap" }}>{t}</button>
        ))}
      </div>

      {/* HOME */}
      {tab === "home" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Quick actions */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {[
              { icon: "₹", label: "Pay Dues", color: "#4ade80", action: () => setTab("my dues") },
              { icon: "⚠", label: "Raise Issue", color: "#f87171", action: () => setShowComplaint(true) },
              { icon: "🏊", label: "Book Amenity", color: "#818cf8", action: () => setTab("amenities") },
            ].map((a, i) => (
              <button key={i} onClick={a.action} style={{ background: "#161b27", border: `1px solid ${a.color}22`, borderRadius: 12, padding: "16px 8px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 22 }}>{a.icon}</span>
                <span style={{ color: a.color, fontSize: 11, fontWeight: 700 }}>{a.label}</span>
              </button>
            ))}
          </div>

          {/* Current dues */}
          {currentInvoice && (
            <div onClick={() => setTab("my dues")} style={{ background: currentInvoice.status === "paid" ? "#1b2d1b" : "#2d1b1b", border: `1px solid ${currentInvoice.status === "paid" ? "#4ade8033" : "#f8717133"}`, borderRadius: 12, padding: 16, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{currentInvoice.month} Dues</div>
                  <div style={{ color: currentInvoice.status === "paid" ? "#4ade80" : "#f87171", fontSize: 22, fontWeight: 900, marginTop: 4 }}>
                    {currentInvoice.status === "paid" ? "✓ Paid" : `₹${Number(currentInvoice.balance_due).toLocaleString("en-IN")} Due`}
                  </div>
                  <div style={{ color: "#475569", fontSize: 12, marginTop: 3 }}>Due date: {currentInvoice.due_date} · Tap for details →</div>
                </div>
                <div style={{ fontSize: 28 }}>{currentInvoice.status === "paid" ? "✅" : "💸"}</div>
              </div>
            </div>
          )}

          {/* Pinned notices */}
          {data.notices.filter(n => n.pinned).slice(0, 2).map(n => (
            <div key={n.id} style={{ background: "#2d2510", border: "1px solid #fbbf2433", borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ fontSize: 16 }}>{TYPE_ICON[n.type] || "📢"}</span>
                <div>
                  <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{n.title}</div>
                  <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>{n.content?.slice(0, 80)}{n.content?.length > 80 ? "…" : ""}</div>
                </div>
              </div>
            </div>
          ))}

          {/* My bookings */}
          {data.bookings.length > 0 && (
            <div style={{ background: "#161b27", border: "1px solid #818cf833", borderRadius: 12, padding: 14 }}>
              <div style={{ color: "#818cf8", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>📅 Upcoming Bookings</div>
              {data.bookings.map(b => (
                <div key={b.id} style={{ color: "#94a3b8", fontSize: 13, marginBottom: 4 }}>
                  {b.amenities?.icon} {b.amenities?.name} · {b.date} {b.slot_start}–{b.slot_end}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MY DUES */}
      {tab === "my dues" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.invoices.length === 0 && <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 30, textAlign: "center", color: "#475569" }}>No invoices yet</div>}
          {data.invoices.map(inv => (
            <div key={inv.id} style={{ background: "#161b27", border: `1px solid ${inv.status === "paid" ? "#4ade8022" : "#f8717122"}`, borderRadius: 12, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 700 }}>{inv.month}</span>
                <span style={{ background: inv.status === "paid" ? "#1b2d1b" : inv.status === "partial" ? "#2d2510" : "#2d1b1b", color: inv.status === "paid" ? "#4ade80" : inv.status === "partial" ? "#fbbf24" : "#f87171", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{inv.status}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                {[
                  { l: "Billed", v: `₹${Number(inv.total_amount).toLocaleString("en-IN")}`, c: "#e2e8f0" },
                  { l: "Paid", v: `₹${Number(inv.amount_paid).toLocaleString("en-IN")}`, c: "#4ade80" },
                  { l: "Balance", v: `₹${Number(inv.balance_due).toLocaleString("en-IN")}`, c: Number(inv.balance_due) > 0 ? "#f87171" : "#4ade80" },
                ].map((x, i) => (
                  <div key={i} style={{ background: "#0d1117", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                    <div style={{ color: x.c, fontSize: 13, fontWeight: 700 }}>{x.v}</div>
                    <div style={{ color: "#475569", fontSize: 10 }}>{x.l}</div>
                  </div>
                ))}
              </div>
              {inv.late_fee > 0 && <div style={{ color: "#fbbf24", fontSize: 11, marginBottom: 10 }}>Late fee: ₹{Number(inv.late_fee).toLocaleString("en-IN")}{inv.penalty_waived ? " (waived)" : ""}</div>}

              {/* Payment options for unpaid invoices */}
              {inv.status !== "paid" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Pay Now</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => {
                      const upi = `upi://pay?pa=societyfund@upi&pn=Sunrise+Residency&am=${inv.balance_due}&cu=INR&tn=Maintenance+${inv.month}+Flat+${flatNumber}`;
                      window.open(upi, "_blank");
                      toast("Opening UPI app…");
                    }} style={{ background: "linear-gradient(135deg,#1b2d1b,#0d1117)", border: "1px solid #4ade8033", borderRadius: 10, padding: "10px 16px", color: "#4ade80", cursor: "pointer", fontSize: 13, fontWeight: 700, flex: 1 }}>
                      📱 Pay via UPI
                    </button>
                    <button onClick={() => {
                      navigator.clipboard?.writeText("societyfund@upi");
                      toast("UPI ID copied! Open any UPI app to pay.");
                    }} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 10, padding: "10px 16px", color: "#94a3b8", cursor: "pointer", fontSize: 13, flex: 1 }}>
                      📋 Copy UPI ID
                    </button>
                  </div>
                  <div style={{ background: "#0d1117", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
                    <strong style={{ color: "#94a3b8" }}>Bank Transfer:</strong><br/>
                    Account: Society Fund · IFSC: Contact secretary<br/>
                    Reference: Flat {flatNumber} · {inv.month}
                  </div>
                  <div style={{ background: "#2d2510", border: "1px solid #fbbf2433", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#fbbf24" }}>
                    ⚠ After payment, WhatsApp your treasurer with the reference number to get it marked as paid.
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* COMPLAINTS */}
      {tab === "complaints" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ color: "#64748b", fontSize: 13 }}>{data.complaints.length} complaints raised by your flat</div>
            <button style={btnPrimary} onClick={() => setShowComplaint(true)}>+ Raise Issue</button>
          </div>
          {data.complaints.length === 0 && <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 30, textAlign: "center", color: "#475569" }}>No complaints raised. Good neighbourhood!</div>}
          {data.complaints.map(c => (
            <div key={c.id} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 16, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
                <span style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600 }}>{c.title}</span>
                <span style={{ background: c.status === "resolved" ? "#1b2d1b" : "#2d1b1b", color: c.status === "resolved" ? "#4ade80" : "#f87171", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{c.status}</span>
              </div>
              <div style={{ color: "#64748b", fontSize: 12 }}>{c.category} · {new Date(c.created_at).toLocaleDateString("en-IN")}</div>
              {c.resolution && <div style={{ background: "#1b2d1b", borderRadius: 8, padding: "8px 12px", marginTop: 8, color: "#4ade80", fontSize: 12 }}>✓ {c.resolution}</div>}
              {c.ticket_number && <div style={{ color: "#38bdf8", fontSize: 11, marginTop: 4 }}>Ticket: {c.ticket_number}</div>}
            </div>
          ))}
        </div>
      )}

      {/* NOTICES */}
      {tab === "notices" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.notices.map(n => (
            <div key={n.id} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{TYPE_ICON[n.type] || "📢"}</span>
                <div>
                  <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{n.title}</div>
                  <div style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6 }}>{n.content}</div>
                  <div style={{ color: "#475569", fontSize: 11, marginTop: 6 }}>By {n.author} · {new Date(n.created_at).toLocaleDateString("en-IN")}</div>
                </div>
              </div>
            </div>
          ))}
          {data.notices.length === 0 && <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 30, textAlign: "center", color: "#475569" }}>No notices</div>}
        </div>
      )}

      {/* POLLS */}
      {tab === "polls" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {data.polls.length === 0 && <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 30, textAlign: "center", color: "#475569" }}>No active polls</div>}
          {data.polls.map(poll => (
            <div key={poll.id} style={{ background: "#161b27", border: "1px solid #818cf833", borderRadius: 14, padding: 20 }}>
              <div style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 700, marginBottom: 14 }}>{poll.question}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(poll.options || []).map((opt, idx) => {
                  const count = (poll.votes || [])[idx] || 0;
                  const pct = poll.total > 0 ? Math.round((count / poll.total) * 100) : 0;
                  return (
                    <div key={idx} onClick={async () => {
                      const newVotes = [...(poll.votes || new Array(poll.options.length).fill(0))];
                      newVotes[idx] = (newVotes[idx] || 0) + 1;
                      await supabase.from("polls").update({ votes: newVotes, total: (poll.total || 0) + 1 }).eq("id", poll.id);
                      toast("✓ Vote recorded");
                      await load();
                    }} style={{ background: "#0d1117", border: "1px solid #2a2f45", borderRadius: 10, padding: "10px 14px", cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ color: "#e2e8f0", fontSize: 13 }}>{opt}</span>
                        <span style={{ color: "#818cf8", fontSize: 13, fontWeight: 700 }}>{pct}%</span>
                      </div>
                      <div style={{ height: 4, background: "#1e2535", borderRadius: 2 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "#818cf8", borderRadius: 2 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ color: "#475569", fontSize: 11, marginTop: 10 }}>{poll.total} votes · {poll.deadline ? `Closes ${new Date(poll.deadline).toLocaleDateString("en-IN")}` : "No deadline"}</div>
            </div>
          ))}
        </div>
      )}

      {/* AMENITIES */}
      {tab === "amenities" && (
        <div>
          <div style={{ color: "#64748b", fontSize: 13, marginBottom: 14 }}>Available amenities for booking</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 10, marginBottom: 20 }}>
            {data.amenities.map(a => (
              <div key={a.id} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 16, textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>{a.icon}</div>
                <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{a.name}</div>
                <div style={{ color: "#475569", fontSize: 11, marginBottom: 10 }}>👥 {a.capacity} · {a.monthly_limit}/month</div>
                <div style={{ color: "#4ade80", fontSize: 11, fontWeight: 700 }}>Available</div>
              </div>
            ))}
          </div>
          <div style={{ background: "#0d1117", borderRadius: 10, padding: 14, color: "#64748b", fontSize: 13 }}>
            To book an amenity, contact the secretary or use the committee portal. Online booking coming soon.
          </div>
        </div>
      )}

      {/* RAISE COMPLAINT MODAL */}
      <Modal open={showComplaint} onClose={() => setShowComplaint(false)} title="Raise a Complaint">
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div><label style={lbl}>Title *</label><input style={inp} value={complaintForm.title} onChange={e => setComplaintForm({ ...complaintForm, title: e.target.value })} placeholder="Brief description of the issue" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Category</label>
              <select style={inp} value={complaintForm.category} onChange={e => setComplaintForm({ ...complaintForm, category: e.target.value })}>
                {["Noise", "Parking", "Water", "Electrical", "Hygiene", "Security", "Lift", "Maintenance", "Pets", "Other"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Priority</label>
              <select style={inp} value={complaintForm.priority} onChange={e => setComplaintForm({ ...complaintForm, priority: e.target.value })}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select>
            </div>
          </div>
          <div><label style={lbl}>Details</label><textarea style={{ ...inp, height: 80, resize: "vertical" }} value={complaintForm.description} onChange={e => setComplaintForm({ ...complaintForm, description: e.target.value })} placeholder="Describe the issue…" /></div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={complaintForm.anonymous} onChange={e => setComplaintForm({ ...complaintForm, anonymous: e.target.checked })} />
            Submit anonymously
          </label>
          <button style={{ ...btnPrimary, justifyContent: "center", opacity: saving ? 0.6 : 1 }} onClick={raiseComplaint} disabled={saving}>{saving ? "Submitting…" : "Submit Complaint"}</button>
        </div>
      </Modal>
    </div>
  );
}

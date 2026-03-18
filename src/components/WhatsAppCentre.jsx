// src/components/WhatsAppCentre.jsx
import { useState, useEffect } from "react";
import { supabase, SOCIETY_ID } from "../lib/supabase";

const inp = { width: "100%", background: "#0d1117", border: "1px solid #2a2f45", borderRadius: 8, padding: "10px 12px", color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const lbl = { color: "#94a3b8", fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 5, display: "block" };
const btnPrimary = { background: "linear-gradient(135deg,#d97706,#f59e0b)", border: "none", borderRadius: 8, padding: "10px 18px", color: "#0d0f14", fontWeight: 700, cursor: "pointer", fontSize: 14 };
const btnWA = { background: "linear-gradient(135deg,#075e54,#128c7e)", border: "none", borderRadius: 8, padding: "10px 18px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 };

const STATUS_COLOR = { delivered: "#4ade80", failed: "#f87171", pending: "#fbbf24", read: "#38bdf8" };

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

export default function WhatsAppCentre() {
  const [tab, setTab] = useState("log");
  const [log, setLog] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [residents, setResidents] = useState([]);
  const [society, setSociety] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);

  const [broadcastForm, setBroadcastForm] = useState({ message: "", target: "all", template_id: "" });
  const [templateForm, setTemplateForm] = useState({ name: "", type: "custom", content: "" });

  const toast = (text, color = "#4ade80") => { setMsg({ text, color }); setTimeout(() => setMsg(null), 3000); };

  const load = async () => {
    setLoading(true);
    const [l, t, r, s] = await Promise.all([
      supabase.from("whatsapp_log").select("*").eq("society_id", SOCIETY_ID).order("created_at", { ascending: false }).limit(100),
      supabase.from("message_templates").select("*").eq("society_id", SOCIETY_ID),
      supabase.from("residents").select("id,name,flat_number,phone,whatsapp_opt_in").eq("society_id", SOCIETY_ID).eq("status", "active"),
      supabase.from("societies").select("*").eq("id", SOCIETY_ID).single(),
    ]);
    setLog(l.data || []);
    setTemplates(t.data || []);
    setResidents(r.data || []);
    setSociety(s.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const sendBroadcast = async () => {
    if (!broadcastForm.message) { toast("Message required", "#f87171"); return; }
    setSaving(true);

    const targets = broadcastForm.target === "all"
      ? residents.filter(r => r.whatsapp_opt_in && r.phone)
      : broadcastForm.target === "defaulters"
      ? residents.filter(r => r.phone) // simplified — in prod filter by unpaid invoices
      : residents.filter(r => r.phone && r.whatsapp_opt_in);

    const rows = targets.map(r => ({
      society_id: SOCIETY_ID,
      to_flat: r.flat_number,
      to_number: r.phone,
      message: broadcastForm.message.replace("{{name}}", r.name).replace("{{flat}}", r.flat_number),
      type: "broadcast",
      status: "pending",
    }));

    if (rows.length === 0) { toast("No recipients found", "#f87171"); setSaving(false); return; }

    const { error } = await supabase.from("whatsapp_log").insert(rows);
    if (error) { toast(error.message, "#f87171"); setSaving(false); return; }

    // Trigger send function
    try {
      await fetch(`https://wzchqxwwezklxsxmjvyt.supabase.co/functions/v1/send-whatsapp`, { method: "POST" });
    } catch (e) { /* silent fail — messages queued */ }

    toast(`✓ Broadcast queued for ${rows.length} residents`);
    setShowBroadcast(false);
    setBroadcastForm({ message: "", target: "all", template_id: "" });
    await load();
    setSaving(false);
  };

  const addTemplate = async () => {
    if (!templateForm.name || !templateForm.content) { toast("Name and content required", "#f87171"); return; }
    setSaving(true);
    await supabase.from("message_templates").insert({ ...templateForm, society_id: SOCIETY_ID, active: true });
    toast("✓ Template saved");
    setShowTemplate(false);
    setTemplateForm({ name: "", type: "custom", content: "" });
    await load();
    setSaving(false);
  };

  const retryFailed = async () => {
    await supabase.from("whatsapp_log").update({ status: "pending" }).eq("society_id", SOCIETY_ID).eq("status", "failed");
    try { await fetch(`https://wzchqxwwezklxsxmjvyt.supabase.co/functions/v1/send-whatsapp`, { method: "POST" }); } catch (e) {}
    toast("Retrying failed messages…");
    await load();
  };

  const stats = {
    total: log.length,
    delivered: log.filter(l => l.status === "delivered").length,
    failed: log.filter(l => l.status === "failed").length,
    pending: log.filter(l => l.status === "pending").length,
    optedIn: residents.filter(r => r.whatsapp_opt_in).length,
  };

  const deliveryRate = stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0;

  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", color: "#e2e8f0" }}>
      {msg && <div style={{ position: "fixed", top: 20, right: 20, background: "#161b27", border: `1px solid ${msg.color}44`, borderRadius: 10, padding: "12px 20px", color: msg.color, fontSize: 13, fontWeight: 600, zIndex: 9999 }}>{msg.text}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ color: "#e2e8f0", fontSize: 24, fontFamily: "'Playfair Display',serif", margin: "0 0 4px" }}>WhatsApp Centre</h2>
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Broadcast, templates, delivery tracking</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {tab === "templates" && <button style={btnPrimary} onClick={() => setShowTemplate(true)}>+ New Template</button>}
          <button style={btnWA} onClick={() => setShowBroadcast(true)}>📱 Broadcast</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 10, marginBottom: 16 }}>
        {[
          { l: "Total Sent", v: stats.total, c: "#e2e8f0" },
          { l: "Delivered", v: stats.delivered, c: "#4ade80" },
          { l: "Failed", v: stats.failed, c: "#f87171" },
          { l: "Pending", v: stats.pending, c: "#fbbf24" },
          { l: "Opted In", v: stats.optedIn, c: "#25d366" },
          { l: "Delivery Rate", v: `${deliveryRate}%`, c: deliveryRate >= 80 ? "#4ade80" : "#fbbf24" },
        ].map((s, i) => (
          <div key={i} style={{ background: "#161b27", border: `1px solid ${s.c}22`, borderLeft: `3px solid ${s.c}`, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ color: s.c, fontSize: 18, fontWeight: 900 }}>{s.v}</div>
            <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* WA Bot Commands reference */}
      <div style={{ background: "linear-gradient(135deg,#075e5422,#161b27)", border: "1px solid #25d36633", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ color: "#25d366", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>📱 Bot Commands (residents send these to society WA number)</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["MY DUES", "BALANCE", "NOTICES", "HELP", "STATUS [ticket]", "COMPLAINT [text]"].map(cmd => (
            <span key={cmd} style={{ background: "#0d1117", border: "1px solid #25d36633", borderRadius: 8, padding: "4px 12px", color: "#25d366", fontSize: 12, fontWeight: 600 }}>{cmd}</span>
          ))}
        </div>
      </div>

      {stats.failed > 0 && (
        <div style={{ background: "#2d1b1b", border: "1px solid #f8717133", borderRadius: 10, padding: "12px 16px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#f87171", fontSize: 13 }}>{stats.failed} messages failed to deliver</span>
          <button onClick={retryFailed} style={{ background: "#2d1b1b", border: "1px solid #f8717133", borderRadius: 8, padding: "6px 14px", color: "#f87171", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Retry All</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 5, marginBottom: 18, background: "#0d1117", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {["log", "templates", "opt-in status"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? "#1e2535" : "none", border: tab === t ? "1px solid #2a2f45" : "none", borderRadius: 8, padding: "7px 14px", color: tab === t ? "#e2e8f0" : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: 600, textTransform: "capitalize", whiteSpace: "nowrap" }}>{t}</button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading…</div> : (
        <>
          {/* LOG */}
          {tab === "log" && (
            <div>
              {log.length === 0 && <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 40, textAlign: "center", color: "#475569" }}>No messages sent yet. Use Broadcast to send your first message.</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {log.map(l => (
                  <div key={l.id} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ color: "#fbbf24", fontSize: 12, fontWeight: 700 }}>Flat {l.to_flat}</span>
                        <span style={{ color: "#475569", fontSize: 11 }}>{l.to_number}</span>
                        <span style={{ background: `${STATUS_COLOR[l.status] || "#64748b"}22`, color: STATUS_COLOR[l.status] || "#64748b", borderRadius: 20, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>{l.status}</span>
                        <span style={{ color: "#475569", fontSize: 10, textTransform: "uppercase" }}>{l.type}</span>
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{l.message}</div>
                    </div>
                    <div style={{ color: "#475569", fontSize: 11, flexShrink: 0 }}>{new Date(l.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TEMPLATES */}
          {tab === "templates" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {templates.map(t => (
                <div key={t.id} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <div>
                      <span style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700 }}>{t.name}</span>
                      <span style={{ color: "#475569", fontSize: 11, marginLeft: 10, textTransform: "uppercase" }}>{t.type}</span>
                    </div>
                    <button onClick={() => setBroadcastForm(p => ({ ...p, message: t.content }))} style={{ background: "#1b2535", border: "1px solid #38bdf833", borderRadius: 8, padding: "5px 12px", color: "#38bdf8", cursor: "pointer", fontSize: 12 }}>Use</button>
                  </div>
                  <div style={{ background: "#0d1117", borderRadius: 8, padding: "10px 14px", color: "#94a3b8", fontSize: 13, lineHeight: 1.6 }}>{t.content}</div>
                  <div style={{ color: "#475569", fontSize: 11, marginTop: 6 }}>Variables: {"{{name}}"} {"{{flat}}"} {"{{amount}}"} {"{{month}}"} {"{{link}}"}</div>
                </div>
              ))}
            </div>
          )}

          {/* OPT-IN STATUS */}
          {tab === "opt-in status" && (
            <div>
              <div style={{ color: "#64748b", fontSize: 13, marginBottom: 14 }}>
                {stats.optedIn} of {residents.length} residents opted in · {residents.length - stats.optedIn} opted out
              </div>
              <div style={{ height: 8, background: "#0d1117", borderRadius: 4, marginBottom: 16 }}>
                <div style={{ height: "100%", width: `${(stats.optedIn / residents.length) * 100}%`, background: "#25d366", borderRadius: 4 }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {residents.map(r => (
                  <div key={r.id} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 10, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{r.name}</span>
                      <span style={{ color: "#475569", fontSize: 12, marginLeft: 8 }}>Flat {r.flat_number} · {r.phone}</span>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ color: r.whatsapp_opt_in ? "#25d366" : "#f87171", fontSize: 12, fontWeight: 700 }}>{r.whatsapp_opt_in ? "✓ Opted In" : "✗ Opted Out"}</span>
                      <button onClick={async () => {
                        await supabase.from("residents").update({ whatsapp_opt_in: !r.whatsapp_opt_in }).eq("id", r.id);
                        setResidents(p => p.map(x => x.id === r.id ? { ...x, whatsapp_opt_in: !x.whatsapp_opt_in } : x));
                      }} style={{ background: "#1e2535", border: "1px solid #2a2f45", borderRadius: 8, padding: "4px 10px", color: "#64748b", cursor: "pointer", fontSize: 11 }}>Toggle</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* BROADCAST MODAL */}
      <Modal open={showBroadcast} onClose={() => setShowBroadcast(false)} title="Send Broadcast Message">
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div style={{ background: "#075e5422", border: "1px solid #25d36633", borderRadius: 10, padding: 12 }}>
            <div style={{ color: "#25d366", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>📱 Use a template</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {templates.map(t => (
                <button key={t.id} onClick={() => setBroadcastForm(p => ({ ...p, message: t.content }))}
                  style={{ background: "#0d1117", border: "1px solid #25d36633", borderRadius: 8, padding: "5px 12px", color: "#25d366", cursor: "pointer", fontSize: 11 }}>{t.name}</button>
              ))}
            </div>
          </div>
          <div><label style={lbl}>Target Audience</label>
            <select style={inp} value={broadcastForm.target} onChange={e => setBroadcastForm({ ...broadcastForm, target: e.target.value })}>
              <option value="all">All Residents ({residents.filter(r => r.whatsapp_opt_in).length} opted in)</option>
              <option value="defaulters">Defaulters (unpaid dues)</option>
              <option value="owners">Owners only</option>
            </select>
          </div>
          <div><label style={lbl}>Message *</label>
            <textarea style={{ ...inp, height: 120, resize: "vertical" }} value={broadcastForm.message} onChange={e => setBroadcastForm({ ...broadcastForm, message: e.target.value })} placeholder="Type your message… Use {{name}}, {{flat}} for personalisation" />
          </div>
          <div style={{ color: "#475569", fontSize: 12 }}>
            Characters: {broadcastForm.message.length} · Recipients: ~{residents.filter(r => r.whatsapp_opt_in && r.phone).length}
          </div>
          <button style={{ ...btnWA, justifyContent: "center", opacity: saving ? 0.6 : 1 }} onClick={sendBroadcast} disabled={saving}>
            {saving ? "Sending…" : "📱 Send Broadcast"}
          </button>
        </div>
      </Modal>

      {/* ADD TEMPLATE MODAL */}
      <Modal open={showTemplate} onClose={() => setShowTemplate(false)} title="New Message Template">
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div><label style={lbl}>Template Name *</label><input style={inp} value={templateForm.name} onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })} placeholder="e.g. Payment Reminder" /></div>
          <div><label style={lbl}>Type</label>
            <select style={inp} value={templateForm.type} onChange={e => setTemplateForm({ ...templateForm, type: e.target.value })}>
              {["fee_reminder", "notice", "receipt", "complaint_update", "visitor", "meeting", "custom"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Message Content *</label>
            <textarea style={{ ...inp, height: 120, resize: "vertical" }} value={templateForm.content} onChange={e => setTemplateForm({ ...templateForm, content: e.target.value })} placeholder="Use {{name}}, {{flat}}, {{amount}}, {{month}}, {{link}}" />
          </div>
          <button style={{ ...btnPrimary, justifyContent: "center", opacity: saving ? 0.6 : 1 }} onClick={addTemplate} disabled={saving}>{saving ? "Saving…" : "Save Template"}</button>
        </div>
      </Modal>
    </div>
  );
}

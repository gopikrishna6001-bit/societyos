// src/components/Finances.jsx
// Fully connected to Supabase — real invoices, payments, expenses, ledger

import { useState, useEffect } from "react";
import { supabase, SOCIETY_ID } from "../lib/supabase";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const months = () => {
  const list = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    list.push(d.toISOString().slice(0, 7));
  }
  return list;
};

// ─── Status colors ────────────────────────────────────────────────────────────
const statusStyle = {
  paid:      { bg: "#1b2d1b", color: "#4ade80", label: "Paid" },
  unpaid:    { bg: "#2d1b1b", color: "#f87171", label: "Unpaid" },
  partial:   { bg: "#2d2510", color: "#fbbf24", label: "Partial" },
  overdue:   { bg: "#2d1b1b", color: "#f87171", label: "Overdue" },
  cancelled: { bg: "#1e1e1e", color: "#64748b", label: "Cancelled" },
  pending:   { bg: "#2d2510", color: "#fbbf24", label: "Pending" },
  approved:  { bg: "#1b2d1b", color: "#4ade80", label: "Approved" },
  rejected:  { bg: "#2d1b1b", color: "#f87171", label: "Rejected" },
};

const Badge = ({ status }) => {
  const s = statusStyle[status] || { bg: "#1e1e1e", color: "#64748b", label: status };
  return (
    <span style={{ background: s.bg, color: s.color, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "uppercase", border: `1px solid ${s.color}22` }}>
      {s.label}
    </span>
  );
};

// ─── Modal ────────────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "85vh", overflow: "auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: 17 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 22 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const inp = { width: "100%", background: "#0d1117", border: "1px solid #2a2f45", borderRadius: 8, padding: "10px 12px", color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const lbl = { color: "#94a3b8", fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 5, display: "block" };
const btnPrimary = { background: "linear-gradient(135deg,#d97706,#f59e0b)", border: "none", borderRadius: 8, padding: "10px 18px", color: "#0d0f14", fontWeight: 700, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 8 };

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Finances() {
  const [tab, setTab] = useState("overview");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  // Data state
  const [society, setSociety] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [chargeHeads, setChargeHeads] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  // Modals
  const [payModal, setPayModal] = useState(null);     // invoice being paid
  const [expModal, setExpModal] = useState(false);    // add expense
  const [ledgerFlat, setLedgerFlat] = useState(null); // flat ledger modal
  const [ledgerData, setLedgerData] = useState([]);
  const [addChargeModal, setAddChargeModal] = useState(false);

  // Forms
  const [payForm, setPayForm] = useState({ amount: "", method: "upi", reference: "" });
  const [expForm, setExpForm] = useState({ description: "", amount: "", category: "Maintenance", expense_date: new Date().toISOString().slice(0, 10), notes: "" });
  const [chargeForm, setChargeForm] = useState({ name: "", type: "monthly", amount: "", gst_rate: 0 });

  const showMsg = (text, color = "#4ade80") => {
    setMsg({ text, color });
    setTimeout(() => setMsg(null), 3000);
  };

  // ─── Load data ──────────────────────────────────────────────────────────────
  const loadAll = async () => {
    setLoading(true);
    const [soc, inv, exp, ch, res] = await Promise.all([
      supabase.from("societies").select("*").eq("id", SOCIETY_ID).single(),
      supabase.from("invoices").select("*, payments(id,amount,method,paid_at,reference,status)").eq("society_id", SOCIETY_ID).eq("month", month).order("flat_number"),
      supabase.from("expenses").select("*").eq("society_id", SOCIETY_ID).order("expense_date", { ascending: false }),
      supabase.from("charge_heads").select("*").eq("society_id", SOCIETY_ID).eq("active", true),
      supabase.from("residents").select("id,name,flat_number,phone").eq("society_id", SOCIETY_ID).eq("status", "active"),
    ]);
    setSociety(soc.data);
    setInvoices(inv.data || []);
    setExpenses(exp.data || []);
    setChargeHeads(ch.data || []);
    setResidents(res.data || []);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [month]);

  // ─── Computed stats ──────────────────────────────────────────────────────────
  const paid = invoices.filter(i => i.status === "paid");
  const unpaid = invoices.filter(i => i.status !== "paid" && i.status !== "cancelled");
  const totalBilled = invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const totalCollected = invoices.reduce((s, i) => s + Number(i.amount_paid || 0), 0);
  const totalPending = invoices.reduce((s, i) => s + Number(i.balance_due || 0), 0);
  const pendingExpenses = expenses.filter(e => e.status === "pending");
  const approvedExpenses = expenses.filter(e => e.status === "approved" || e.status === "paid");
  const totalExpenses = approvedExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  // ─── Generate invoices for month ─────────────────────────────────────────────
  const generateInvoices = async () => {
    if (invoices.length > 0) { showMsg("Invoices already exist for this month", "#f87171"); return; }
    setSaving(true);
    const rows = residents.map(r => ({
      society_id: SOCIETY_ID,
      flat_number: r.flat_number,
      resident_id: r.id,
      month,
      due_date: `${month}-01`,
      line_items: chargeHeads.map(ch => ({ head: ch.name, amount: ch.amount, gst: 0 })),
      subtotal: chargeHeads.reduce((s, ch) => s + Number(ch.amount), 0),
      total_amount: chargeHeads.reduce((s, ch) => s + Number(ch.amount), 0),
      balance_due: chargeHeads.reduce((s, ch) => s + Number(ch.amount), 0),
      amount_paid: 0,
      status: "unpaid",
    }));
    const { error } = await supabase.from("invoices").insert(rows);
    if (error) showMsg(`Error: ${error.message}`, "#f87171");
    else { showMsg(`✓ ${rows.length} invoices generated for ${month}`); await loadAll(); }
    setSaving(false);
  };

  // ─── Record payment ──────────────────────────────────────────────────────────
  const recordPayment = async () => {
    if (!payForm.amount || !payModal) return;
    setSaving(true);
    const { error } = await supabase.from("payments").insert({
      invoice_id: payModal.id,
      flat_id: payModal.flat_id,
      resident_id: payModal.resident_id,
      society_id: SOCIETY_ID,
      amount: Number(payForm.amount),
      method: payForm.method,
      reference: payForm.reference,
      status: "success",
      paid_at: new Date().toISOString(),
    });
    if (error) { showMsg(`Error: ${error.message}`, "#f87171"); setSaving(false); return; }

    // Update invoice
    const newPaid = Number(payModal.amount_paid || 0) + Number(payForm.amount);
    const newBalance = Math.max(0, Number(payModal.balance_due || 0) - Number(payForm.amount));
    await supabase.from("invoices").update({
      amount_paid: newPaid,
      balance_due: newBalance,
      status: newBalance <= 0 ? "paid" : "partial",
      updated_at: new Date().toISOString(),
    }).eq("id", payModal.id);

    // Update society balance
    if (society) {
      await supabase.from("societies").update({ balance: (society.balance || 0) + Number(payForm.amount) }).eq("id", SOCIETY_ID);
    }

    showMsg(`✓ Payment of ${fmt(payForm.amount)} recorded for Flat ${payModal.flat_number}`);
    setPayModal(null);
    setPayForm({ amount: "", method: "upi", reference: "" });
    await loadAll();
    setSaving(false);
  };

  // ─── Add expense ─────────────────────────────────────────────────────────────
  const addExpense = async () => {
    if (!expForm.description || !expForm.amount) return;
    setSaving(true);
    const { error } = await supabase.from("expenses").insert({
      ...expForm,
      society_id: SOCIETY_ID,
      amount: Number(expForm.amount),
      net_amount: Number(expForm.amount),
      status: "pending",
      created_by: "Committee",
    });
    if (error) showMsg(`Error: ${error.message}`, "#f87171");
    else { showMsg("✓ Expense added — pending approval"); setExpModal(false); setExpForm({ description: "", amount: "", category: "Maintenance", expense_date: new Date().toISOString().slice(0, 10), notes: "" }); await loadAll(); }
    setSaving(false);
  };

  // ─── Approve / reject expense ─────────────────────────────────────────────────
  const approveExpense = async (id) => {
    await supabase.from("expenses").update({ status: "approved", approved_by: "Treasurer", approved_at: new Date().toISOString() }).eq("id", id);
    const exp = expenses.find(e => e.id === id);
    if (exp && society) await supabase.from("societies").update({ balance: (society.balance || 0) - Number(exp.amount) }).eq("id", SOCIETY_ID);
    showMsg("✓ Expense approved");
    await loadAll();
  };

  const rejectExpense = async (id) => {
    await supabase.from("expenses").update({ status: "rejected" }).eq("id", id);
    showMsg("Expense rejected", "#f87171");
    await loadAll();
  };

  // ─── Send WhatsApp reminder ──────────────────────────────────────────────────
  const sendReminder = async (invoice) => {
    const resident = residents.find(r => r.flat_number === invoice.flat_number);
    if (!resident?.phone) { showMsg("No phone number for this flat", "#f87171"); return; }
    // Log to whatsapp_log table — actual sending happens via Edge Function
    await supabase.from("whatsapp_log").insert({
      society_id: SOCIETY_ID,
      to_flat: invoice.flat_number,
      to_number: resident.phone,
      message: `Dear ${resident.name}, ₹${invoice.balance_due} maintenance due for ${invoice.month}. Flat ${invoice.flat_number}. Pay now: https://societyos.pages.dev`,
      type: "fee_reminder",
      status: "pending",
    });
    await supabase.from("invoices").update({ sent_wa: true }).eq("id", invoice.id);
    showMsg(`✓ Reminder queued for Flat ${invoice.flat_number}`);
    await loadAll();
  };

  // ─── Flat ledger ─────────────────────────────────────────────────────────────
  const openLedger = async (flat) => {
    const { data } = await supabase.from("invoices")
      .select("*, payments(id,amount,method,paid_at,reference,status)")
      .eq("society_id", SOCIETY_ID)
      .eq("flat_number", flat)
      .order("month", { ascending: false });
    setLedgerData(data || []);
    setLedgerFlat(flat);
  };

  // ─── Add charge head ─────────────────────────────────────────────────────────
  const addChargeHead = async () => {
    if (!chargeForm.name || !chargeForm.amount) return;
    await supabase.from("charge_heads").insert({ ...chargeForm, amount: Number(chargeForm.amount), society_id: SOCIETY_ID, mandatory: true });
    showMsg(`✓ Charge head "${chargeForm.name}" added`);
    setAddChargeModal(false);
    setChargeForm({ name: "", type: "monthly", amount: "", gst_rate: 0 });
    await loadAll();
  };

  // ─── Waive penalty ───────────────────────────────────────────────────────────
  const waivePenalty = async (invoice) => {
    const lateFee = Number(invoice.late_fee || 0);
    if (lateFee <= 0) { showMsg("No late fee on this invoice", "#f87171"); return; }
    await supabase.from("invoices").update({ late_fee: 0, penalty_waived: true, balance_due: Math.max(0, Number(invoice.balance_due) - lateFee) }).eq("id", invoice.id);
    showMsg(`✓ Late fee of ${fmt(lateFee)} waived for Flat ${invoice.flat_number}`);
    await loadAll();
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#64748b", fontSize: 14 }}>
      Loading financial data…
    </div>
  );

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: "#e2e8f0" }}>
      {/* Toast */}
      {msg && (
        <div style={{ position: "fixed", top: 20, right: 20, background: "#161b27", border: `1px solid ${msg.color}44`, borderRadius: 10, padding: "12px 20px", color: msg.color, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
          {msg.text}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ color: "#e2e8f0", fontSize: 24, fontFamily: "'Playfair Display',serif", margin: "0 0 4px" }}>Financial Ledger</h2>
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Fully transparent — every paisa tracked</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select value={month} onChange={e => setMonth(e.target.value)} style={{ ...inp, width: "auto", padding: "8px 12px", fontSize: 13 }}>
            {months().map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button style={btnPrimary} onClick={() => setExpModal(true)}>+ Add Expense</button>
        </div>
      </div>

      {/* Balance card */}
      <div style={{ background: "linear-gradient(135deg,#1b2d1b,#161b27)", border: "1px solid #4ade8033", borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ color: "#64748b", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>Society Fund Balance</div>
            <div style={{ color: "#4ade80", fontSize: 32, fontWeight: 900, margin: "6px 0" }}>{fmt(society?.balance)}</div>
            <div style={{ color: "#475569", fontSize: 12 }}>{month} — Live</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 8, flex: 2 }}>
            {[
              { l: "Billed", v: fmt(totalBilled), c: "#e2e8f0" },
              { l: "Collected", v: fmt(totalCollected), c: "#4ade80" },
              { l: "Outstanding", v: fmt(totalPending), c: "#f87171" },
              { l: "Expenses", v: fmt(totalExpenses), c: "#fbbf24" },
              { l: "Paid Flats", v: `${paid.length}/${invoices.length}`, c: "#4ade80" },
              { l: "Pending Approval", v: pendingExpenses.length, c: "#fb923c" },
            ].map((s, i) => (
              <div key={i} style={{ background: "#0d1117", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ color: "#475569", fontSize: 10, marginBottom: 3 }}>{s.l}</div>
                <div style={{ color: s.c, fontSize: 15, fontWeight: 800 }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 5, marginBottom: 18, background: "#0d1117", borderRadius: 10, padding: 4, width: "fit-content", overflowX: "auto" }}>
        {["overview","collections","expenses","charge heads","history"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? "#1e2535" : "none", border: tab === t ? "1px solid #2a2f45" : "none", borderRadius: 8, padding: "7px 14px", color: tab === t ? "#e2e8f0" : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: 600, textTransform: "capitalize", whiteSpace: "nowrap" }}>{t}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <div>
          {invoices.length === 0 ? (
            <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 14, padding: 40, textAlign: "center" }}>
              <div style={{ color: "#475569", fontSize: 14, marginBottom: 16 }}>No invoices for {month} yet.</div>
              <button style={{ ...btnPrimary, margin: "0 auto", justifyContent: "center" }} onClick={generateInvoices} disabled={saving}>
                {saving ? "Generating…" : `Generate Invoices for ${month}`}
              </button>
            </div>
          ) : (
            <div>
              {/* Collection progress */}
              <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 18, marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600 }}>Collection Progress</span>
                  <span style={{ color: "#4ade80", fontSize: 13, fontWeight: 700 }}>{Math.round((paid.length / invoices.length) * 100)}%</span>
                </div>
                <div style={{ height: 8, background: "#0d1117", borderRadius: 4, marginBottom: 8 }}>
                  <div style={{ height: "100%", width: `${(paid.length / invoices.length) * 100}%`, background: "linear-gradient(90deg,#4ade80,#22c55e)", borderRadius: 4, transition: "width 0.5s" }} />
                </div>
                <div style={{ color: "#64748b", fontSize: 12 }}>{paid.length} of {invoices.length} flats paid · {unpaid.length} pending</div>
              </div>

              {/* Send reminders to all defaulters */}
              {unpaid.length > 0 && (
                <div style={{ background: "#2d1b1b", border: "1px solid #f8717133", borderRadius: 12, padding: 14, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ color: "#f87171", fontSize: 13, fontWeight: 600 }}>{unpaid.length} flats have not paid {month}</div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>Outstanding: {fmt(totalPending)}</div>
                  </div>
                  <button onClick={async () => { for (const inv of unpaid) await sendReminder(inv); }} style={{ background: "#2d1b1b", border: "1px solid #f8717133", borderRadius: 8, padding: "8px 16px", color: "#f87171", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                    📱 Send WhatsApp Reminders to All
                  </button>
                </div>
              )}

              {/* Invoice list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {invoices.map(inv => (
                  <div key={inv.id} style={{ background: "#161b27", border: `1px solid ${inv.status === "paid" ? "#4ade8022" : "#2a2f45"}`, borderRadius: 12, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ flex: 1, cursor: "pointer" }} onClick={() => openLedger(inv.flat_number)}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                        <span style={{ color: "#fbbf24", fontWeight: 800, fontSize: 14 }}>Flat {inv.flat_number}</span>
                        <Badge status={inv.status} />
                        {inv.sent_wa && <span style={{ color: "#25d366", fontSize: 10, fontWeight: 700 }}>✓ WA Sent</span>}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 12 }}>
                        Due: {inv.due_date} · Billed: {fmt(inv.total_amount)} · Paid: {fmt(inv.amount_paid)} · Balance: {fmt(inv.balance_due)}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      {inv.status !== "paid" && (
                        <>
                          <button onClick={() => { setPayModal(inv); setPayForm({ amount: String(inv.balance_due), method: "upi", reference: "" }); }}
                            style={{ background: "#1b2d1b", border: "1px solid #4ade8033", borderRadius: 7, padding: "6px 12px", color: "#4ade80", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                            Mark Paid
                          </button>
                          {!inv.sent_wa && (
                            <button onClick={() => sendReminder(inv)}
                              style={{ background: "#1b2535", border: "1px solid #38bdf833", borderRadius: 7, padding: "6px 12px", color: "#38bdf8", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                              📱 Remind
                            </button>
                          )}
                          {Number(inv.late_fee) > 0 && !inv.penalty_waived && (
                            <button onClick={() => waivePenalty(inv)}
                              style={{ background: "#2d2510", border: "1px solid #fbbf2433", borderRadius: 7, padding: "6px 12px", color: "#fbbf24", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                              Waive Fee
                            </button>
                          )}
                        </>
                      )}
                      <button onClick={() => openLedger(inv.flat_number)}
                        style={{ background: "#0d1117", border: "1px solid #2a2f45", borderRadius: 7, padding: "6px 12px", color: "#64748b", cursor: "pointer", fontSize: 12 }}>
                        History
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── COLLECTIONS ── */}
      {tab === "collections" && (
        <div>
          <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 100px 100px 100px 120px", padding: "10px 16px", background: "#0d1117", borderBottom: "1px solid #2a2f45" }}>
              {["Flat","Resident","Billed","Paid","Balance","Status"].map(h => (
                <span key={h} style={{ color: "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>
            {invoices.map((inv, i) => {
              const res = residents.find(r => r.flat_number === inv.flat_number);
              return (
                <div key={inv.id} style={{ display: "grid", gridTemplateColumns: "80px 1fr 100px 100px 100px 120px", padding: "12px 16px", borderBottom: i < invoices.length - 1 ? "1px solid #1e2535" : "none", alignItems: "center", cursor: "pointer" }} onClick={() => openLedger(inv.flat_number)}>
                  <span style={{ color: "#fbbf24", fontWeight: 700, fontSize: 13 }}>{inv.flat_number}</span>
                  <div>
                    <div style={{ color: "#e2e8f0", fontSize: 13 }}>{res?.name || "—"}</div>
                    <div style={{ color: "#475569", fontSize: 11 }}>{res?.phone}</div>
                  </div>
                  <span style={{ color: "#e2e8f0", fontSize: 13 }}>{fmt(inv.total_amount)}</span>
                  <span style={{ color: "#4ade80", fontSize: 13, fontWeight: 600 }}>{fmt(inv.amount_paid)}</span>
                  <span style={{ color: Number(inv.balance_due) > 0 ? "#f87171" : "#4ade80", fontSize: 13, fontWeight: 700 }}>{fmt(inv.balance_due)}</span>
                  <Badge status={inv.status} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── EXPENSES ── */}
      {tab === "expenses" && (
        <div>
          {pendingExpenses.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: "#fbbf24", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>⏳ Pending Approval</div>
              {pendingExpenses.map(e => (
                <div key={e.id} style={{ background: "#161b27", border: "2px solid #fbbf2433", borderRadius: 12, padding: 16, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600 }}>{e.description}</div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>{e.category} · {e.expense_date}</div>
                    {e.notes && <div style={{ color: "#475569", fontSize: 12, marginTop: 2 }}>{e.notes}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ color: "#fbbf24", fontSize: 20, fontWeight: 900 }}>{fmt(e.amount)}</span>
                    <button onClick={() => approveExpense(e.id)} style={{ background: "#1b2d1b", border: "1px solid #4ade8033", borderRadius: 7, padding: "7px 14px", color: "#4ade80", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>✓ Approve</button>
                    <button onClick={() => rejectExpense(e.id)} style={{ background: "#2d1b1b", border: "1px solid #f8717133", borderRadius: 7, padding: "7px 14px", color: "#f87171", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>✗ Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ color: "#4ade80", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>✓ Approved Expenses</div>
          {approvedExpenses.length === 0 && <div style={{ color: "#475569", fontSize: 13, padding: 20, textAlign: "center" }}>No approved expenses yet</div>}
          {approvedExpenses.map(e => (
            <div key={e.id} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 10, padding: "12px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{e.description}</div>
                <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>{e.category} · {e.expense_date} · {e.approved_by}</div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 700 }}>{fmt(e.amount)}</span>
                <Badge status={e.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CHARGE HEADS ── */}
      {tab === "charge heads" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ color: "#64748b", fontSize: 13 }}>These are the line items on every invoice</div>
            <button style={btnPrimary} onClick={() => setAddChargeModal(true)}>+ Add Charge</button>
          </div>
          {chargeHeads.map(ch => (
            <div key={ch.id} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 10, padding: "14px 18px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600 }}>{ch.name}</div>
                <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>{ch.type} · {ch.mandatory ? "Mandatory" : "Optional"} · GST: {ch.gst_rate}%</div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ color: "#fbbf24", fontSize: 20, fontWeight: 900 }}>{fmt(ch.amount)}</span>
                <button onClick={async () => { await supabase.from("charge_heads").update({ active: false }).eq("id", ch.id); await loadAll(); }}
                  style={{ background: "#2d1b1b", border: "1px solid #f8717133", borderRadius: 7, padding: "5px 10px", color: "#f87171", cursor: "pointer", fontSize: 11 }}>
                  Remove
                </button>
              </div>
            </div>
          ))}
          <div style={{ background: "#0d1117", borderRadius: 10, padding: 14, marginTop: 10 }}>
            <div style={{ color: "#64748b", fontSize: 12, marginBottom: 6 }}>Total per flat per month</div>
            <div style={{ color: "#4ade80", fontSize: 24, fontWeight: 900 }}>{fmt(chargeHeads.reduce((s, c) => s + Number(c.amount), 0))}</div>
          </div>
        </div>
      )}

      {/* ── HISTORY ── */}
      {tab === "history" && (
        <div>
          <div style={{ color: "#64748b", fontSize: 13, marginBottom: 14 }}>Click any flat number to see full payment history</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 10 }}>
            {[...new Set(residents.map(r => r.flat_number))].sort().map(flat => (
              <button key={flat} onClick={() => openLedger(flat)}
                style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 10, padding: "14px 10px", cursor: "pointer", textAlign: "center" }}>
                <div style={{ color: "#fbbf24", fontSize: 16, fontWeight: 800 }}>Flat {flat}</div>
                <div style={{ color: "#475569", fontSize: 10, marginTop: 4 }}>View ledger →</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── PAYMENT MODAL ── */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={`Record Payment — Flat ${payModal?.flat_number}`}>
        {payModal && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "#0d1117", borderRadius: 10, padding: 14 }}>
              <div style={{ color: "#64748b", fontSize: 12 }}>Outstanding balance</div>
              <div style={{ color: "#f87171", fontSize: 24, fontWeight: 900 }}>{fmt(payModal.balance_due)}</div>
            </div>
            <div><label style={lbl}>Amount</label><input style={inp} type="number" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} placeholder="Enter amount" /></div>
            <div><label style={lbl}>Payment Method</label>
              <select style={inp} value={payForm.method} onChange={e => setPayForm({ ...payForm, method: e.target.value })}>
                {["upi","card","netbanking","cash","cheque","neft"].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Reference / Transaction ID</label><input style={inp} value={payForm.reference} onChange={e => setPayForm({ ...payForm, reference: e.target.value })} placeholder="UPI ref / cheque no" /></div>
            <button style={{ ...btnPrimary, justifyContent: "center", opacity: saving ? 0.6 : 1 }} onClick={recordPayment} disabled={saving}>
              {saving ? "Recording…" : "Confirm Payment"}
            </button>
          </div>
        )}
      </Modal>

      {/* ── ADD EXPENSE MODAL ── */}
      <Modal open={expModal} onClose={() => setExpModal(false)} title="Add Expense">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={lbl}>Description</label><input style={inp} value={expForm.description} onChange={e => setExpForm({ ...expForm, description: e.target.value })} placeholder="e.g. Security guard salary" /></div>
          <div><label style={lbl}>Amount</label><input style={inp} type="number" value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: e.target.value })} placeholder="₹" /></div>
          <div><label style={lbl}>Category</label>
            <select style={inp} value={expForm.category} onChange={e => setExpForm({ ...expForm, category: e.target.value })}>
              {["Maintenance","Security","Utilities","Landscaping","Admin","Salary","Repairs","Equipment","Other"].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Date</label><input type="date" style={inp} value={expForm.expense_date} onChange={e => setExpForm({ ...expForm, expense_date: e.target.value })} /></div>
          <div><label style={lbl}>Notes (optional)</label><textarea style={{ ...inp, height: 70, resize: "vertical" }} value={expForm.notes} onChange={e => setExpForm({ ...expForm, notes: e.target.value })} /></div>
          <button style={{ ...btnPrimary, justifyContent: "center", opacity: saving ? 0.6 : 1 }} onClick={addExpense} disabled={saving}>
            {saving ? "Adding…" : "Add Expense (Pending Approval)"}
          </button>
        </div>
      </Modal>

      {/* ── ADD CHARGE HEAD MODAL ── */}
      <Modal open={addChargeModal} onClose={() => setAddChargeModal(false)} title="Add Charge Head">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={lbl}>Name</label><input style={inp} value={chargeForm.name} onChange={e => setChargeForm({ ...chargeForm, name: e.target.value })} placeholder="e.g. Water Charges" /></div>
          <div><label style={lbl}>Amount (₹)</label><input type="number" style={inp} value={chargeForm.amount} onChange={e => setChargeForm({ ...chargeForm, amount: e.target.value })} placeholder="200" /></div>
          <div><label style={lbl}>Type</label>
            <select style={inp} value={chargeForm.type} onChange={e => setChargeForm({ ...chargeForm, type: e.target.value })}>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
              <option value="one-time">One-time</option>
            </select>
          </div>
          <div><label style={lbl}>GST %</label><input type="number" style={inp} value={chargeForm.gst_rate} onChange={e => setChargeForm({ ...chargeForm, gst_rate: e.target.value })} placeholder="0" /></div>
          <button style={{ ...btnPrimary, justifyContent: "center" }} onClick={addChargeHead}>Add Charge Head</button>
        </div>
      </Modal>

      {/* ── FLAT LEDGER MODAL ── */}
      <Modal open={!!ledgerFlat} onClose={() => setLedgerFlat(null)} title={`Flat ${ledgerFlat} — Full Ledger`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ledgerData.length === 0 && <div style={{ color: "#475569", textAlign: "center", padding: 20 }}>No invoice history</div>}
          {ledgerData.map(inv => (
            <div key={inv.id} style={{ background: "#0d1117", borderRadius: 10, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{inv.month}</span>
                <Badge status={inv.status} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                {[{ l: "Billed", v: fmt(inv.total_amount), c: "#e2e8f0" }, { l: "Paid", v: fmt(inv.amount_paid), c: "#4ade80" }, { l: "Balance", v: fmt(inv.balance_due), c: Number(inv.balance_due) > 0 ? "#f87171" : "#4ade80" }].map((x, i) => (
                  <div key={i} style={{ background: "#161b27", borderRadius: 7, padding: "8px 10px", textAlign: "center" }}>
                    <div style={{ color: x.c, fontSize: 14, fontWeight: 700 }}>{x.v}</div>
                    <div style={{ color: "#475569", fontSize: 10 }}>{x.l}</div>
                  </div>
                ))}
              </div>
              {inv.payments?.filter(p => p.status === "success").map(p => (
                <div key={p.id} style={{ background: "#1b2d1b", borderRadius: 7, padding: "7px 10px", fontSize: 12, color: "#4ade80", display: "flex", justifyContent: "space-between" }}>
                  <span>✓ {fmt(p.amount)} via {p.method?.toUpperCase()}</span>
                  <span style={{ color: "#475569" }}>{p.paid_at?.slice(0, 10)} {p.reference && `· ${p.reference}`}</span>
                </div>
              ))}
              {inv.late_fee > 0 && <div style={{ color: "#f87171", fontSize: 11, marginTop: 6 }}>Late fee: {fmt(inv.late_fee)}{inv.penalty_waived ? " (waived)" : ""}</div>}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

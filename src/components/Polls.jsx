// src/components/Polls.jsx
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

const COLORS = ["#818cf8", "#4ade80", "#fbbf24", "#f87171", "#38bdf8", "#f472b6", "#fb923c", "#a78bfa"];

export default function Polls() {
  const [polls, setPolls] = useState([]);
  const [myVotes, setMyVotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState({ question: "", description: "", options: ["", ""], anonymous: false, deadline: "", one_vote_per_flat: true });

  const toast = (text, color = "#4ade80") => { setMsg({ text, color }); setTimeout(() => setMsg(null), 3000); };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("polls").select("*").eq("society_id", SOCIETY_ID).order("created_at", { ascending: false });
    setPolls(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createPoll = async () => {
    const validOptions = form.options.filter(o => o.trim());
    if (!form.question || validOptions.length < 2) { toast("Question and at least 2 options required", "#f87171"); return; }
    setSaving(true);
    const { error } = await supabase.from("polls").insert({
      society_id: SOCIETY_ID,
      question: form.question,
      description: form.description,
      options: validOptions,
      votes: new Array(validOptions.length).fill(0),
      total: 0,
      anonymous: form.anonymous,
      one_vote_per_flat: form.one_vote_per_flat,
      deadline: form.deadline || null,
      status: "active",
      created_by: "Committee",
    });
    if (error) { toast(error.message, "#f87171"); setSaving(false); return; }
    toast("✓ Poll created");
    setShowCreate(false);
    setForm({ question: "", description: "", options: ["", ""], anonymous: false, deadline: "", one_vote_per_flat: true });
    await load();
    setSaving(false);
  };

  const vote = async (poll, optionIdx) => {
    if (myVotes[poll.id] !== undefined) { toast("You already voted on this poll", "#f87171"); return; }
    if (poll.status !== "active") { toast("This poll is closed", "#f87171"); return; }
    setMyVotes(p => ({ ...p, [poll.id]: optionIdx }));
    const newVotes = [...(poll.votes || new Array(poll.options.length).fill(0))];
    newVotes[optionIdx] = (newVotes[optionIdx] || 0) + 1;
    await supabase.from("polls").update({ votes: newVotes, total: (poll.total || 0) + 1 }).eq("id", poll.id);
    setPolls(p => p.map(x => x.id === poll.id ? { ...x, votes: newVotes, total: (x.total || 0) + 1 } : x));
    toast("✓ Vote recorded");
  };

  const closePoll = async (id) => {
    await supabase.from("polls").update({ status: "closed" }).eq("id", id);
    setPolls(p => p.map(x => x.id === id ? { ...x, status: "closed" } : x));
    toast("Poll closed");
  };

  const deletePoll = async (id) => {
    await supabase.from("polls").delete().eq("id", id);
    setPolls(p => p.filter(x => x.id !== id));
    toast("Poll deleted");
  };

  const filtered = polls.filter(p => filter === "all" || p.status === filter);
  const activePollCount = polls.filter(p => p.status === "active").length;

  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", color: "#e2e8f0" }}>
      {msg && <div style={{ position: "fixed", top: 20, right: 20, background: "#161b27", border: `1px solid ${msg.color}44`, borderRadius: 10, padding: "12px 20px", color: msg.color, fontSize: 13, fontWeight: 600, zIndex: 9999 }}>{msg.text}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ color: "#e2e8f0", fontSize: 24, fontFamily: "'Playfair Display',serif", margin: "0 0 4px" }}>Polls & Voting</h2>
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>{activePollCount} active polls · democratic decision making</p>
        </div>
        <button style={btnPrimary} onClick={() => setShowCreate(true)}>+ Create Poll</button>
      </div>

      <div style={{ display: "flex", gap: 5, marginBottom: 18, background: "#0d1117", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {["active", "closed", "all"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? "#1e2535" : "none", border: filter === f ? "1px solid #2a2f45" : "none", borderRadius: 8, padding: "7px 14px", color: filter === f ? "#e2e8f0" : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>{f}</button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading polls…</div> : filtered.length === 0 ? (
        <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 40, textAlign: "center", color: "#475569" }}>
          No {filter} polls. {filter === "active" && "Create one to get community input!"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filtered.map(poll => {
            const total = poll.total || 0;
            const voted = myVotes[poll.id] !== undefined;
            const showResults = voted || poll.status === "closed";
            const deadline = poll.deadline ? new Date(poll.deadline) : null;
            const expired = deadline && deadline < new Date();
            return (
              <div key={poll.id} style={{ background: "#161b27", border: `1px solid ${poll.status === "active" ? "#818cf833" : "#2a2f45"}`, borderRadius: 14, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ background: poll.status === "active" ? "#1b1b3a" : "#1e2535", color: poll.status === "active" ? "#818cf8" : "#64748b", borderRadius: 20, padding: "2px 10px", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{poll.status}</span>
                      {poll.anonymous && <span style={{ color: "#475569", fontSize: 11 }}>🔒 Anonymous</span>}
                      {deadline && <span style={{ color: expired ? "#f87171" : "#64748b", fontSize: 11 }}>⏰ {expired ? "Expired" : deadline.toLocaleDateString("en-IN")}</span>}
                    </div>
                    <div style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{poll.question}</div>
                    {poll.description && <div style={{ color: "#64748b", fontSize: 13 }}>{poll.description}</div>}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ color: "#818cf8", fontSize: 22, fontWeight: 900 }}>{total}</div>
                    <div style={{ color: "#475569", fontSize: 10 }}>votes</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                  {(poll.options || []).map((opt, idx) => {
                    const count = (poll.votes || [])[idx] || 0;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    const isMyVote = myVotes[poll.id] === idx;
                    const color = COLORS[idx % COLORS.length];
                    return (
                      <div key={idx} onClick={() => !voted && poll.status === "active" && vote(poll, idx)}
                        style={{ background: isMyVote ? `${color}18` : "#0d1117", border: `1px solid ${isMyVote ? color : "#2a2f45"}`, borderRadius: 10, padding: "10px 14px", cursor: (!voted && poll.status === "active") ? "pointer" : "default", transition: "all 0.15s" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showResults ? 6 : 0 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {isMyVote && <span style={{ color, fontSize: 12 }}>✓</span>}
                            <span style={{ color: isMyVote ? color : "#e2e8f0", fontSize: 14, fontWeight: isMyVote ? 700 : 400 }}>{opt}</span>
                          </div>
                          {showResults && <span style={{ color, fontSize: 14, fontWeight: 700 }}>{pct}% <span style={{ color: "#475569", fontWeight: 400 }}>({count})</span></span>}
                        </div>
                        {showResults && (
                          <div style={{ height: 6, background: "#1e2535", borderRadius: 3 }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.5s" }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!voted && poll.status === "active" && (
                  <div style={{ color: "#475569", fontSize: 12, marginBottom: 8 }}>Tap an option to vote · {poll.one_vote_per_flat ? "One vote per flat" : "One vote per person"}</div>
                )}
                {voted && <div style={{ color: "#4ade80", fontSize: 12, marginBottom: 8 }}>✓ You voted · Results shown above</div>}

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {poll.status === "active" && (
                    <button onClick={() => closePoll(poll.id)} style={{ background: "#2d2510", border: "1px solid #fbbf2433", borderRadius: 8, padding: "6px 12px", color: "#fbbf24", cursor: "pointer", fontSize: 12 }}>Close Poll</button>
                  )}
                  <button onClick={() => deletePoll(poll.id)} style={{ background: "#2d1b1b", border: "1px solid #f8717133", borderRadius: 8, padding: "6px 12px", color: "#f87171", cursor: "pointer", fontSize: 12 }}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Poll">
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div><label style={lbl}>Question *</label><input style={inp} value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} placeholder="e.g. Should we install CCTV in parking?" /></div>
          <div><label style={lbl}>Description (optional)</label><input style={inp} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Add context…" /></div>
          <div>
            <label style={lbl}>Options (minimum 2) *</label>
            {form.options.map((opt, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input style={{ ...inp }} value={opt} onChange={e => { const o = [...form.options]; o[i] = e.target.value; setForm({ ...form, options: o }); }} placeholder={`Option ${i + 1}`} />
                {form.options.length > 2 && <button onClick={() => setForm({ ...form, options: form.options.filter((_, idx) => idx !== i) })} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 20 }}>×</button>}
              </div>
            ))}
            {form.options.length < 6 && <button onClick={() => setForm({ ...form, options: [...form.options, ""] })} style={{ background: "#1e2535", border: "1px solid #2a2f45", borderRadius: 8, padding: "7px 14px", color: "#64748b", cursor: "pointer", fontSize: 12 }}>+ Add Option</button>}
          </div>
          <div><label style={lbl}>Deadline (optional)</label><input type="datetime-local" style={inp} value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} /></div>
          <div style={{ display: "flex", gap: 16 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center", color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={form.anonymous} onChange={e => setForm({ ...form, anonymous: e.target.checked })} /> Anonymous voting
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center", color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={form.one_vote_per_flat} onChange={e => setForm({ ...form, one_vote_per_flat: e.target.checked })} /> One vote per flat
            </label>
          </div>
          <button style={{ ...btnPrimary, justifyContent: "center", opacity: saving ? 0.6 : 1 }} onClick={createPoll} disabled={saving}>{saving ? "Creating…" : "Create Poll"}</button>
        </div>
      </Modal>
    </div>
  );
}

// src/components/Volunteers.jsx
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

export default function Volunteers() {
  const [tab, setTab] = useState("volunteers");
  const [volunteers, setVolunteers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [appreciations, setAppreciations] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignJoins, setCampaignJoins] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const [showAddVolunteer, setShowAddVolunteer] = useState(false);
  const [showAddTask, setShowAddTask] = useState(null);
  const [showAppreciate, setShowAppreciate] = useState(null);
  const [showAddCampaign, setShowAddCampaign] = useState(false);
  const [showVolProfile, setShowVolProfile] = useState(null);

  const [volForm, setVolForm] = useState({ flat_number: "", block: "A" });
  const [taskForm, setTaskForm] = useState({ task: "", category: "Maintenance", points: 25, due_date: "" });
  const [appForm, setAppForm] = useState({ from_flat: "", message: "" });
  const [campForm, setCampForm] = useState({ title: "", type: "social", description: "", date: "", time: "10:00", venue: "", goal: "", target_count: 20, points_reward: 30 });

  const toast = (text, color = "#4ade80") => { setMsg({ text, color }); setTimeout(() => setMsg(null), 3000); };

  const load = async () => {
    setLoading(true);
    const [vol, tsk, app, camp, joins, res] = await Promise.all([
      supabase.from("volunteers").select("*, residents(name, flat_number, phone)").eq("society_id", SOCIETY_ID).order("hero_points", { ascending: false }),
      supabase.from("volunteer_tasks").select("*").eq("society_id", SOCIETY_ID).order("created_at", { ascending: false }),
      supabase.from("appreciations").select("*").eq("society_id", SOCIETY_ID).order("created_at", { ascending: false }),
      supabase.from("campaigns").select("*").eq("society_id", SOCIETY_ID).order("date", { ascending: false }),
      supabase.from("campaign_joins").select("*"),
      supabase.from("residents").select("id, name, flat_number").eq("society_id", SOCIETY_ID).eq("status", "active"),
    ]);
    setVolunteers(vol.data || []);
    setTasks(tsk.data || []);
    setAppreciations(app.data || []);
    setCampaigns(camp.data || []);
    setCampaignJoins(joins.data || []);
    setResidents(res.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addVolunteer = async () => {
    if (!volForm.flat_number) { toast("Flat number required", "#f87171"); return; }
    const resident = residents.find(r => r.flat_number === volForm.flat_number);
    if (!resident) { toast("Resident not found for this flat", "#f87171"); return; }
    setSaving(true);
    await supabase.from("volunteers").insert({
      society_id: SOCIETY_ID,
      resident_id: resident.id,
      block: volForm.block,
      hero_points: 0,
      streak_weeks: 0,
      completed_tasks: 0,
      badges: [],
      status: "active",
    });
    toast("✓ Volunteer enrolled");
    setShowAddVolunteer(false);
    setVolForm({ flat_number: "", block: "A" });
    await load();
    setSaving(false);
  };

  const addTask = async () => {
    if (!taskForm.task || !showAddTask) return;
    setSaving(true);
    await supabase.from("volunteer_tasks").insert({
      volunteer_id: showAddTask.id,
      society_id: SOCIETY_ID,
      task: taskForm.task,
      category: taskForm.category,
      points: taskForm.points,
      due_date: taskForm.due_date || null,
      status: "pending",
    });
    toast("✓ Task assigned");
    setShowAddTask(null);
    setTaskForm({ task: "", category: "Maintenance", points: 25, due_date: "" });
    await load();
    setSaving(false);
  };

  const completeTask = async (task) => {
    const vol = volunteers.find(v => v.id === task.volunteer_id);
    if (!vol) return;
    await supabase.from("volunteer_tasks").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", task.id);
    await supabase.from("volunteers").update({
      hero_points: (vol.hero_points || 0) + task.points,
      completed_tasks: (vol.completed_tasks || 0) + 1,
    }).eq("id", vol.id);
    toast(`✓ Task completed — +${task.points} hero points!`);
    await load();
  };

  const addAppreciation = async () => {
    if (!appForm.message || !showAppreciate) return;
    setSaving(true);
    await supabase.from("appreciations").insert({
      society_id: SOCIETY_ID,
      volunteer_id: showAppreciate.id,
      from_flat: appForm.from_flat,
      from_name: appForm.from_flat ? `Flat ${appForm.from_flat}` : "Anonymous",
      message: appForm.message,
      points_added: 20,
    });
    await supabase.from("volunteers").update({
      hero_points: (showAppreciate.hero_points || 0) + 20,
    }).eq("id", showAppreciate.id);
    toast("✓ Appreciation sent — +20 hero points!");
    setShowAppreciate(null);
    setAppForm({ from_flat: "", message: "" });
    await load();
    setSaving(false);
  };

  const addCampaign = async () => {
    if (!campForm.title || !campForm.date) { toast("Title and date required", "#f87171"); return; }
    setSaving(true);
    await supabase.from("campaigns").insert({ ...campForm, society_id: SOCIETY_ID, joined_count: 0, status: "upcoming" });
    toast("✓ Campaign created");
    setShowAddCampaign(false);
    setCampForm({ title: "", type: "social", description: "", date: "", time: "10:00", venue: "", goal: "", target_count: 20, points_reward: 30 });
    await load();
    setSaving(false);
  };

  const joinCampaign = async (campaign) => {
    setSaving(true);
    await supabase.from("campaign_joins").insert({ campaign_id: campaign.id, resident_id: null });
    await supabase.from("campaigns").update({ joined_count: (campaign.joined_count || 0) + 1 }).eq("id", campaign.id);
    toast("✓ Joined campaign!");
    await load();
    setSaving(false);
  };

  const getBadgeColor = (pts) => pts >= 400 ? "#fbbf24" : pts >= 200 ? "#818cf8" : "#4ade80";
  const getRankLabel = (i) => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;

  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", color: "#e2e8f0" }}>
      {msg && <div style={{ position: "fixed", top: 20, right: 20, background: "#161b27", border: `1px solid ${msg.color}44`, borderRadius: 10, padding: "12px 20px", color: msg.color, fontSize: 13, fontWeight: 600, zIndex: 9999 }}>{msg.text}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ color: "#e2e8f0", fontSize: 24, fontFamily: "'Playfair Display',serif", margin: "0 0 4px" }}>Volunteers & Campaigns</h2>
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>{volunteers.length} heroes · {campaigns.filter(c => c.status === "upcoming").length} upcoming events</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {tab === "volunteers" && <button style={btnPrimary} onClick={() => setShowAddVolunteer(true)}>+ Enrol Volunteer</button>}
          {tab === "campaigns" && <button style={btnPrimary} onClick={() => setShowAddCampaign(true)}>+ Create Campaign</button>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 5, marginBottom: 18, background: "#0d1117", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {["volunteers", "leaderboard", "appreciation wall", "campaigns"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? "#1e2535" : "none", border: tab === t ? "1px solid #2a2f45" : "none", borderRadius: 8, padding: "7px 14px", color: tab === t ? "#e2e8f0" : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: 600, textTransform: "capitalize", whiteSpace: "nowrap" }}>{t}</button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading…</div> : (
        <>
          {/* VOLUNTEERS TAB */}
          {tab === "volunteers" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {volunteers.length === 0 && <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 40, textAlign: "center", color: "#475569" }}>No volunteers yet. Enrol residents who help the community!</div>}
              {volunteers.map(v => {
                const volTasks = tasks.filter(t => t.volunteer_id === v.id);
                const pendingTasks = volTasks.filter(t => t.status === "pending");
                const completedTasks = volTasks.filter(t => t.status === "completed");
                const ptColor = getBadgeColor(v.hero_points || 0);
                return (
                  <div key={v.id} style={{ background: "#161b27", border: `1px solid ${ptColor}22`, borderRadius: 14, padding: 18 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, background: `${ptColor}22`, border: `2px solid ${ptColor}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: ptColor, flexShrink: 0 }}>
                        {v.residents?.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "??"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 700 }}>{v.residents?.name || "Unknown"}</div>
                        <div style={{ color: "#fbbf24", fontSize: 12 }}>Flat {v.residents?.flat_number} · Block {v.block}</div>
                        <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                          {(v.badges || []).map((b, i) => <span key={i} style={{ background: "#0d1117", borderRadius: 20, padding: "1px 8px", color: "#94a3b8", fontSize: 10 }}>{b}</span>)}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ color: ptColor, fontSize: 22, fontWeight: 900 }}>{v.hero_points || 0}</div>
                        <div style={{ color: "#475569", fontSize: 9, fontWeight: 700 }}>HERO PTS</div>
                        {v.streak_weeks > 0 && <div style={{ color: "#fb923c", fontSize: 10 }}>🔥 {v.streak_weeks}w streak</div>}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                      {[{ l: "Completed", v: completedTasks.length, c: "#4ade80" }, { l: "Pending", v: pendingTasks.length, c: "#fbbf24" }, { l: "Total Tasks", v: volTasks.length, c: "#818cf8" }].map((s, i) => (
                        <div key={i} style={{ background: "#0d1117", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                          <div style={{ color: s.c, fontSize: 16, fontWeight: 800 }}>{s.v}</div>
                          <div style={{ color: "#475569", fontSize: 10 }}>{s.l}</div>
                        </div>
                      ))}
                    </div>

                    {pendingTasks.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Pending Tasks</div>
                        {pendingTasks.map(t => (
                          <div key={t.id} style={{ background: "#0d1117", borderRadius: 8, padding: "8px 12px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ color: "#e2e8f0", fontSize: 13 }}>{t.task}</div>
                              <div style={{ color: "#475569", fontSize: 11 }}>{t.category} · +{t.points} pts{t.due_date ? ` · Due ${t.due_date}` : ""}</div>
                            </div>
                            <button onClick={() => completeTask(t)} style={{ background: "#1b2d1b", border: "1px solid #4ade8033", borderRadius: 8, padding: "5px 10px", color: "#4ade80", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>✓ Done</button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={() => setShowAddTask(v)} style={{ background: "#1b1b3a", border: "1px solid #818cf833", borderRadius: 8, padding: "6px 12px", color: "#818cf8", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>+ Assign Task</button>
                      <button onClick={() => setShowAppreciate(v)} style={{ background: "#2d2510", border: "1px solid #fbbf2433", borderRadius: 8, padding: "6px 12px", color: "#fbbf24", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>💛 Appreciate</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* LEADERBOARD TAB */}
          {tab === "leaderboard" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ background: "linear-gradient(135deg,#2d2510,#161b27)", border: "1px solid #fbbf2433", borderRadius: 12, padding: 14, marginBottom: 8, textAlign: "center" }}>
                <div style={{ color: "#fbbf24", fontSize: 13, fontWeight: 600 }}>🏆 Volunteer Hero Leaderboard</div>
                <div style={{ color: "#475569", fontSize: 12, marginTop: 3 }}>Points earned by completing tasks and receiving appreciation</div>
              </div>
              {volunteers.map((v, i) => {
                const ptColor = getBadgeColor(v.hero_points || 0);
                return (
                  <div key={v.id} style={{ background: "#161b27", border: `1px solid ${i < 3 ? ptColor + "33" : "#2a2f45"}`, borderRadius: 12, padding: "14px 18px", display: "flex", gap: 14, alignItems: "center" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: i < 3 ? `${ptColor}22` : "#0d1117", display: "flex", alignItems: "center", justifyContent: "center", fontSize: i < 3 ? 18 : 14, fontWeight: 700, color: ptColor, flexShrink: 0 }}>
                      {getRankLabel(i)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700 }}>{v.residents?.name || "Unknown"}</div>
                      <div style={{ color: "#475569", fontSize: 12 }}>Flat {v.residents?.flat_number} · {v.completed_tasks || 0} tasks completed</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: ptColor, fontSize: 20, fontWeight: 900 }}>{v.hero_points || 0}</div>
                      <div style={{ color: "#475569", fontSize: 9 }}>POINTS</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* APPRECIATION WALL TAB */}
          {tab === "appreciation wall" && (
            <div>
              {appreciations.length === 0 && <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 40, textAlign: "center", color: "#475569" }}>No appreciations yet. Recognise your volunteers!</div>}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
                {appreciations.map(a => {
                  const vol = volunteers.find(v => v.id === a.volunteer_id);
                  return (
                    <div key={a.id} style={{ background: "linear-gradient(135deg,#2d2510,#161b27)", border: "1px solid #fbbf2422", borderRadius: 14, padding: 18 }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>💛</div>
                      <div style={{ color: "#fbbf24", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>To: {vol?.residents?.name || "Volunteer"}</div>
                      <div style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6, marginBottom: 8 }}>"{a.message}"</div>
                      <div style={{ color: "#475569", fontSize: 11 }}>From {a.from_name} · +{a.points_added} pts</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CAMPAIGNS TAB */}
          {tab === "campaigns" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {campaigns.length === 0 && <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 40, textAlign: "center", color: "#475569" }}>No campaigns yet. Create community events!</div>}
              {campaigns.map(c => {
                const joins = campaignJoins.filter(j => j.campaign_id === c.id).length;
                const progress = Math.min(100, Math.round(((c.joined_count || 0) / (c.target_count || 20)) * 100));
                return (
                  <div key={c.id} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 14, padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                          <span style={{ background: c.status === "upcoming" ? "#1b2d1b" : "#1e2535", color: c.status === "upcoming" ? "#4ade80" : "#64748b", borderRadius: 20, padding: "2px 10px", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{c.status}</span>
                          <span style={{ color: "#475569", fontSize: 11 }}>{c.type}</span>
                        </div>
                        <div style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{c.title}</div>
                        {c.description && <div style={{ color: "#64748b", fontSize: 13, marginBottom: 4 }}>{c.description}</div>}
                        <div style={{ color: "#475569", fontSize: 12 }}>📅 {c.date} at {c.time} · 📍 {c.venue}</div>
                        {c.goal && <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>🎯 {c.goal}</div>}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ color: "#4ade80", fontSize: 20, fontWeight: 900 }}>{c.joined_count || 0}</div>
                        <div style={{ color: "#475569", fontSize: 10 }}>joined / {c.target_count}</div>
                      </div>
                    </div>
                    <div style={{ height: 6, background: "#0d1117", borderRadius: 3, marginBottom: 12 }}>
                      <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#4ade80,#22c55e)", borderRadius: 3, transition: "width 0.5s" }} />
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                      <span style={{ color: "#818cf8", fontSize: 12 }}>🌟 +{c.points_reward} hero points for joining</span>
                      {c.status === "upcoming" && (
                        <button onClick={() => joinCampaign(c)} disabled={saving} style={{ ...btnPrimary, padding: "7px 16px", fontSize: 12, opacity: saving ? 0.6 : 1 }}>Join Campaign</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ADD VOLUNTEER MODAL */}
      <Modal open={showAddVolunteer} onClose={() => setShowAddVolunteer(false)} title="Enrol Volunteer">
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div><label style={lbl}>Flat Number</label>
            <select style={inp} value={volForm.flat_number} onChange={e => setVolForm({ ...volForm, flat_number: e.target.value })}>
              <option value="">Select flat…</option>
              {residents.map(r => <option key={r.id} value={r.flat_number}>{r.flat_number} — {r.name}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Block</label>
            <select style={inp} value={volForm.block} onChange={e => setVolForm({ ...volForm, block: e.target.value })}>
              <option value="A">Block A</option><option value="B">Block B</option>
            </select>
          </div>
          <button style={{ ...btnPrimary, justifyContent: "center", opacity: saving ? 0.6 : 1 }} onClick={addVolunteer} disabled={saving}>{saving ? "Enrolling…" : "Enrol Volunteer"}</button>
        </div>
      </Modal>

      {/* ASSIGN TASK MODAL */}
      <Modal open={!!showAddTask} onClose={() => setShowAddTask(null)} title={`Assign Task — ${showAddTask?.residents?.name}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div><label style={lbl}>Task Description *</label><input style={inp} value={taskForm.task} onChange={e => setTaskForm({ ...taskForm, task: e.target.value })} placeholder="e.g. Check corridor lights in Block A" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Category</label>
              <select style={inp} value={taskForm.category} onChange={e => setTaskForm({ ...taskForm, category: e.target.value })}>
                {["Maintenance", "Security", "Cleanliness", "Community", "Admin", "Other"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Hero Points</label><input type="number" style={inp} value={taskForm.points} onChange={e => setTaskForm({ ...taskForm, points: Number(e.target.value) })} /></div>
          </div>
          <div><label style={lbl}>Due Date (optional)</label><input type="date" style={inp} value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} /></div>
          <button style={{ ...btnPrimary, justifyContent: "center", opacity: saving ? 0.6 : 1 }} onClick={addTask} disabled={saving}>{saving ? "Assigning…" : "Assign Task"}</button>
        </div>
      </Modal>

      {/* APPRECIATE MODAL */}
      <Modal open={!!showAppreciate} onClose={() => setShowAppreciate(null)} title={`Appreciate — ${showAppreciate?.residents?.name}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div style={{ background: "#2d2510", borderRadius: 10, padding: 12, color: "#fbbf24", fontSize: 13 }}>
            💛 Appreciation adds +20 hero points and shows on the public wall
          </div>
          <div><label style={lbl}>Your Flat Number (optional)</label><input style={inp} value={appForm.from_flat} onChange={e => setAppForm({ ...appForm, from_flat: e.target.value })} placeholder="e.g. 203" /></div>
          <div><label style={lbl}>Message *</label><textarea style={{ ...inp, height: 90, resize: "vertical" }} value={appForm.message} onChange={e => setAppForm({ ...appForm, message: e.target.value })} placeholder="Write your appreciation message…" /></div>
          <button style={{ ...btnPrimary, justifyContent: "center", opacity: saving ? 0.6 : 1 }} onClick={addAppreciation} disabled={saving}>{saving ? "Sending…" : "💛 Send Appreciation"}</button>
        </div>
      </Modal>

      {/* ADD CAMPAIGN MODAL */}
      <Modal open={showAddCampaign} onClose={() => setShowAddCampaign(false)} title="Create Campaign">
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div><label style={lbl}>Title *</label><input style={inp} value={campForm.title} onChange={e => setCampForm({ ...campForm, title: e.target.value })} placeholder="e.g. Society Clean-Up Drive" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Type</label>
              <select style={inp} value={campForm.type} onChange={e => setCampForm({ ...campForm, type: e.target.value })}>
                {["social", "environmental", "health", "festival", "sports", "education", "other"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Target Participants</label><input type="number" style={inp} value={campForm.target_count} onChange={e => setCampForm({ ...campForm, target_count: Number(e.target.value) })} /></div>
          </div>
          <div><label style={lbl}>Description</label><textarea style={{ ...inp, height: 70, resize: "vertical" }} value={campForm.description} onChange={e => setCampForm({ ...campForm, description: e.target.value })} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Date *</label><input type="date" style={inp} value={campForm.date} onChange={e => setCampForm({ ...campForm, date: e.target.value })} /></div>
            <div><label style={lbl}>Time</label><input type="time" style={inp} value={campForm.time} onChange={e => setCampForm({ ...campForm, time: e.target.value })} /></div>
          </div>
          <div><label style={lbl}>Venue</label><input style={inp} value={campForm.venue} onChange={e => setCampForm({ ...campForm, venue: e.target.value })} placeholder="e.g. Society premises" /></div>
          <div><label style={lbl}>Goal</label><input style={inp} value={campForm.goal} onChange={e => setCampForm({ ...campForm, goal: e.target.value })} placeholder="e.g. Plant 50 trees" /></div>
          <div><label style={lbl}>Hero Points Reward</label><input type="number" style={inp} value={campForm.points_reward} onChange={e => setCampForm({ ...campForm, points_reward: Number(e.target.value) })} /></div>
          <button style={{ ...btnPrimary, justifyContent: "center", opacity: saving ? 0.6 : 1 }} onClick={addCampaign} disabled={saving}>{saving ? "Creating…" : "Create Campaign"}</button>
        </div>
      </Modal>
    </div>
  );
}

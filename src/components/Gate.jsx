import { useState, useEffect } from "react";
import { supabase, SOCIETY_ID } from "../lib/supabase";

export default function Gate() {
  const [activeTab, setActiveTab] = useState("gate");
  const [visitors, setVisitors] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [frequentVisitors, setFrequentVisitors] = useState([]);
  const [incidents, setIncidents] = useState([]);
  
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [editData, setEditData] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  
  const [visitorForm, setVisitorForm] = useState({
    flat_number: "",
    name: "",
    phone: "",
    purpose: "",
    type: "guest",
    vehicle_number: "",
    otp: ""
  });
  
  const [deliveryForm, setDeliveryForm] = useState({
    flat_number: "",
    courier: "",
    items: ""
  });
  
  const [staffForm, setStaffForm] = useState({
    name: "",
    role: "",
    phone: "",
    shift: "morning",
    rating: 5
  });
  
  const [blacklistForm, setBlacklistForm] = useState({
    name: "",
    phone: "",
    vehicle: "",
    reason: ""
  });
  
  const [frequentForm, setFrequentForm] = useState({
    flat_id: "",
    name: "",
    phone: "",
    relation: ""
  });
  
  const [incidentForm, setIncidentForm] = useState({
    type: "suspicious",
    description: "",
    location: ""
  });

  // Load all data
  useEffect(() => {
    loadVisitors();
    loadDeliveries();
    loadStaff();
    loadTodayAttendance();
    loadBlacklist();
    loadFrequentVisitors();
    loadIncidents();
  }, []);

  const loadVisitors = async () => {
    const { data } = await supabase
      .from("visitors")
      .select("*")
      .eq("society_id", SOCIETY_ID)
      .order("in_time", { ascending: false })
      .limit(100);
    setVisitors(data || []);
  };

  const loadDeliveries = async () => {
    const { data } = await supabase
      .from("deliveries")
      .select("*")
      .eq("society_id", SOCIETY_ID)
      .order("in_time", { ascending: false })
      .limit(100);
    setDeliveries(data || []);
  };

  const loadStaff = async () => {
    const { data } = await supabase
      .from("staff")
      .select("*")
      .eq("society_id", SOCIETY_ID)
      .order("name");
    setStaff(data || []);
  };

  const loadTodayAttendance = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("staff_attendance")
      .select("*, staff(*)")
      .eq("society_id", SOCIETY_ID)
      .eq("date", today);
    setAttendance(data || []);
  };

  const loadBlacklist = async () => {
    const { data } = await supabase
      .from("blacklist")
      .select("*")
      .eq("society_id", SOCIETY_ID)
      .eq("active", true)
      .order("created_at", { ascending: false });
    setBlacklist(data || []);
  };

  const loadFrequentVisitors = async () => {
    const { data } = await supabase
      .from("frequent_visitors")
      .select("*")
      .eq("society_id", SOCIETY_ID)
      .eq("active", true)
      .order("name");
    setFrequentVisitors(data || []);
  };

  const loadIncidents = async () => {
    const { data } = await supabase
      .from("security_incidents")
      .select("*")
      .eq("society_id", SOCIETY_ID)
      .order("time", { ascending: false })
      .limit(50);
    setIncidents(data || []);
  };

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  // Visitor functions
  const checkInVisitor = async () => {
    // Check blacklist
    const isBlacklisted = blacklist.some(
      b => b.phone === visitorForm.phone || b.vehicle === visitorForm.vehicle_number
    );
    if (isBlacklisted) {
      showToast("⚠️ This person/vehicle is blacklisted!", "error");
      return;
    }

    const { error } = await supabase.from("visitors").insert({
      ...visitorForm,
      society_id: SOCIETY_ID,
      in_time: new Date().toISOString(),
      status: "inside",
      entry_by: "Gate Security"
    });

    if (error) {
      showToast("Error checking in visitor", "error");
    } else {
      showToast("✅ Visitor checked in successfully");
      setShowModal(false);
      setVisitorForm({
        flat_number: "",
        name: "",
        phone: "",
        purpose: "",
        type: "guest",
        vehicle_number: "",
        otp: ""
      });
      loadVisitors();
    }
  };

  const checkOutVisitor = async (id) => {
    const { error } = await supabase
      .from("visitors")
      .update({
        status: "left",
        out_time: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      showToast("Error checking out visitor", "error");
    } else {
      showToast("✅ Visitor checked out");
      loadVisitors();
    }
  };

  const verifyOTP = async (id, otp) => {
    const { error } = await supabase
      .from("visitors")
      .update({ otp_verified: true })
      .eq("id", id)
      .eq("otp", otp);

    if (error) {
      showToast("Invalid OTP", "error");
    } else {
      showToast("✅ OTP verified");
      loadVisitors();
    }
  };

  // Delivery functions
  const logDelivery = async () => {
    const { error } = await supabase.from("deliveries").insert({
      ...deliveryForm,
      society_id: SOCIETY_ID,
      in_time: new Date().toISOString(),
      status: "pending"
    });

    if (error) {
      showToast("Error logging delivery", "error");
    } else {
      showToast("📦 Delivery logged successfully");
      setShowModal(false);
      setDeliveryForm({ flat_number: "", courier: "", items: "" });
      loadDeliveries();
    }
  };

  const markDeliveryCollected = async (id) => {
    const { error } = await supabase
      .from("deliveries")
      .update({
        status: "collected",
        collected_at: new Date().toISOString(),
        collected_by: "Resident"
      })
      .eq("id", id);

    if (error) {
      showToast("Error updating delivery", "error");
    } else {
      showToast("✅ Delivery marked as collected");
      loadDeliveries();
    }
  };

  // Staff functions
  const addStaff = async () => {
    const { error } = await supabase.from("staff").insert({
      ...staffForm,
      society_id: SOCIETY_ID,
      status: "active",
      date_of_joining: new Date().toISOString()
    });

    if (error) {
      showToast("Error adding staff", "error");
    } else {
      showToast("✅ Staff member added");
      setShowModal(false);
      setStaffForm({ name: "", role: "", phone: "", shift: "morning", rating: 5 });
      loadStaff();
    }
  };

  const markAttendance = async (staffId, status) => {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();

    // Check if attendance already exists
    const existing = attendance.find(a => a.staff_id === staffId);

    if (existing) {
      const { error } = await supabase
        .from("staff_attendance")
        .update({
          status,
          out_time: status === "present" ? now : null
        })
        .eq("id", existing.id);

      if (error) {
        showToast("Error updating attendance", "error");
      } else {
        showToast("✅ Attendance updated");
        loadTodayAttendance();
      }
    } else {
      const { error } = await supabase.from("staff_attendance").insert({
        staff_id: staffId,
        society_id: SOCIETY_ID,
        date: today,
        status,
        in_time: now,
        marked_by: "Security"
      });

      if (error) {
        showToast("Error marking attendance", "error");
      } else {
        showToast("✅ Attendance marked");
        loadTodayAttendance();
      }
    }
  };

  // Blacklist functions
  const addToBlacklist = async () => {
    const { error } = await supabase.from("blacklist").insert({
      ...blacklistForm,
      society_id: SOCIETY_ID,
      active: true
    });

    if (error) {
      showToast("Error adding to blacklist", "error");
    } else {
      showToast("⚠️ Added to blacklist");
      setShowModal(false);
      setBlacklistForm({ name: "", phone: "", vehicle: "", reason: "" });
      loadBlacklist();
    }
  };

  const removeFromBlacklist = async (id) => {
    const { error } = await supabase
      .from("blacklist")
      .update({ active: false })
      .eq("id", id);

    if (error) {
      showToast("Error removing from blacklist", "error");
    } else {
      showToast("✅ Removed from blacklist");
      loadBlacklist();
    }
  };

  // Frequent visitor functions
  const addFrequentVisitor = async () => {
    const { error } = await supabase.from("frequent_visitors").insert({
      ...frequentForm,
      society_id: SOCIETY_ID,
      active: true
    });

    if (error) {
      showToast("Error adding frequent visitor", "error");
    } else {
      showToast("✅ Frequent visitor added");
      setShowModal(false);
      setFrequentForm({ flat_id: "", name: "", phone: "", relation: "" });
      loadFrequentVisitors();
    }
  };

  // Incident functions
  const logIncident = async () => {
    const { error } = await supabase.from("security_incidents").insert({
      ...incidentForm,
      society_id: SOCIETY_ID,
      time: new Date().toISOString(),
      status: "reported"
    });

    if (error) {
      showToast("Error logging incident", "error");
    } else {
      showToast("🚨 Incident logged");
      setShowModal(false);
      setIncidentForm({ type: "suspicious", description: "", location: "" });
      loadIncidents();
    }
  };

  const updateIncidentStatus = async (id, status) => {
    const { error } = await supabase
      .from("security_incidents")
      .update({ status })
      .eq("id", id);

    if (error) {
      showToast("Error updating incident", "error");
    } else {
      showToast("✅ Incident status updated");
      loadIncidents();
    }
  };

  // Stats
  const activeVisitors = visitors.filter(v => v.status === "inside");
  const todayVisitors = visitors.filter(v => {
    const today = new Date().toISOString().split("T")[0];
    return v.in_time?.startsWith(today);
  });
  const pendingDeliveries = deliveries.filter(d => d.status === "pending");
  const todayDeliveries = deliveries.filter(d => {
    const today = new Date().toISOString().split("T")[0];
    return d.in_time?.startsWith(today);
  });
  const presentStaff = attendance.filter(a => a.status === "present").length;
  const totalStaff = staff.filter(s => s.status === "active").length;

  const formatTime = (timestamp) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short"
    });
  };

  return (
    <div style={styles.container}>
      {/* Toast */}
      {toast.show && (
        <div style={{
          ...styles.toast,
          backgroundColor: toast.type === "error" ? "#ef4444" : "#10b981"
        }}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>🚪 Gate & Staff</h1>
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{activeVisitors.length}</div>
            <div style={styles.statLabel}>Inside Now</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{todayVisitors.length}</div>
            <div style={styles.statLabel}>Today's Visitors</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{pendingDeliveries.length}</div>
            <div style={styles.statLabel}>Pending Deliveries</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{presentStaff}/{totalStaff}</div>
            <div style={styles.statLabel}>Staff Present</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {["gate", "visitors", "deliveries", "staff", "blacklist", "incidents"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.tabActive : {})
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Gate Tab - Live View */}
      {activeTab === "gate" && (
        <div style={styles.content}>
          <div style={styles.actionBar}>
            <button
              onClick={() => {
                setModalType("checkIn");
                setShowModal(true);
              }}
              style={styles.btnPrimary}
            >
              + Check In Visitor
            </button>
            <button
              onClick={() => {
                setModalType("logDelivery");
                setShowModal(true);
              }}
              style={styles.btnSecondary}
            >
              📦 Log Delivery
            </button>
          </div>

          <h3 style={styles.sectionTitle}>Currently Inside ({activeVisitors.length})</h3>
          <div style={styles.grid}>
            {activeVisitors.map(visitor => (
              <div key={visitor.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <div style={styles.cardTitle}>{visitor.name}</div>
                    <div style={styles.cardSubtitle}>Flat {visitor.flat_number}</div>
                  </div>
                  <div style={{
                    ...styles.badge,
                    backgroundColor: visitor.type === "guest" ? "#3b82f6" :
                      visitor.type === "service" ? "#f59e0b" : "#8b5cf6"
                  }}>
                    {visitor.type}
                  </div>
                </div>
                <div style={styles.cardBody}>
                  <div style={styles.row}>
                    <span>📞 {visitor.phone}</span>
                  </div>
                  <div style={styles.row}>
                    <span>Purpose: {visitor.purpose}</span>
                  </div>
                  {visitor.vehicle_number && (
                    <div style={styles.row}>
                      <span>🚗 {visitor.vehicle_number}</span>
                    </div>
                  )}
                  <div style={styles.row}>
                    <span>In: {formatTime(visitor.in_time)}</span>
                  </div>
                </div>
                <button
                  onClick={() => checkOutVisitor(visitor.id)}
                  style={styles.btnDanger}
                >
                  Check Out
                </button>
              </div>
            ))}
          </div>

          {activeVisitors.length === 0 && (
            <div style={styles.empty}>No visitors inside currently</div>
          )}
        </div>
      )}

      {/* Visitors Tab */}
      {activeTab === "visitors" && (
        <div style={styles.content}>
          <div style={styles.actionBar}>
            <button
              onClick={() => {
                setModalType("checkIn");
                setShowModal(true);
              }}
              style={styles.btnPrimary}
            >
              + Check In Visitor
            </button>
            <button
              onClick={() => {
                setModalType("addFrequent");
                setShowModal(true);
              }}
              style={styles.btnSecondary}
            >
              Add Frequent Visitor
            </button>
          </div>

          <h3 style={styles.sectionTitle}>Recent Visitors</h3>
          <div style={styles.table}>
            <table style={{ width: "100%" }}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Flat</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Purpose</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>In Time</th>
                  <th style={styles.th}>Out Time</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {visitors.slice(0, 20).map(v => (
                  <tr key={v.id} style={styles.tableRow}>
                    <td style={styles.td}>{v.name}</td>
                    <td style={styles.td}>{v.flat_number}</td>
                    <td style={styles.td}>{v.phone}</td>
                    <td style={styles.td}>{v.purpose}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: v.type === "guest" ? "#3b82f6" :
                          v.type === "service" ? "#f59e0b" : "#8b5cf6"
                      }}>
                        {v.type}
                      </span>
                    </td>
                    <td style={styles.td}>{formatTime(v.in_time)}</td>
                    <td style={styles.td}>{formatTime(v.out_time)}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: v.status === "inside" ? "#10b981" : "#6b7280"
                      }}>
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deliveries Tab */}
      {activeTab === "deliveries" && (
        <div style={styles.content}>
          <div style={styles.actionBar}>
            <button
              onClick={() => {
                setModalType("logDelivery");
                setShowModal(true);
              }}
              style={styles.btnPrimary}
            >
              📦 Log New Delivery
            </button>
          </div>

          <h3 style={styles.sectionTitle}>Pending Deliveries ({pendingDeliveries.length})</h3>
          <div style={styles.grid}>
            {pendingDeliveries.map(delivery => (
              <div key={delivery.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <div style={styles.cardTitle}>Flat {delivery.flat_number}</div>
                    <div style={styles.cardSubtitle}>{delivery.courier}</div>
                  </div>
                  <span style={{ ...styles.badge, backgroundColor: "#f59e0b" }}>
                    Pending
                  </span>
                </div>
                <div style={styles.cardBody}>
                  <div style={styles.row}>
                    <span>Items: {delivery.items}</span>
                  </div>
                  <div style={styles.row}>
                    <span>Received: {formatTime(delivery.in_time)}</span>
                  </div>
                </div>
                <button
                  onClick={() => markDeliveryCollected(delivery.id)}
                  style={styles.btnPrimary}
                >
                  Mark as Collected
                </button>
              </div>
            ))}
          </div>

          {pendingDeliveries.length === 0 && (
            <div style={styles.empty}>No pending deliveries</div>
          )}

          <h3 style={styles.sectionTitle}>Recent Deliveries</h3>
          <div style={styles.table}>
            <table style={{ width: "100%" }}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>Flat</th>
                  <th style={styles.th}>Courier</th>
                  <th style={styles.th}>Items</th>
                  <th style={styles.th}>Received</th>
                  <th style={styles.th}>Collected</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.slice(0, 20).map(d => (
                  <tr key={d.id} style={styles.tableRow}>
                    <td style={styles.td}>{d.flat_number}</td>
                    <td style={styles.td}>{d.courier}</td>
                    <td style={styles.td}>{d.items}</td>
                    <td style={styles.td}>{formatTime(d.in_time)}</td>
                    <td style={styles.td}>{formatTime(d.collected_at)}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: d.status === "collected" ? "#10b981" : "#f59e0b"
                      }}>
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Staff Tab */}
      {activeTab === "staff" && (
        <div style={styles.content}>
          <div style={styles.actionBar}>
            <button
              onClick={() => {
                setModalType("addStaff");
                setShowModal(true);
              }}
              style={styles.btnPrimary}
            >
              + Add Staff Member
            </button>
          </div>

          <h3 style={styles.sectionTitle}>Today's Attendance</h3>
          <div style={styles.grid}>
            {staff.filter(s => s.status === "active").map(s => {
              const att = attendance.find(a => a.staff_id === s.id);
              return (
                <div key={s.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div>
                      <div style={styles.cardTitle}>{s.name}</div>
                      <div style={styles.cardSubtitle}>{s.role} • {s.shift}</div>
                    </div>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: att?.status === "present" ? "#10b981" :
                        att?.status === "absent" ? "#ef4444" :
                        att?.status === "half-day" ? "#f59e0b" :
                        att?.status === "leave" ? "#8b5cf6" : "#6b7280"
                    }}>
                      {att?.status || "Not Marked"}
                    </span>
                  </div>
                  <div style={styles.cardBody}>
                    <div style={styles.row}>
                      <span>📞 {s.phone}</span>
                    </div>
                    {att?.in_time && (
                      <div style={styles.row}>
                        <span>In: {formatTime(att.in_time)}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => markAttendance(s.id, "present")}
                      style={{ ...styles.btnSmall, backgroundColor: "#10b981" }}
                    >
                      Present
                    </button>
                    <button
                      onClick={() => markAttendance(s.id, "absent")}
                      style={{ ...styles.btnSmall, backgroundColor: "#ef4444" }}
                    >
                      Absent
                    </button>
                    <button
                      onClick={() => markAttendance(s.id, "half-day")}
                      style={{ ...styles.btnSmall, backgroundColor: "#f59e0b" }}
                    >
                      Half
                    </button>
                    <button
                      onClick={() => markAttendance(s.id, "leave")}
                      style={{ ...styles.btnSmall, backgroundColor: "#8b5cf6" }}
                    >
                      Leave
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <h3 style={styles.sectionTitle}>All Staff</h3>
          <div style={styles.table}>
            <table style={{ width: "100%" }}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Shift</th>
                  <th style={styles.th}>Joined</th>
                  <th style={styles.th}>Rating</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s.id} style={styles.tableRow}>
                    <td style={styles.td}>{s.name}</td>
                    <td style={styles.td}>{s.role}</td>
                    <td style={styles.td}>{s.phone}</td>
                    <td style={styles.td}>{s.shift}</td>
                    <td style={styles.td}>{formatDate(s.date_of_joining)}</td>
                    <td style={styles.td}>⭐ {s.rating}/5</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: s.status === "active" ? "#10b981" : "#6b7280"
                      }}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Blacklist Tab */}
      {activeTab === "blacklist" && (
        <div style={styles.content}>
          <div style={styles.actionBar}>
            <button
              onClick={() => {
                setModalType("addBlacklist");
                setShowModal(true);
              }}
              style={styles.btnDanger}
            >
              ⚠️ Add to Blacklist
            </button>
          </div>

          <h3 style={styles.sectionTitle}>Blacklisted Persons/Vehicles</h3>
          <div style={styles.grid}>
            {blacklist.map(item => (
              <div key={item.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <div style={styles.cardTitle}>{item.name}</div>
                    <div style={styles.cardSubtitle}>{item.phone}</div>
                  </div>
                  <span style={{ ...styles.badge, backgroundColor: "#ef4444" }}>
                    Blacklisted
                  </span>
                </div>
                <div style={styles.cardBody}>
                  {item.vehicle && (
                    <div style={styles.row}>
                      <span>🚗 {item.vehicle}</span>
                    </div>
                  )}
                  <div style={styles.row}>
                    <span>Reason: {item.reason}</span>
                  </div>
                </div>
                <button
                  onClick={() => removeFromBlacklist(item.id)}
                  style={styles.btnSecondary}
                >
                  Remove from Blacklist
                </button>
              </div>
            ))}
          </div>

          {blacklist.length === 0 && (
            <div style={styles.empty}>No blacklisted entries</div>
          )}
        </div>
      )}

      {/* Incidents Tab */}
      {activeTab === "incidents" && (
        <div style={styles.content}>
          <div style={styles.actionBar}>
            <button
              onClick={() => {
                setModalType("logIncident");
                setShowModal(true);
              }}
              style={styles.btnDanger}
            >
              🚨 Log Incident
            </button>
          </div>

          <h3 style={styles.sectionTitle}>Security Incidents</h3>
          <div style={styles.grid}>
            {incidents.map(incident => (
              <div key={incident.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <div style={styles.cardTitle}>
                      {incident.type === "suspicious" ? "👁️ Suspicious Activity" :
                       incident.type === "theft" ? "🚨 Theft" :
                       incident.type === "vandalism" ? "⚠️ Vandalism" :
                       incident.type === "trespassing" ? "🚷 Trespassing" :
                       incident.type === "fight" ? "🥊 Fight" : "⚠️ Other"}
                    </div>
                    <div style={styles.cardSubtitle}>{formatDate(incident.time)} {formatTime(incident.time)}</div>
                  </div>
                  <span style={{
                    ...styles.badge,
                    backgroundColor: incident.status === "reported" ? "#f59e0b" :
                      incident.status === "investigating" ? "#3b82f6" :
                      incident.status === "resolved" ? "#10b981" : "#ef4444"
                  }}>
                    {incident.status}
                  </span>
                </div>
                <div style={styles.cardBody}>
                  <div style={styles.row}>
                    <span>Location: {incident.location}</span>
                  </div>
                  <div style={styles.row}>
                    <span>{incident.description}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => updateIncidentStatus(incident.id, "investigating")}
                    style={{ ...styles.btnSmall, backgroundColor: "#3b82f6" }}
                  >
                    Investigating
                  </button>
                  <button
                    onClick={() => updateIncidentStatus(incident.id, "resolved")}
                    style={{ ...styles.btnSmall, backgroundColor: "#10b981" }}
                  >
                    Resolved
                  </button>
                </div>
              </div>
            ))}
          </div>

          {incidents.length === 0 && (
            <div style={styles.empty}>No incidents reported</div>
          )}
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            {/* Check In Visitor Modal */}
            {modalType === "checkIn" && (
              <>
                <h2 style={styles.modalTitle}>Check In Visitor</h2>
                <input
                  type="text"
                  placeholder="Flat Number"
                  value={visitorForm.flat_number}
                  onChange={(e) => setVisitorForm({ ...visitorForm, flat_number: e.target.value })}
                  style={styles.input}
                />
                <input
                  type="text"
                  placeholder="Name"
                  value={visitorForm.name}
                  onChange={(e) => setVisitorForm({ ...visitorForm, name: e.target.value })}
                  style={styles.input}
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={visitorForm.phone}
                  onChange={(e) => setVisitorForm({ ...visitorForm, phone: e.target.value })}
                  style={styles.input}
                />
                <select
                  value={visitorForm.type}
                  onChange={(e) => setVisitorForm({ ...visitorForm, type: e.target.value })}
                  style={styles.input}
                >
                  <option value="guest">Guest</option>
                  <option value="service">Service Provider</option>
                  <option value="delivery">Delivery Person</option>
                </select>
                <input
                  type="text"
                  placeholder="Purpose of Visit"
                  value={visitorForm.purpose}
                  onChange={(e) => setVisitorForm({ ...visitorForm, purpose: e.target.value })}
                  style={styles.input}
                />
                <input
                  type="text"
                  placeholder="Vehicle Number (optional)"
                  value={visitorForm.vehicle_number}
                  onChange={(e) => setVisitorForm({ ...visitorForm, vehicle_number: e.target.value })}
                  style={styles.input}
                />
                <div style={styles.modalActions}>
                  <button onClick={() => setShowModal(false)} style={styles.btnSecondary}>
                    Cancel
                  </button>
                  <button onClick={checkInVisitor} style={styles.btnPrimary}>
                    Check In
                  </button>
                </div>
              </>
            )}

            {/* Log Delivery Modal */}
            {modalType === "logDelivery" && (
              <>
                <h2 style={styles.modalTitle}>Log Delivery</h2>
                <input
                  type="text"
                  placeholder="Flat Number"
                  value={deliveryForm.flat_number}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, flat_number: e.target.value })}
                  style={styles.input}
                />
                <input
                  type="text"
                  placeholder="Courier Service (Amazon, Flipkart, etc.)"
                  value={deliveryForm.courier}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, courier: e.target.value })}
                  style={styles.input}
                />
                <input
                  type="text"
                  placeholder="Items Description"
                  value={deliveryForm.items}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, items: e.target.value })}
                  style={styles.input}
                />
                <div style={styles.modalActions}>
                  <button onClick={() => setShowModal(false)} style={styles.btnSecondary}>
                    Cancel
                  </button>
                  <button onClick={logDelivery} style={styles.btnPrimary}>
                    Log Delivery
                  </button>
                </div>
              </>
            )}

            {/* Add Staff Modal */}
            {modalType === "addStaff" && (
              <>
                <h2 style={styles.modalTitle}>Add Staff Member</h2>
                <input
                  type="text"
                  placeholder="Name"
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  style={styles.input}
                />
                <input
                  type="text"
                  placeholder="Role (Security, Housekeeping, etc.)"
                  value={staffForm.role}
                  onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                  style={styles.input}
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                  style={styles.input}
                />
                <select
                  value={staffForm.shift}
                  onChange={(e) => setStaffForm({ ...staffForm, shift: e.target.value })}
                  style={styles.input}
                >
                  <option value="morning">Morning (6 AM - 2 PM)</option>
                  <option value="afternoon">Afternoon (2 PM - 10 PM)</option>
                  <option value="night">Night (10 PM - 6 AM)</option>
                </select>
                <div style={styles.modalActions}>
                  <button onClick={() => setShowModal(false)} style={styles.btnSecondary}>
                    Cancel
                  </button>
                  <button onClick={addStaff} style={styles.btnPrimary}>
                    Add Staff
                  </button>
                </div>
              </>
            )}

            {/* Add to Blacklist Modal */}
            {modalType === "addBlacklist" && (
              <>
                <h2 style={styles.modalTitle}>Add to Blacklist</h2>
                <input
                  type="text"
                  placeholder="Name"
                  value={blacklistForm.name}
                  onChange={(e) => setBlacklistForm({ ...blacklistForm, name: e.target.value })}
                  style={styles.input}
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={blacklistForm.phone}
                  onChange={(e) => setBlacklistForm({ ...blacklistForm, phone: e.target.value })}
                  style={styles.input}
                />
                <input
                  type="text"
                  placeholder="Vehicle Number (optional)"
                  value={blacklistForm.vehicle}
                  onChange={(e) => setBlacklistForm({ ...blacklistForm, vehicle: e.target.value })}
                  style={styles.input}
                />
                <textarea
                  placeholder="Reason for Blacklisting"
                  value={blacklistForm.reason}
                  onChange={(e) => setBlacklistForm({ ...blacklistForm, reason: e.target.value })}
                  style={{ ...styles.input, minHeight: "100px" }}
                />
                <div style={styles.modalActions}>
                  <button onClick={() => setShowModal(false)} style={styles.btnSecondary}>
                    Cancel
                  </button>
                  <button onClick={addToBlacklist} style={styles.btnDanger}>
                    Add to Blacklist
                  </button>
                </div>
              </>
            )}

            {/* Add Frequent Visitor Modal */}
            {modalType === "addFrequent" && (
              <>
                <h2 style={styles.modalTitle}>Add Frequent Visitor</h2>
                <input
                  type="text"
                  placeholder="Flat ID"
                  value={frequentForm.flat_id}
                  onChange={(e) => setFrequentForm({ ...frequentForm, flat_id: e.target.value })}
                  style={styles.input}
                />
                <input
                  type="text"
                  placeholder="Name"
                  value={frequentForm.name}
                  onChange={(e) => setFrequentForm({ ...frequentForm, name: e.target.value })}
                  style={styles.input}
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={frequentForm.phone}
                  onChange={(e) => setFrequentForm({ ...frequentForm, phone: e.target.value })}
                  style={styles.input}
                />
                <input
                  type="text"
                  placeholder="Relation (Maid, Cook, Driver, etc.)"
                  value={frequentForm.relation}
                  onChange={(e) => setFrequentForm({ ...frequentForm, relation: e.target.value })}
                  style={styles.input}
                />
                <div style={styles.modalActions}>
                  <button onClick={() => setShowModal(false)} style={styles.btnSecondary}>
                    Cancel
                  </button>
                  <button onClick={addFrequentVisitor} style={styles.btnPrimary}>
                    Add Frequent Visitor
                  </button>
                </div>
              </>
            )}

            {/* Log Incident Modal */}
            {modalType === "logIncident" && (
              <>
                <h2 style={styles.modalTitle}>Log Security Incident</h2>
                <select
                  value={incidentForm.type}
                  onChange={(e) => setIncidentForm({ ...incidentForm, type: e.target.value })}
                  style={styles.input}
                >
                  <option value="suspicious">Suspicious Activity</option>
                  <option value="theft">Theft</option>
                  <option value="vandalism">Vandalism</option>
                  <option value="trespassing">Trespassing</option>
                  <option value="fight">Fight/Altercation</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type="text"
                  placeholder="Location"
                  value={incidentForm.location}
                  onChange={(e) => setIncidentForm({ ...incidentForm, location: e.target.value })}
                  style={styles.input}
                />
                <textarea
                  placeholder="Description of Incident"
                  value={incidentForm.description}
                  onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                  style={{ ...styles.input, minHeight: "100px" }}
                />
                <div style={styles.modalActions}>
                  <button onClick={() => setShowModal(false)} style={styles.btnSecondary}>
                    Cancel
                  </button>
                  <button onClick={logIncident} style={styles.btnDanger}>
                    Log Incident
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "20px",
    maxWidth: "1400px",
    margin: "0 auto",
    fontFamily: "system-ui, -apple-system, sans-serif",
    color: "#e5e7eb",
    backgroundColor: "#111827",
    minHeight: "100vh"
  },
  toast: {
    position: "fixed",
    top: "20px",
    right: "20px",
    padding: "16px 24px",
    borderRadius: "8px",
    color: "white",
    fontWeight: "500",
    zIndex: 1000,
    boxShadow: "0 10px 40px rgba(0,0,0,0.3)"
  },
  header: {
    marginBottom: "32px"
  },
  title: {
    fontSize: "32px",
    fontWeight: "700",
    marginBottom: "24px",
    color: "#f9fafb"
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px"
  },
  statCard: {
    backgroundColor: "#1f2937",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid #374151",
    textAlign: "center"
  },
  statValue: {
    fontSize: "32px",
    fontWeight: "700",
    color: "#3b82f6",
    marginBottom: "8px"
  },
  statLabel: {
    fontSize: "14px",
    color: "#9ca3af"
  },
  tabs: {
    display: "flex",
    gap: "8px",
    borderBottom: "2px solid #374151",
    marginBottom: "24px",
    overflowX: "auto"
  },
  tab: {
    padding: "12px 24px",
    backgroundColor: "transparent",
    border: "none",
    color: "#9ca3af",
    fontSize: "16px",
    fontWeight: "500",
    cursor: "pointer",
    borderBottom: "2px solid transparent",
    transition: "all 0.2s",
    whiteSpace: "nowrap"
  },
  tabActive: {
    color: "#3b82f6",
    borderBottomColor: "#3b82f6"
  },
  content: {
    marginBottom: "40px"
  },
  actionBar: {
    display: "flex",
    gap: "12px",
    marginBottom: "24px",
    flexWrap: "wrap"
  },
  sectionTitle: {
    fontSize: "20px",
    fontWeight: "600",
    marginBottom: "16px",
    color: "#f9fafb"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "16px",
    marginBottom: "32px"
  },
  card: {
    backgroundColor: "#1f2937",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid #374151"
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "16px"
  },
  cardTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#f9fafb",
    marginBottom: "4px"
  },
  cardSubtitle: {
    fontSize: "14px",
    color: "#9ca3af"
  },
  cardBody: {
    marginBottom: "16px"
  },
  row: {
    padding: "8px 0",
    fontSize: "14px",
    color: "#d1d5db"
  },
  badge: {
    padding: "4px 12px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600",
    color: "white",
    whiteSpace: "nowrap"
  },
  table: {
    backgroundColor: "#1f2937",
    borderRadius: "12px",
    border: "1px solid #374151",
    overflow: "auto"
  },
  tableHeader: {
    backgroundColor: "#374151"
  },
  th: {
    padding: "16px",
    textAlign: "left",
    fontSize: "14px",
    fontWeight: "600",
    color: "#f9fafb"
  },
  tableRow: {
    borderBottom: "1px solid #374151"
  },
  td: {
    padding: "16px",
    fontSize: "14px",
    color: "#d1d5db"
  },
  btnPrimary: {
    padding: "12px 24px",
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  btnSecondary: {
    padding: "12px 24px",
    backgroundColor: "#374151",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  btnDanger: {
    padding: "12px 24px",
    backgroundColor: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  btnSmall: {
    padding: "8px 16px",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    flex: 1
  },
  empty: {
    textAlign: "center",
    padding: "60px 20px",
    color: "#6b7280",
    fontSize: "16px"
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px"
  },
  modal: {
    backgroundColor: "#1f2937",
    borderRadius: "16px",
    padding: "32px",
    maxWidth: "500px",
    width: "100%",
    maxHeight: "90vh",
    overflow: "auto",
    border: "1px solid #374151"
  },
  modalTitle: {
    fontSize: "24px",
    fontWeight: "700",
    marginBottom: "24px",
    color: "#f9fafb"
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    backgroundColor: "#111827",
    border: "1px solid #374151",
    borderRadius: "8px",
    color: "#f9fafb",
    fontSize: "16px",
    marginBottom: "16px",
    outline: "none"
  },
  modalActions: {
    display: "flex",
    gap: "12px",
    marginTop: "24px"
  }
};

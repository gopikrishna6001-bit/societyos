// src/lib/hooks.js
// Every UI section uses these hooks
// No component touches Supabase directly

import { useState, useEffect, useCallback } from 'react';
import {
  Society, Residents, Roles, Financials, Complaints,
  Maintenance, Gate, Staff, Meetings as MeetingsAPI,
  Communication, Amenities, Community, Reports, Realtime
} from './supabase';

// ─── Generic hook factory ──────────────────────────────────────────────────────
function useAsync(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn(...args);
      if (result?.error) throw result.error;
      setData(result?.data || result);
    } catch (e) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => { execute(); }, []);

  return { data, loading, error, refetch: execute };
}

// ─── MODULE 1: SOCIETY ────────────────────────────────────────────────────────
export function useSociety() {
  const [society, setSociety] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      Society.get(),
      Society.getBlocks(),
      Society.getFlats(),
    ]).then(([s, b, f]) => {
      setSociety(s.data);
      setBlocks(b.data || []);
      setFlats(f.data || []);
      setLoading(false);
    });
  }, []);

  const updateSociety = async (data) => {
    await Society.update(data);
    setSociety(prev => ({ ...prev, ...data }));
  };

  const addFlat = async (data) => {
    const { data: newFlat } = await Society.addFlat(data);
    setFlats(prev => [...prev, newFlat]);
    return newFlat;
  };

  return { society, blocks, flats, loading, updateSociety, addFlat };
}

// ─── MODULE 2: RESIDENTS ──────────────────────────────────────────────────────
export function useResidents() {
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await Residents.getAll();
    setResidents(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addResident = async (data) => {
    const { data: r } = await Residents.create(data);
    setResidents(prev => [...prev, r]);
    return r;
  };

  const updateResident = async (id, data) => {
    await Residents.update(id, data);
    setResidents(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
  };

  const deactivate = async (id) => {
    await Residents.deactivate(id);
    setResidents(prev => prev.filter(r => r.id !== id));
  };

  return { residents, loading, addResident, updateResident, deactivate, refetch: load };
}

export function useResidentProfile(id) {
  const [profile, setProfile] = useState(null);
  const [family, setFamily] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [pets, setPets] = useState([]);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      Residents.getById(id),
      Residents.getFamilyMembers(id),
      Residents.getVehicles(id),
      Residents.getDocs(id),
      Residents.getPets(id),
      Residents.getEmergencyContacts(id),
    ]).then(([p, f, v, d, pets, ec]) => {
      setProfile(p.data);
      setFamily(f.data || []);
      setVehicles(v.data || []);
      setDocuments(d.data || []);
      setPets(pets.data || []);
      setEmergencyContacts(ec.data || []);
      setLoading(false);
    });
  }, [id]);

  return { profile, family, vehicles, documents, pets, emergencyContacts, loading };
}

// ─── MODULE 3: FINANCIALS ─────────────────────────────────────────────────────
export function useFinancials(month) {
  const currentMonth = month || new Date().toISOString().slice(0, 7);
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [defaulters, setDefaulters] = useState([]);
  const [pendingExpenses, setPendingExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [inv, sum, def, exp] = await Promise.all([
      Financials.getInvoices({ month: currentMonth }),
      Financials.getMonthlyCollection(currentMonth),
      Financials.getDefaulterAging(),
      Financials.getExpenses({ status: 'pending' }),
    ]);
    setInvoices(inv.data || []);
    setSummary(sum.data);
    setDefaulters(def.data || []);
    setPendingExpenses(exp.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [currentMonth]);

  const recordPayment = async (invoiceId, amount, method, ref) => {
    const inv = invoices.find(i => i.id === invoiceId);
    const { data: payment } = await Financials.recordPayment({
      invoice_id: invoiceId,
      flat_id: inv?.flat_id,
      resident_id: inv?.resident_id,
      amount, method, reference: ref, status: 'success',
    });
    await load();
    return payment;
  };

  const approveExpense = async (id, approvedBy) => {
    await Financials.approveExpense(id, approvedBy);
    setPendingExpenses(prev => prev.filter(e => e.id !== id));
  };

  const rejectExpense = async (id, reason) => {
    await Financials.rejectExpense(id, reason);
    setPendingExpenses(prev => prev.filter(e => e.id !== id));
  };

  const generateBulkInvoices = async () => {
    await Financials.bulkGenerateInvoices(currentMonth);
    await load();
  };

  return { invoices, summary, defaulters, pendingExpenses, loading, recordPayment, approveExpense, rejectExpense, generateBulkInvoices, refetch: load };
}

export function useFlatLedger(flat) {
  return useAsync(() => Financials.getFlatLedger(flat), [flat]);
}

// ─── MODULE 4: COMPLAINTS ────────────────────────────────────────────────────
export function useComplaints(filters = {}) {
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState({});
  const [slaBreaches, setSlaBreaches] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [comp, st, sla] = await Promise.all([
      Complaints.getAll(filters),
      Complaints.getStats(),
      Complaints.getSLABreaches(),
    ]);
    setComplaints(comp.data || []);
    setStats(st);
    setSlaBreaches(sla.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [JSON.stringify(filters)]);

  // Realtime updates
  useEffect(() => {
    const channel = Realtime.onNewComplaint((payload) => {
      setComplaints(prev => [payload.new, ...prev]);
    });
    return () => Realtime.unsubscribe(channel);
  }, []);

  const raise = async (data) => {
    const { data: c } = await Complaints.create(data);
    setComplaints(prev => [c, ...prev]);
    return c;
  };

  const updateStatus = async (id, status, byName, notes) => {
    await Complaints.updateStatus(id, status, byName, notes);
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  };

  const resolve = async (id, resolution, byName) => {
    await Complaints.resolve(id, resolution, byName);
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: 'resolved', resolution } : c));
  };

  const vote = async (id, residentId) => {
    await Complaints.vote(id, residentId);
    await load();
  };

  return { complaints, stats, slaBreaches, loading, raise, updateStatus, resolve, vote, refetch: load };
}

// ─── MODULE 5: MAINTENANCE ───────────────────────────────────────────────────
export function useMaintenance() {
  const [tasks, setTasks] = useState([]);
  const [assets, setAssets] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [expiringAMC, setExpiringAMC] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [t, a, v, amc] = await Promise.all([
      Maintenance.getTasks(),
      Maintenance.getAssets(),
      Maintenance.getVendors(),
      Maintenance.getExpiringAMC(),
    ]);
    setTasks(t.data || []);
    setAssets(a.data || []);
    setVendors(v.data || []);
    setExpiringAMC(amc.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createTask = async (data) => {
    const { data: t } = await Maintenance.createTask(data);
    setTasks(prev => [t, ...prev]);
    return t;
  };

  const updateTask = async (id, data) => {
    await Maintenance.updateTask(id, data);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
  };

  return { tasks, assets, vendors, expiringAMC, loading, createTask, updateTask, refetch: load };
}

// ─── MODULE 6: GATE ───────────────────────────────────────────────────────────
export function useGate() {
  const [activeVisitors, setActiveVisitors] = useState([]);
  const [pendingDeliveries, setPendingDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [v, d] = await Promise.all([Gate.getActive(), Gate.getPending()]);
    setActiveVisitors(v.data || []);
    setPendingDeliveries(d.data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const vc = Realtime.onVisitor(() => load());
    const dc = Realtime.onDelivery(() => load());
    return () => { Realtime.unsubscribe(vc); Realtime.unsubscribe(dc); };
  }, []);

  const checkIn = async (data) => {
    const { data: v } = await Gate.logVisitor(data);
    setActiveVisitors(prev => [v, ...prev]);
    return v;
  };

  const checkOut = async (id) => {
    await Gate.checkOut(id);
    setActiveVisitors(prev => prev.filter(v => v.id !== id));
  };

  const collectDelivery = async (id, by) => {
    await Gate.markCollected(id, by);
    setPendingDeliveries(prev => prev.filter(d => d.id !== id));
  };

  return { activeVisitors, pendingDeliveries, loading, checkIn, checkOut, collectDelivery, refetch: load };
}

// ─── MODULE 7: STAFF ──────────────────────────────────────────────────────────
export function useStaff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Staff.getAll().then(({ data }) => {
      setStaff(data || []);
      setLoading(false);
    });
  }, []);

  const markAttendance = async (staffId, status, markedBy) => {
    await Staff.markAttendance({
      staff_id: staffId,
      date: new Date().toISOString().slice(0, 10),
      status,
      marked_by: markedBy,
      in_time: status === 'present' ? new Date().toTimeString().slice(0, 5) : null,
    });
  };

  return { staff, loading, markAttendance };
}

// ─── MODULE 8: MEETINGS ───────────────────────────────────────────────────────
export function useMeetings() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await MeetingsAPI.getAll();
    setMeetings(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async (data) => {
    const { data: m } = await MeetingsAPI.create(data);
    setMeetings(prev => [m, ...prev]);
    return m;
  };

  const rsvp = async (meetingId, residentId, response) => {
    await MeetingsAPI.rsvp(meetingId, residentId, response);
    setMeetings(prev => prev.map(m => {
      if (m.id !== meetingId) return m;
      const rsvp = { ...m.rsvp, [response]: (m.rsvp[response] || 0) + 1 };
      return { ...m, rsvp };
    }));
  };

  return { meetings, loading, create, rsvp, refetch: load };
}

// ─── MODULE 9: COMMUNICATION ─────────────────────────────────────────────────
export function useNotices() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await Communication.getNotices();
    setNotices(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async (data) => {
    const { data: n } = await Communication.createNotice(data);
    setNotices(prev => [n, ...prev]);
    return n;
  };

  return { notices, loading, create, refetch: load };
}

export function usePolls() {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myVotes, setMyVotes] = useState({});

  const load = async () => {
    const { data } = await Communication.getPolls();
    setPolls(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const vote = async (pollId, residentId, flatId, optionIdx) => {
    if (myVotes[pollId] !== undefined) return;
    await Communication.vote(pollId, residentId, flatId, optionIdx);
    setMyVotes(prev => ({ ...prev, [pollId]: optionIdx }));
    await load();
  };

  return { polls, loading, myVotes, vote };
}

// ─── MODULE 10: AMENITIES ─────────────────────────────────────────────────────
export function useAmenities() {
  const [amenities, setAmenities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [a, b] = await Promise.all([Amenities.getAll(), Amenities.getBookings({ date: today })]);
    setAmenities(a.data || []);
    setBookings(b.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const book = async (data) => {
    const { data: b } = await Amenities.book(data);
    setBookings(prev => [...prev, b]);
    return b;
  };

  const cancel = async (id, reason) => {
    await Amenities.cancel(id, reason);
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
  };

  return { amenities, bookings, loading, book, cancel, refetch: load };
}

// ─── DASHBOARD HEALTH SCORE ───────────────────────────────────────────────────
export function useHealthScore() {
  const [health, setHealth] = useState({ score: 0, collectionRate: 0, openComplaints: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Reports.getHealthScore().then(h => {
      setHealth(h);
      setLoading(false);
    });
  }, []);

  return { health, loading };
}

// ─── HARMONY SCORES ───────────────────────────────────────────────────────────
export function useHarmonyScores() {
  return useAsync(() => Reports.getHarmonyScores());
}

// ─── AUDIT LOG ────────────────────────────────────────────────────────────────
export function useAuditLog(module) {
  return useAsync(() => Reports.getAuditLog({ module }), [module]);
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
export function useNotifications(residentId) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!residentId) return;
    Reports.getNotifications(residentId).then(({ data }) => {
      setNotifications(data || []);
    });
  }, [residentId]);

  const markRead = async (id) => {
    await Reports.markNotificationRead(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markAllRead = async () => {
    await Reports.markAllRead(residentId);
    setNotifications([]);
  };

  return { notifications, count: notifications.length, markRead, markAllRead };
}

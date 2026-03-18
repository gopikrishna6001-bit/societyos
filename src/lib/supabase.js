// src/lib/supabase.js
// Single source of truth for all data operations
// Every UI component imports from here — never writes SQL directly

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const SOCIETY_ID = import.meta.env.VITE_SOCIETY_ID || 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } }
});

// ─── Helper ────────────────────────────────────────────────────────────────────
const sid = () => SOCIETY_ID;

// ─── MODULE 1: SOCIETY ─────────────────────────────────────────────────────────
export const Society = {
  get: () => supabase.from('societies').select('*').eq('id', sid()).single(),
  update: (data) => supabase.from('societies').update(data).eq('id', sid()),
  getBlocks: () => supabase.from('blocks').select('*').eq('society_id', sid()),
  addBlock: (data) => supabase.from('blocks').insert({ ...data, society_id: sid() }),
  getFlats: () => supabase.from('flats').select('*, blocks(name)').eq('society_id', sid()),
  addFlat: (data) => supabase.from('flats').insert({ ...data, society_id: sid() }),
  updateFlat: (id, data) => supabase.from('flats').update(data).eq('id', id),
};

// ─── MODULE 2: RESIDENTS ───────────────────────────────────────────────────────
export const Residents = {
  getAll: () => supabase.from('residents').select('*, flats(number,type,sqft,block_id)').eq('society_id', sid()).order('flat_number'),
  getByFlat: (flat) => supabase.from('residents').select('*').eq('society_id', sid()).eq('flat_number', flat),
  getById: (id) => supabase.from('residents').select('*').eq('id', id).single(),
  create: (data) => supabase.from('residents').insert({ ...data, society_id: sid() }).select().single(),
  update: (id, data) => supabase.from('residents').update(data).eq('id', id),
  deactivate: (id) => supabase.from('residents').update({ status: 'inactive', move_out_date: new Date().toISOString().slice(0,10) }).eq('id', id),

  // Family
  getFamilyMembers: (residentId) => supabase.from('family_members').select('*').eq('resident_id', residentId),
  addFamilyMember: (data) => supabase.from('family_members').insert(data),
  removeFamilyMember: (id) => supabase.from('family_members').delete().eq('id', id),

  // Vehicles
  getVehicles: (residentId) => supabase.from('vehicles').select('*').eq('resident_id', residentId),
  addVehicle: (data) => supabase.from('vehicles').insert({ ...data, society_id: sid() }),
  removeVehicle: (id) => supabase.from('vehicles').delete().eq('id', id),

  // Documents
  getDocs: (residentId) => supabase.from('resident_documents').select('*').eq('resident_id', residentId),
  addDoc: (data) => supabase.from('resident_documents').insert(data),

  // Pets
  getPets: (residentId) => supabase.from('pets').select('*').eq('resident_id', residentId),
  addPet: (data) => supabase.from('pets').insert(data),

  // Emergency contacts
  getEmergencyContacts: (residentId) => supabase.from('emergency_contacts').select('*').eq('resident_id', residentId),
  addEmergencyContact: (data) => supabase.from('emergency_contacts').insert(data),

  // Move history
  logMove: (data) => supabase.from('move_history').insert({ ...data, society_id: sid() }),
  getMoveHistory: (flatId) => supabase.from('move_history').select('*').eq('flat_id', flatId).order('date', { ascending: false }),
};

// ─── MODULE 3: ROLES ───────────────────────────────────────────────────────────
export const Roles = {
  getAll: () => supabase.from('roles').select('*').eq('society_id', sid()),
  create: (data) => supabase.from('roles').insert({ ...data, society_id: sid() }),
  update: (id, data) => supabase.from('roles').update(data).eq('id', id),
  delete: (id) => supabase.from('roles').delete().eq('id', id).eq('is_system', false),

  // User roles
  assignRole: (residentId, roleId, assignedBy) =>
    supabase.from('user_roles').upsert({ resident_id: residentId, role_id: roleId, society_id: sid(), assigned_by: assignedBy, active: true }),
  removeRole: (residentId, roleId) =>
    supabase.from('user_roles').update({ active: false }).eq('resident_id', residentId).eq('role_id', roleId),
  getResidentRoles: (residentId) =>
    supabase.from('user_roles').select('*, roles(name, color, permissions)').eq('resident_id', residentId).eq('active', true),

  // Committee
  getCommittee: () =>
    supabase.from('committee_members').select('*, residents(name, phone, flat_number, profile_photo)').eq('society_id', sid()).eq('active', true),
  addToCommittee: (data) => supabase.from('committee_members').insert({ ...data, society_id: sid() }),
  removeFromCommittee: (id) => supabase.from('committee_members').update({ active: false }).eq('id', id),
};

// ─── MODULE 4: FINANCIALS ──────────────────────────────────────────────────────
export const Financials = {
  // Invoices
  getInvoices: ({ month, status, flat } = {}) => {
    let q = supabase.from('invoices').select('*').eq('society_id', sid());
    if (month) q = q.eq('month', month);
    if (status) q = q.eq('status', status);
    if (flat) q = q.eq('flat_number', flat);
    return q.order('created_at', { ascending: false });
  },
  getInvoiceByFlat: (flat, month) =>
    supabase.from('invoices').select('*').eq('society_id', sid()).eq('flat_number', flat).eq('month', month).single(),
  getFlatLedger: (flat) =>
    supabase.from('invoices').select('*, payments(*)').eq('society_id', sid()).eq('flat_number', flat).order('month', { ascending: false }),
  createInvoice: (data) => supabase.from('invoices').insert({ ...data, society_id: sid() }).select().single(),
  updateInvoice: (id, data) => supabase.from('invoices').update(data).eq('id', id),
  cancelInvoice: (id, reason) => supabase.from('invoices').update({ status: 'cancelled', notes: reason }).eq('id', id),
  waivePenalty: (id, reason, waivedBy) =>
    supabase.from('invoices').update({ late_fee: 0, penalty_waived: true, waiver_reason: reason, waiver_by: waivedBy }).eq('id', id),

  // Bulk invoice generation
  bulkGenerateInvoices: async (month) => {
    const { data: residents } = await Residents.getAll();
    const { data: society } = await Society.get();
    const invoices = residents
      .filter(r => r.status === 'active')
      .map(r => ({
        society_id: sid(),
        flat_number: r.flat_number,
        resident_id: r.id,
        month,
        due_date: `${month}-${String(society.due_date_day).padStart(2,'0')}`,
        line_items: [{ head: 'Maintenance', amount: society.monthly_fee, gst: 0 }],
        subtotal: society.monthly_fee,
        total_amount: society.monthly_fee,
        balance_due: society.monthly_fee,
        status: 'unpaid',
      }));
    return supabase.from('invoices').insert(invoices);
  },

  // Payments
  recordPayment: (data) => supabase.from('payments').insert({ ...data }).select().single(),
  getPayments: ({ flat, invoiceId } = {}) => {
    let q = supabase.from('payments').select('*').eq('status', 'success');
    if (flat) q = q.eq('flat_number', flat);
    if (invoiceId) q = q.eq('invoice_id', invoiceId);
    return q.order('paid_at', { ascending: false });
  },
  recordChequeReturn: (paymentId, reason) =>
    supabase.from('cheque_bounces').insert({ payment_id: paymentId, reason }),

  // Expenses
  getExpenses: ({ status, category, month } = {}) => {
    let q = supabase.from('expenses').select('*, vendors(name)').eq('society_id', sid());
    if (status) q = q.eq('status', status);
    if (category) q = q.eq('category_id', category);
    return q.order('expense_date', { ascending: false });
  },
  createExpense: (data) => supabase.from('expenses').insert({ ...data, society_id: sid() }).select().single(),
  approveExpense: (id, approvedBy) =>
    supabase.from('expenses').update({ status: 'approved', approved_by: approvedBy, approved_at: new Date().toISOString() }).eq('id', id),
  rejectExpense: (id, reason) =>
    supabase.from('expenses').update({ status: 'rejected', rejected_reason: reason }).eq('id', id),

  // Budget
  getBudget: (fy) => supabase.from('budget').select('*').eq('society_id', sid()).eq('fy', fy),
  setBudgetLine: (data) => supabase.from('budget').upsert({ ...data, society_id: sid() }),

  // Charge heads
  getChargeHeads: () => supabase.from('charge_heads').select('*').eq('society_id', sid()).eq('active', true),
  addChargeHead: (data) => supabase.from('charge_heads').insert({ ...data, society_id: sid() }),
  updateChargeHead: (id, data) => supabase.from('charge_heads').update(data).eq('id', id),

  // Reports
  getMonthlyCollection: (month) =>
    supabase.from('v_monthly_collection').select('*').eq('society_id', sid()).eq('month', month).single(),
  getDefaulterAging: () =>
    supabase.from('v_defaulter_aging').select('*').eq('society_id', sid()).order('total_outstanding', { ascending: false }),
  getIncomeStatement: async (fromMonth, toMonth) => {
    const [{ data: invoices }, { data: expenses }] = await Promise.all([
      supabase.from('invoices').select('month, total_amount, amount_paid, status').eq('society_id', sid()).gte('month', fromMonth).lte('month', toMonth),
      supabase.from('expenses').select('expense_date, amount, status').eq('society_id', sid()).eq('status', 'paid').gte('expense_date', `${fromMonth}-01`).lte('expense_date', `${toMonth}-31`),
    ]);
    return { invoices, expenses };
  },
};

// ─── MODULE 5: COMPLAINTS ─────────────────────────────────────────────────────
export const Complaints = {
  getAll: ({ status, flat, category, priority } = {}) => {
    let q = supabase.from('complaints').select('*, committee_members(id, residents(name))').eq('society_id', sid());
    if (status) q = q.eq('status', status);
    if (flat) q = q.eq('flat_number', flat);
    if (category) q = q.eq('category', category);
    if (priority) q = q.eq('priority', priority);
    return q.order('created_at', { ascending: false });
  },
  getById: (id) => supabase.from('complaints').select('*, complaint_comments(*), complaint_history(*)').eq('id', id).single(),
  getByTicket: (ticket) => supabase.from('complaints').select('*').eq('ticket_number', ticket).single(),
  create: (data) => supabase.from('complaints').insert({ ...data, society_id: sid() }).select().single(),
  updateStatus: async (id, newStatus, byName, notes) => {
    const { data: old } = await supabase.from('complaints').select('status').eq('id', id).single();
    await supabase.from('complaint_history').insert({ complaint_id: id, from_status: old?.status, to_status: newStatus, changed_by: byName, notes });
    return supabase.from('complaints').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
  },
  assign: (id, memberId, memberName) =>
    Complaints.updateStatus(id, 'assigned', memberName, `Assigned to ${memberName}`).then(() =>
      supabase.from('complaints').update({ assigned_to: memberId }).eq('id', id)),
  resolve: (id, resolution, byName) => {
    Complaints.updateStatus(id, 'resolved', byName, resolution);
    return supabase.from('complaints').update({ status: 'resolved', resolution, resolved_at: new Date().toISOString() }).eq('id', id);
  },
  addComment: (complaintId, authorName, authorRole, comment, isInternal = false) =>
    supabase.from('complaint_comments').insert({ complaint_id: complaintId, author_name: authorName, author_role: authorRole, comment, is_internal: isInternal }),
  vote: async (id, residentId) => {
    const { data: existing } = await supabase.from('complaint_votes').select('id').eq('complaint_id', id).eq('resident_id', residentId).single();
    const { data: c } = await supabase.from('complaints').select('votes').eq('id', id).single();
    if (existing) {
      await supabase.from('complaint_votes').delete().eq('id', existing.id);
      return supabase.from('complaints').update({ votes: Math.max(0, (c?.votes || 1) - 1) }).eq('id', id);
    }
    await supabase.from('complaint_votes').insert({ complaint_id: id, resident_id: residentId });
    return supabase.from('complaints').update({ votes: (c?.votes || 0) + 1 }).eq('id', id);
  },
  checkVote: (id, residentId) =>
    supabase.from('complaint_votes').select('id').eq('complaint_id', id).eq('resident_id', residentId).single(),
  getSLABreaches: () =>
    supabase.from('v_complaint_sla').select('*').eq('society_id', sid()).eq('sla_breached', true),
  getStats: async () => {
    const [open, resolved, escalated] = await Promise.all([
      supabase.from('complaints').select('id', { count: 'exact' }).eq('society_id', sid()).eq('status', 'open'),
      supabase.from('complaints').select('id', { count: 'exact' }).eq('society_id', sid()).eq('status', 'resolved'),
      supabase.from('complaints').select('id', { count: 'exact' }).eq('society_id', sid()).eq('status', 'escalated'),
    ]);
    return { open: open.count, resolved: resolved.count, escalated: escalated.count };
  },
};

// ─── MODULE 6: MAINTENANCE ────────────────────────────────────────────────────
export const Maintenance = {
  getTasks: ({ status, category } = {}) => {
    let q = supabase.from('maintenance_tasks').select('*, assets(name), vendors(name)').eq('society_id', sid());
    if (status) q = q.eq('status', status);
    if (category) q = q.eq('category', category);
    return q.order('created_at', { ascending: false });
  },
  createTask: (data) => supabase.from('maintenance_tasks').insert({ ...data, society_id: sid() }).select().single(),
  updateTask: (id, data) => supabase.from('maintenance_tasks').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id),

  // Assets
  getAssets: () => supabase.from('assets').select('*, amc_contracts(*)').eq('society_id', sid()),
  addAsset: (data) => supabase.from('assets').insert({ ...data, society_id: sid() }),
  updateAsset: (id, data) => supabase.from('assets').update(data).eq('id', id),
  getExpiringAMC: (days = 60) =>
    supabase.from('amc_contracts').select('*, assets(name)').lte('end_date', new Date(Date.now() + days*86400000).toISOString().slice(0,10)).eq('status', 'active'),

  // Preventive schedule
  getSchedule: () => supabase.from('preventive_schedule').select('*, assets(name)').eq('society_id', sid()).order('next_due'),
  updateScheduleCompletion: (id) =>
    supabase.from('preventive_schedule').update({ last_done: new Date().toISOString().slice(0,10) }).eq('id', id),

  // Vendors
  getVendors: () => supabase.from('vendors').select('*').eq('society_id', sid()).eq('blacklisted', false),
  addVendor: (data) => supabase.from('vendors').insert({ ...data, society_id: sid() }),
  rateVendor: (id, rating, feedback) => supabase.from('vendors').update({ rating, notes: feedback }).eq('id', id),
  blacklistVendor: (id, reason) => supabase.from('vendors').update({ blacklisted: true, blacklist_reason: reason }).eq('id', id),
};

// ─── MODULE 7: SECURITY & GATE ────────────────────────────────────────────────
export const Gate = {
  // Visitors
  logVisitor: (data) => supabase.from('visitors').insert({ ...data, society_id: sid() }).select().single(),
  checkOut: (id) => supabase.from('visitors').update({ out_time: new Date().toISOString(), status: 'checked-out' }).eq('id', id),
  deny: (id, reason) => supabase.from('visitors').update({ status: 'denied', notes: reason }).eq('id', id),
  getActive: () => supabase.from('visitors').select('*').eq('society_id', sid()).eq('status', 'inside').order('in_time', { ascending: false }),
  getExpected: () => supabase.from('visitors').select('*').eq('society_id', sid()).eq('status', 'expected'),
  getHistory: ({ date, flat } = {}) => {
    let q = supabase.from('visitors').select('*').eq('society_id', sid());
    if (date) q = q.gte('in_time', `${date}T00:00:00`).lte('in_time', `${date}T23:59:59`);
    if (flat) q = q.eq('flat_number', flat);
    return q.order('in_time', { ascending: false });
  },
  preApprove: (data) => supabase.from('visitors').insert({ ...data, society_id: sid(), status: 'expected' }),
  approveVisitor: (id, approvedById) =>
    supabase.from('visitors').update({ approved_by: approvedById, otp_verified: true }).eq('id', id),

  // Frequent visitors
  getFrequent: (flatId) => supabase.from('frequent_visitors').select('*').eq('flat_id', flatId).eq('active', true),
  addFrequent: (data) => supabase.from('frequent_visitors').insert({ ...data, society_id: sid() }),
  removeFrequent: (id) => supabase.from('frequent_visitors').update({ active: false }).eq('id', id),

  // Deliveries
  logDelivery: (data) => supabase.from('deliveries').insert({ ...data, society_id: sid() }).select().single(),
  markCollected: (id, collectedBy) =>
    supabase.from('deliveries').update({ status: 'collected', collected_at: new Date().toISOString(), collected_by: collectedBy }).eq('id', id),
  getPending: () =>
    supabase.from('deliveries').select('*').eq('society_id', sid()).eq('status', 'at-gate').order('in_time', { ascending: false }),

  // Blacklist
  getBlacklist: () => supabase.from('blacklist').select('*').eq('society_id', sid()).eq('active', true),
  addToBlacklist: (data) => supabase.from('blacklist').insert({ ...data, society_id: sid() }),
  removeFromBlacklist: (id) => supabase.from('blacklist').update({ active: false }).eq('id', id),
  checkBlacklist: (phone) => supabase.from('blacklist').select('*').eq('society_id', sid()).eq('phone', phone).eq('active', true),

  // Incidents
  logIncident: (data) => supabase.from('security_incidents').insert({ ...data, society_id: sid() }),
  getIncidents: () => supabase.from('security_incidents').select('*').eq('society_id', sid()).order('time', { ascending: false }),
};

// ─── MODULE 8: STAFF ──────────────────────────────────────────────────────────
export const Staff = {
  getAll: () => supabase.from('staff').select('*').eq('society_id', sid()).eq('status', 'active'),
  getById: (id) => supabase.from('staff').select('*').eq('id', id).single(),
  create: (data) => supabase.from('staff').insert({ ...data, society_id: sid() }).select().single(),
  update: (id, data) => supabase.from('staff').update(data).eq('id', id),
  terminate: (id, date) => supabase.from('staff').update({ status: 'terminated', date_of_leaving: date }).eq('id', id),

  // Attendance
  markAttendance: (data) => supabase.from('staff_attendance').upsert({ ...data, society_id: sid() }),
  getAttendance: (staffId, month) =>
    supabase.from('staff_attendance').select('*').eq('staff_id', staffId).ilike('date', `${month}%`).order('date'),
  getMonthSummary: (month) =>
    supabase.from('v_staff_attendance_summary').select('*').eq('society_id', sid()).ilike('month', `${month}%`),

  // Leaves
  applyLeave: (data) => supabase.from('staff_leaves').insert(data),
  approveLeave: (id, approvedBy) => supabase.from('staff_leaves').update({ status: 'approved', approved_by: approvedBy }).eq('id', id),
  rejectLeave: (id) => supabase.from('staff_leaves').update({ status: 'rejected' }).eq('id', id),
  getLeaves: (staffId) => supabase.from('staff_leaves').select('*').eq('staff_id', staffId).order('from_date', { ascending: false }),

  // Salary
  getSalary: (staffId) => supabase.from('staff_salary').select('*').eq('staff_id', staffId).order('month', { ascending: false }),
  processSalary: (data) => supabase.from('staff_salary').upsert({ ...data, society_id: sid() }),
  getDutyLog: (staffId, date) => supabase.from('duty_log').select('*').eq('staff_id', staffId).eq('date', date),
  addDutyLog: (data) => supabase.from('duty_log').insert({ ...data, society_id: sid() }),
};

// ─── MODULE 9: MEETINGS ───────────────────────────────────────────────────────
export const Meetings = {
  getAll: () => supabase.from('meetings').select('*').eq('society_id', sid()).order('date', { ascending: false }),
  getById: (id) => supabase.from('meetings').select('*, meeting_rsvps(*), motions(*)').eq('id', id).single(),
  create: (data) => supabase.from('meetings').insert({ ...data, society_id: sid() }).select().single(),
  update: (id, data) => supabase.from('meetings').update(data).eq('id', id),
  saveMinutes: (id, minutes, isFinal = false) =>
    supabase.from('meetings').update(isFinal ? { minutes_final: minutes, status: 'completed' } : { minutes_draft: minutes }).eq('id', id),
  rsvp: (meetingId, residentId, response) =>
    supabase.from('meeting_rsvps').upsert({ meeting_id: meetingId, resident_id: residentId, response }),

  // Motions
  addMotion: (data) => supabase.from('motions').insert(data).select().single(),
  voteOnMotion: async (motionId, memberId, vote) => {
    await supabase.from('motion_votes').upsert({ motion_id: motionId, voter_id: memberId, vote });
    const { data: votes } = await supabase.from('motion_votes').select('vote').eq('motion_id', motionId);
    const yes = votes.filter(v => v.vote === 'yes').length;
    const no = votes.filter(v => v.vote === 'no').length;
    const abstain = votes.filter(v => v.vote === 'abstain').length;
    return supabase.from('motions').update({ votes_yes: yes, votes_no: no, votes_abstain: abstain }).eq('id', motionId);
  },
  passMotion: (id, notes) => supabase.from('motions').update({ status: 'passed', result_notes: notes }).eq('id', id),
};

// ─── MODULE 10: COMMUNICATION ─────────────────────────────────────────────────
export const Communication = {
  // Notices
  getNotices: () => supabase.from('notices').select('*').eq('society_id', sid()).order('created_at', { ascending: false }),
  createNotice: (data) => supabase.from('notices').insert({ ...data, society_id: sid() }).select().single(),
  pinNotice: (id, pinUntil) => supabase.from('notices').update({ pinned: true, pin_expiry: pinUntil }).eq('id', id),
  unpinNotice: (id) => supabase.from('notices').update({ pinned: false }).eq('id', id),
  markRead: (noticeId, residentId) => supabase.from('notice_reads').upsert({ notice_id: noticeId, resident_id: residentId }),

  // Polls
  getPolls: () => supabase.from('polls').select('*').eq('society_id', sid()).order('created_at', { ascending: false }),
  createPoll: (data) => supabase.from('polls').insert({ ...data, society_id: sid() }).select().single(),
  vote: async (pollId, residentId, flatId, optionIdx) => {
    const { error } = await supabase.from('poll_votes').insert({ poll_id: pollId, resident_id: residentId, flat_id: flatId, option_idx: optionIdx });
    if (error) return { error };
    const { data: poll } = await supabase.from('polls').select('votes, total').eq('id', pollId).single();
    const newVotes = [...(poll.votes || [])];
    newVotes[optionIdx] = (newVotes[optionIdx] || 0) + 1;
    return supabase.from('polls').update({ votes: newVotes, total: poll.total + 1 }).eq('id', pollId);
  },
  checkVote: (pollId, flatId) => supabase.from('poll_votes').select('option_idx').eq('poll_id', pollId).eq('flat_id', flatId).single(),
  closePoll: (id) => supabase.from('polls').update({ status: 'closed' }).eq('id', id),

  // WhatsApp
  logWA: (data) => supabase.from('whatsapp_log').insert({ ...data, society_id: sid() }),
  getWALog: (limit = 50) => supabase.from('whatsapp_log').select('*').eq('society_id', sid()).order('created_at', { ascending: false }).limit(limit),
  getTemplates: () => supabase.from('message_templates').select('*').eq('society_id', sid()).eq('active', true),
};

// ─── MODULE 11: AMENITIES ─────────────────────────────────────────────────────
export const Amenities = {
  getAll: () => supabase.from('amenities').select('*').eq('society_id', sid()),
  getBookings: ({ date, amenityId, flat } = {}) => {
    let q = supabase.from('amenity_bookings').select('*, amenities(name), residents(name)').eq('society_id', sid());
    if (date) q = q.eq('date', date);
    if (amenityId) q = q.eq('amenity_id', amenityId);
    if (flat) q = q.eq('flat_number', flat);
    return q.order('date', { ascending: false });
  },
  book: (data) => supabase.from('amenity_bookings').insert({ ...data, society_id: sid() }).select().single(),
  cancel: (id, reason) => supabase.from('amenity_bookings').update({ status: 'cancelled', cancelled_reason: reason }).eq('id', id),
  checkAvailability: (amenityId, date, slotStart) =>
    supabase.from('amenity_bookings').select('id').eq('amenity_id', amenityId).eq('date', date).eq('slot_start', slotStart).eq('status', 'confirmed'),
  setMaintenance: (id, note) => supabase.from('amenities').update({ status: 'maintenance', maintenance_note: note }).eq('id', id),
  restore: (id) => supabase.from('amenities').update({ status: 'available', maintenance_note: null }).eq('id', id),
};

// ─── MODULE 12: COMMUNITY ─────────────────────────────────────────────────────
export const Community = {
  // Campaigns
  getCampaigns: () => supabase.from('campaigns').select('*').eq('society_id', sid()).order('date', { ascending: false }),
  createCampaign: (data) => supabase.from('campaigns').insert({ ...data, society_id: sid() }),
  joinCampaign: async (campaignId, residentId) => {
    const { error } = await supabase.from('campaign_joins').upsert({ campaign_id: campaignId, resident_id: residentId });
    if (error) return { error };
    const { data: c } = await supabase.from('campaigns').select('joined_count').eq('id', campaignId).single();
    return supabase.from('campaigns').update({ joined_count: (c?.joined_count || 0) + 1 }).eq('id', campaignId);
  },
  leaveCampaign: (campaignId, residentId) =>
    supabase.from('campaign_joins').delete().eq('campaign_id', campaignId).eq('resident_id', residentId),

  // Volunteers
  getVolunteers: () =>
    supabase.from('volunteers').select('*, residents(name, flat_number), volunteer_tasks(*), appreciations(*)').eq('society_id', sid()).order('hero_points', { ascending: false }),
  addAppreciation: async (volunteerId, fromFlat, fromName, message) => {
    await supabase.from('appreciations').insert({ volunteer_id: volunteerId, from_flat: fromFlat, from_name: fromName, message, society_id: sid() });
    const { data: v } = await supabase.from('volunteers').select('hero_points').eq('id', volunteerId).single();
    return supabase.from('volunteers').update({ hero_points: (v?.hero_points || 0) + 20 }).eq('id', volunteerId);
  },
  completeTask: async (taskId, volunteerId) => {
    const { data: task } = await supabase.from('volunteer_tasks').select('points').eq('id', taskId).single();
    const { data: v } = await supabase.from('volunteers').select('hero_points, completed_tasks').eq('id', volunteerId).single();
    await supabase.from('volunteer_tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', taskId);
    return supabase.from('volunteers').update({
      hero_points: (v?.hero_points || 0) + (task?.points || 25),
      completed_tasks: (v?.completed_tasks || 0) + 1,
    }).eq('id', volunteerId);
  },

  // Forum
  getTopics: () => supabase.from('forum_topics').select('*').eq('society_id', sid()).order('created_at', { ascending: false }),
  createTopic: (data) => supabase.from('forum_topics').insert({ ...data, society_id: sid() }),
  getReplies: (topicId) => supabase.from('forum_replies').select('*').eq('topic_id', topicId).order('created_at'),
  addReply: (data) => supabase.from('forum_replies').insert(data),

  // Classifieds
  getClassifieds: () => supabase.from('classifieds').select('*').eq('society_id', sid()).eq('status', 'active').order('created_at', { ascending: false }),
  createListing: (data) => supabase.from('classifieds').insert({ ...data, society_id: sid() }),
  closeListing: (id) => supabase.from('classifieds').update({ status: 'closed' }).eq('id', id),
};

// ─── REPORTS ──────────────────────────────────────────────────────────────────
export const Reports = {
  // Society health score
  getHealthScore: async () => {
    const [complaints, invoices, polls, residents] = await Promise.all([
      supabase.from('complaints').select('status').eq('society_id', sid()),
      supabase.from('invoices').select('status').eq('society_id', sid()).ilike('month', `${new Date().toISOString().slice(0,7)}%`),
      supabase.from('poll_votes').select('id', { count: 'exact' }).eq('society_id', sid()),
      supabase.from('residents').select('id', { count: 'exact' }).eq('society_id', sid()),
    ]);
    const openComplaints = complaints.data?.filter(c => c.status === 'open').length || 0;
    const paidInvoices = invoices.data?.filter(i => i.status === 'paid').length || 0;
    const totalInvoices = invoices.data?.length || 1;
    const collectionRate = Math.round((paidInvoices / totalInvoices) * 100);
    const score = Math.min(100, Math.max(0, collectionRate - openComplaints * 3));
    return { score, collectionRate, openComplaints };
  },

  // Harmony scores
  getHarmonyScores: () =>
    supabase.from('v_harmony_scores').select('*').eq('society_id', sid()).order('harmony_score', { ascending: false }),

  // Audit trail
  getAuditLog: ({ module, limit = 100 } = {}) => {
    let q = supabase.from('audit_log').select('*').eq('society_id', sid());
    if (module) q = q.eq('module', module);
    return q.order('created_at', { ascending: false }).limit(limit);
  },

  // Notifications
  getNotifications: (residentId) =>
    supabase.from('notifications').select('*').eq('resident_id', residentId).eq('read', false).order('created_at', { ascending: false }),
  markNotificationRead: (id) => supabase.from('notifications').update({ read: true }).eq('id', id),
  markAllRead: (residentId) => supabase.from('notifications').update({ read: true }).eq('resident_id', residentId),
};

// ─── REALTIME SUBSCRIPTIONS ───────────────────────────────────────────────────
export const Realtime = {
  // Subscribe to new complaints
  onNewComplaint: (callback) =>
    supabase.channel('complaints').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'complaints', filter: `society_id=eq.${sid()}` }, callback).subscribe(),

  // Subscribe to payment updates
  onPayment: (callback) =>
    supabase.channel('payments').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' }, callback).subscribe(),

  // Subscribe to visitor entries
  onVisitor: (callback) =>
    supabase.channel('visitors').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'visitors', filter: `society_id=eq.${sid()}` }, callback).subscribe(),

  // Subscribe to new deliveries
  onDelivery: (callback) =>
    supabase.channel('deliveries').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deliveries', filter: `society_id=eq.${sid()}` }, callback).subscribe(),

  unsubscribe: (channel) => supabase.removeChannel(channel),
};

export default supabase;

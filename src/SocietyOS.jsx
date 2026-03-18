import NoticesReal from "./components/Notices.jsx";
import PollsReal from "./components/Polls.jsx";
import MeetingsReal from "./components/Meetings.jsx";
import AmenitiesReal from "./components/Amenities.jsx";
import GateReal from "./components/Gate.jsx";
import ResidentsReal from "./components/Residents.jsx";
import ComplaintsReal from "./components/Complaints.jsx";
import FinancesReal from "./components/Finances.jsx";
import { useState, useEffect, useRef } from "react";

const ANTHROPIC_API_URL = typeof import.meta !== "undefined" && import.meta.env?.VITE_AI_ENDPOINT
  ? import.meta.env.VITE_AI_ENDPOINT
  : "https://api.anthropic.com/v1/messages";

// ─── Data Store ─────────────────────────────────────────────────────────────
const INITIAL_DATA = {
  complaints: [
    { id: 1, title: "Parking space blocked by flat 304", category: "Parking", status: "open", votes: 12, flat: "201", date: "2026-03-10", description: "The resident of 304 parks in visitor zone daily blocking access.", comments: 3, priority: "high" },
    { id: 2, title: "Water supply disruption 2nd floor", category: "Utilities", status: "resolved", votes: 8, flat: "202", date: "2026-03-05", description: "Water supply was cut for 6 hours without notice.", comments: 5, priority: "medium" },
    { id: 3, title: "Loud music after midnight from 501", category: "Noise", status: "mediating", votes: 18, flat: "103", date: "2026-03-12", description: "Repeated incidents of loud music past 12am causing disturbance.", comments: 7, priority: "high" },
    { id: 4, title: "Common area lights not working", category: "Maintenance", status: "open", votes: 6, flat: "402", date: "2026-03-14", description: "Staircase lights on floors 3 and 4 not functioning for 2 weeks.", comments: 2, priority: "medium" },
    { id: 5, title: "Dog waste not cleaned by owner", category: "Hygiene", status: "open", votes: 21, flat: "305", date: "2026-03-15", description: "Resident of 305 lets their dog use the garden without cleaning.", comments: 9, priority: "medium" },
  ],
  maintenance: [
    { id: 1, title: "Elevator servicing", category: "Lift", status: "scheduled", date: "2026-03-20", flat: "Society", assignee: "TechLift Co.", priority: "high" },
    { id: 2, title: "Terrace waterproofing", category: "Structure", status: "in-progress", date: "2026-03-08", flat: "Society", assignee: "BuildRight", priority: "high" },
    { id: 3, title: "Generator fuel refill", category: "Power", status: "completed", date: "2026-03-01", flat: "Society", assignee: "PowerGen", priority: "medium" },
    { id: 4, title: "Plumbing repair Flat 102", category: "Plumbing", status: "open", date: "2026-03-16", flat: "102", assignee: "Unassigned", priority: "medium" },
  ],
  finances: {
    balance: 284500,
    monthlyCollection: 45000,
    expenses: [
      { id: 1, description: "Security guard salary", amount: 18000, date: "2026-03-01", category: "Security", approved: true },
      { id: 2, description: "Elevator maintenance", amount: 8500, date: "2026-03-05", category: "Maintenance", approved: true },
      { id: 3, description: "Water tank cleaning", amount: 3200, date: "2026-03-10", category: "Utilities", approved: true },
      { id: 4, description: "Garden upkeep", amount: 2800, date: "2026-03-12", category: "Landscaping", approved: true },
      { id: 5, description: "New CCTV cameras (proposed)", amount: 35000, date: "2026-03-18", category: "Security", approved: false },
    ],
    collections: [
      { flat: "101", name: "Sharma", paid: true, amount: 3000 },
      { flat: "102", name: "Reddy", paid: true, amount: 3000 },
      { flat: "103", name: "Patel", paid: false, amount: 3000 },
      { flat: "201", name: "Kumar", paid: true, amount: 3000 },
      { flat: "202", name: "Singh", paid: true, amount: 3000 },
      { flat: "301", name: "Mehta", paid: false, amount: 3000 },
      { flat: "302", name: "Nair", paid: true, amount: 3000 },
      { flat: "303", name: "Rao", paid: true, amount: 3000 },
      { flat: "304", name: "Gupta", paid: false, amount: 3000 },
      { flat: "305", name: "Iyer", paid: true, amount: 3000 },
    ]
  },
  polls: [
    { id: 1, question: "Should we install CCTV cameras in the parking area?", options: ["Yes, immediately", "Yes, but cheaper option", "No, not needed"], votes: [14, 5, 3], total: 22, deadline: "2026-03-25", status: "active" },
    { id: 2, question: "What should be the maintenance fee for FY 2026-27?", options: ["₹3,000/month (same)", "₹3,500/month (+500)", "₹4,000/month (+1000)"], votes: [8, 11, 3], total: 22, deadline: "2026-03-30", status: "active" },
    { id: 3, question: "New security timing: Should guards shift to 24x7?", options: ["Yes, full 24x7", "Current 6am-10pm is fine", "Hire night watchman only"], votes: [16, 4, 2], total: 22, deadline: "2026-03-15", status: "closed" },
  ],
  notices: [
    { id: 1, title: "AGM Scheduled for March 30th", content: "Annual General Meeting will be held at 6pm in the clubhouse. Attendance mandatory for all flat owners.", date: "2026-03-16", author: "Secretary", type: "important", pinned: true },
    { id: 2, title: "Water supply disruption: March 20th", content: "Borewell maintenance scheduled 10am-2pm. Please store water in advance.", date: "2026-03-15", author: "Committee", type: "alert", pinned: true },
    { id: 3, title: "New parking rules effective April 1st", content: "Visitor parking limited to 2 hours. Flat owners must display parking sticker.", date: "2026-03-12", author: "Secretary", type: "info", pinned: false },
    { id: 4, title: "Swachh Bharat drive: March 22nd", content: "All residents invited for cleaning drive on World Water Day. Meet at 7am.", date: "2026-03-10", author: "Welfare", type: "community", pinned: false },
  ],
  conflicts: [
    { id: 1, parties: ["Flat 304", "Flat 201"], issue: "Parking Dispute", status: "ai-mediated", resolution: "AI recommended assigned parking slots with a 2-week trial period. Both parties agreed.", date: "2026-03-08", severity: "medium" },
    { id: 2, parties: ["Flat 501", "Multiple Residents"], issue: "Noise Complaint", status: "open", resolution: null, date: "2026-03-12", severity: "high" },
    { id: 3, parties: ["Flat 305", "Welfare Committee"], issue: "Pet Rules Violation", status: "pending", resolution: null, date: "2026-03-15", severity: "low" },
  ],
  residents: [
    { flat: "101", name: "Ramesh Sharma", phone: "98490XXXXX", email: "sharma@email.com", type: "owner", since: "2019-06-01", members: 4, vehicle: "TS09AB1234", avatar: "RS", paidMonths: 36, defaultMonths: 0, complaintsAgainst: 0, complaintsRaised: 2, pollsVoted: 6, pollsTotal: 6 },
    { flat: "102", name: "Suresh Reddy", phone: "97400XXXXX", email: "reddy@email.com", type: "owner", since: "2020-01-15", members: 3, vehicle: "TS10CD5678", avatar: "SR", paidMonths: 35, defaultMonths: 1, complaintsAgainst: 0, complaintsRaised: 1, pollsVoted: 5, pollsTotal: 6 },
    { flat: "103", name: "Amit Patel", phone: "91230XXXXX", email: "patel@email.com", type: "tenant", since: "2023-04-01", members: 2, vehicle: "MH12EF9012", avatar: "AP", paidMonths: 33, defaultMonths: 3, complaintsAgainst: 1, complaintsRaised: 3, pollsVoted: 4, pollsTotal: 6 },
    { flat: "201", name: "Vijay Kumar", phone: "88900XXXXX", email: "kumar@email.com", type: "owner", since: "2018-11-20", members: 5, vehicle: "TS07GH3456", avatar: "VK", paidMonths: 36, defaultMonths: 0, complaintsAgainst: 0, complaintsRaised: 1, pollsVoted: 6, pollsTotal: 6 },
    { flat: "202", name: "Priya Singh", phone: "99870XXXXX", email: "singh@email.com", type: "owner", since: "2021-07-10", members: 2, vehicle: "DL3CIJ7890", avatar: "PS", paidMonths: 36, defaultMonths: 0, complaintsAgainst: 0, complaintsRaised: 0, pollsVoted: 6, pollsTotal: 6 },
    { flat: "301", name: "Deepak Mehta", phone: "93210XXXXX", email: "mehta@email.com", type: "owner", since: "2020-08-05", members: 4, vehicle: "TS08KL2345", avatar: "DM", paidMonths: 33, defaultMonths: 3, complaintsAgainst: 1, complaintsRaised: 0, pollsVoted: 2, pollsTotal: 6 },
    { flat: "302", name: "Anitha Nair", phone: "87650XXXXX", email: "nair@email.com", type: "owner", since: "2019-03-22", members: 3, vehicle: "KL7MN6789", avatar: "AN", paidMonths: 36, defaultMonths: 0, complaintsAgainst: 0, complaintsRaised: 2, pollsVoted: 6, pollsTotal: 6 },
    { flat: "303", name: "Kiran Rao", phone: "96540XXXXX", email: "rao@email.com", type: "tenant", since: "2024-01-01", members: 2, vehicle: "AP28OP4321", avatar: "KR", paidMonths: 14, defaultMonths: 0, complaintsAgainst: 0, complaintsRaised: 1, pollsVoted: 5, pollsTotal: 6 },
    { flat: "304", name: "Sanjay Gupta", phone: "90120XXXXX", email: "gupta@email.com", type: "owner", since: "2017-09-14", members: 6, vehicle: "TS09QR8765", avatar: "SG", paidMonths: 31, defaultMonths: 5, complaintsAgainst: 3, complaintsRaised: 0, pollsVoted: 1, pollsTotal: 6 },
    { flat: "305", name: "Lakshmi Iyer", phone: "94560XXXXX", email: "iyer@email.com", type: "owner", since: "2022-05-18", members: 3, vehicle: "TN22ST5432", avatar: "LI", paidMonths: 35, defaultMonths: 1, complaintsAgainst: 1, complaintsRaised: 0, pollsVoted: 4, pollsTotal: 6 },
  ],
  committee: {
    members: [
      { id: 1, flat: "201", name: "Vijay Kumar", role: "President", since: "2024-04-01", termEnd: "2026-04-01", phone: "88900XXXXX", responsibilities: ["Final expense approvals", "AGM chairman", "Legal representative"], active: true },
      { id: 2, flat: "302", name: "Anitha Nair", role: "Secretary", since: "2024-04-01", termEnd: "2026-04-01", phone: "87650XXXXX", responsibilities: ["Notices & communication", "Complaint management", "Meeting minutes"], active: true },
      { id: 3, flat: "101", name: "Ramesh Sharma", role: "Treasurer", since: "2024-04-01", termEnd: "2026-04-01", phone: "98490XXXXX", responsibilities: ["Fee collection", "Expense approval", "Monthly reports"], active: true },
      { id: 4, flat: "202", name: "Priya Singh", role: "Committee Member", since: "2024-04-01", termEnd: "2026-04-01", phone: "99870XXXXX", responsibilities: ["Welfare activities", "Vendor liaison"], active: true },
      { id: 5, flat: "303", name: "Kiran Rao", role: "Committee Member", since: "2024-04-01", termEnd: "2026-04-01", phone: "96540XXXXX", responsibilities: ["Maintenance oversight", "Security coordination"], active: true },
    ],
    motions: [
      { id: 1, title: "Approve ₹35,000 for CCTV installation", proposedBy: "Secretary", date: "2026-03-16", status: "voting", votes: { yes: 3, no: 1, abstain: 0 }, quorum: 5, deadline: "2026-03-20" },
      { id: 2, title: "Hire dedicated plumber on retainer ₹8,000/month", proposedBy: "President", date: "2026-03-10", status: "passed", votes: { yes: 4, no: 0, abstain: 1 }, quorum: 5, deadline: "2026-03-15" },
      { id: 3, title: "Issue formal warning to Flat 304 for parking violations", proposedBy: "Secretary", date: "2026-03-14", status: "voting", votes: { yes: 2, no: 1, abstain: 1 }, quorum: 5, deadline: "2026-03-21" },
    ],
    auditLog: [
      { id: 1, action: "Expense approved: Security guard salary ₹18,000", by: "Ramesh Sharma (Treasurer)", role: "Treasurer", date: "2026-03-01 09:14" },
      { id: 2, action: "Notice posted: AGM Scheduled March 30th", by: "Anitha Nair (Secretary)", role: "Secretary", date: "2026-03-16 11:30" },
      { id: 3, action: "Complaint #3 escalated to Secretary", by: "System (Auto-escalation)", role: "System", date: "2026-03-14 00:00" },
      { id: 4, action: "Motion #2 passed: Plumber retainer approved", by: "Vijay Kumar (President)", role: "President", date: "2026-03-15 18:45" },
      { id: 5, action: "Poll created: CCTV cameras vote", by: "Anitha Nair (Secretary)", role: "Secretary", date: "2026-03-12 10:00" },
      { id: 6, action: "Fee marked paid: Flat 102 March 2026", by: "Ramesh Sharma (Treasurer)", role: "Treasurer", date: "2026-03-05 14:22" },
    ],
    escalationRules: [
      { trigger: "Complaint open > 7 days", action: "Auto-escalate to Secretary", active: true },
      { trigger: "Complaint open > 14 days", action: "Auto-escalate to President", active: true },
      { trigger: "Fee unpaid > 30 days", action: "Send formal notice via WhatsApp", active: true },
      { trigger: "3+ complaints against same flat", action: "Flag for committee review", active: true },
    ]
  },
  whatsapp: {
    enabled: true,
    number: "+91 98765 43210",
    notifications: [
      { id: 1, type: "fee_reminder", label: "Fee Due Reminder", enabled: true, template: "Dear {name} Ji, ₹3,000 maintenance due {date}. Pay here: {link}. Reply PAID if done. — Sunrise Residency" },
      { id: 2, type: "complaint_update", label: "Complaint Status Update", enabled: true, template: "Your complaint #{id} ({title}) is now {status}. Track: {link} — Committee" },
      { id: 3, type: "new_notice", label: "New Notice Posted", enabled: true, template: "📢 New Notice: {title}. Read full: {link} — Sunrise Residency" },
      { id: 4, type: "poll_open", label: "New Poll Opened", enabled: true, template: "🗳️ New poll: {question}. Vote now: {link} — Closes {deadline}" },
      { id: 5, type: "maintenance_alert", label: "Maintenance Alert", enabled: true, template: "🔧 {title} scheduled {date} {time}. {impact} — Committee" },
      { id: 6, type: "visitor_approval", label: "Visitor Approval Request", enabled: false, template: "👤 {visitor} at gate for Flat {flat}. Approve? Reply YES or NO" },
      { id: 7, type: "payment_confirmed", label: "Payment Confirmation", enabled: true, template: "✅ ₹{amount} received for {month}. Receipt: {link}. Thank you! — Sunrise Residency" },
    ],
    sentLog: [
      { id: 1, to: "All Residents (10)", message: "📢 New Notice: AGM Scheduled for March 30th. Read full: [link]", time: "2026-03-16 11:35", type: "new_notice", status: "delivered" },
      { id: 2, to: "Flat 103, 301, 304", message: "Dear Resident, ₹3,000 maintenance due March 31. Pay here: [link]. Reply PAID if done.", time: "2026-03-15 09:00", type: "fee_reminder", status: "delivered" },
      { id: 3, to: "Flat 103", message: "Your complaint #3 (Loud music after midnight) is now mediating. Track: [link]", time: "2026-03-14 10:15", type: "complaint_update", status: "read" },
      { id: 4, to: "All Residents (10)", message: "🗳️ New poll: Should we install CCTV cameras? Vote: [link] — Closes March 25", time: "2026-03-12 10:05", type: "poll_open", status: "delivered" },
      { id: 5, to: "All Residents (10)", message: "🔧 Water supply off March 20 10am-2pm. Store water in advance. — Committee", time: "2026-03-10 18:00", type: "maintenance_alert", status: "delivered" },
    ]
  },
  staff: [
    { id: 1, name: "Raju Verma",      role: "Security Guard",    shift: "6am–2pm",   salary: 12000, status: "on-duty",  phone: "94500XXXXX", since: "2022-01-10", attendance: 26, leaves: 2, avatar: "RV", rating: 4.7 },
    { id: 2, name: "Mohan Singh",     role: "Security Guard",    shift: "2pm–10pm",  salary: 12000, status: "on-duty",  phone: "93400XXXXX", since: "2021-06-15", attendance: 27, leaves: 1, avatar: "MS", rating: 4.5 },
    { id: 3, name: "Sunil Kumar",     role: "Security Guard",    shift: "10pm–6am",  salary: 13000, status: "off-duty", phone: "92300XXXXX", since: "2020-11-01", attendance: 25, leaves: 3, avatar: "SK", rating: 4.2 },
    { id: 4, name: "Lakshmi Bai",     role: "Housekeeping",      shift: "7am–1pm",   salary: 9000,  status: "on-duty",  phone: "91200XXXXX", since: "2023-03-20", attendance: 27, leaves: 1, avatar: "LB", rating: 4.8 },
    { id: 5, name: "Ramesh Prasad",   role: "Housekeeping",      shift: "1pm–7pm",   salary: 9000,  status: "on-duty",  phone: "90100XXXXX", since: "2022-09-05", attendance: 24, leaves: 4, avatar: "RP", rating: 4.1 },
    { id: 6, name: "Venkat Rao",      role: "Plumber/Electrician",shift: "9am–5pm",  salary: 15000, status: "on-leave", phone: "89000XXXXX", since: "2019-04-12", attendance: 23, leaves: 5, avatar: "VR", rating: 4.6 },
    { id: 7, name: "Govind Sharma",   role: "Gardener",          shift: "6am–10am",  salary: 7000,  status: "on-duty",  phone: "88900XXXXX", since: "2021-08-30", attendance: 28, leaves: 0, avatar: "GS", rating: 4.9 },
  ],
  visitors: [
    { id: 1, name: "Arun Sharma",     flat: "101", purpose: "Family Visit",   type: "pre-approved", inTime: "10:15 AM", outTime: "01:30 PM", date: "2026-03-18", status: "checked-out", vehicle: "TS09XX1234", photo: "AS" },
    { id: 2, name: "Amazon Delivery", flat: "202", purpose: "Package Delivery",type: "delivery",     inTime: "11:20 AM", outTime: "11:25 AM", date: "2026-03-18", status: "checked-out", vehicle: "Bike",       photo: "AD" },
    { id: 3, name: "Sneha Reddy",     flat: "303", purpose: "Friend Visit",   type: "walkin",       inTime: "02:00 PM", outTime: null,        date: "2026-03-18", status: "inside",      vehicle: "None",       photo: "SR" },
    { id: 4, name: "Dr. Mehta",       flat: "205", purpose: "Doctor Visit",   type: "pre-approved", inTime: "03:00 PM", outTime: null,        date: "2026-03-18", status: "expected",    vehicle: "TS07YY5678", photo: "DM" },
    { id: 5, name: "Swiggy Delivery", flat: "101", purpose: "Food Delivery",  type: "delivery",     inTime: "07:45 PM", outTime: "07:47 PM", date: "2026-03-17", status: "checked-out", vehicle: "Bike",       photo: "SD" },
    { id: 6, name: "Plumber Ravi",    flat: "102", purpose: "Maintenance",    type: "pre-approved", inTime: "09:00 AM", outTime: "11:00 AM", date: "2026-03-17", status: "checked-out", vehicle: "None",       photo: "PR" },
  ],
  deliveries: [
    { id: 1, flat: "101", resident: "Ramesh Sharma",  courier: "Amazon",   items: "2 packages", inTime: "11:20 AM", date: "2026-03-18", status: "collected",   notified: true  },
    { id: 2, flat: "302", resident: "Anitha Nair",    courier: "Flipkart", items: "1 package",  inTime: "02:15 PM", date: "2026-03-18", status: "at-gate",     notified: true  },
    { id: 3, flat: "204", resident: "Kavitha Iyer",   courier: "Meesho",   items: "3 packages", inTime: "03:40 PM", date: "2026-03-18", status: "at-gate",     notified: false },
    { id: 4, flat: "501", resident: "Anil Kapoor",    courier: "Delhivery",items: "1 package",  inTime: "10:00 AM", date: "2026-03-17", status: "collected",   notified: true  },
    { id: 5, flat: "103", resident: "Amit Patel",     courier: "DTDC",     items: "1 package",  inTime: "04:30 PM", date: "2026-03-17", status: "uncollected", notified: true  },
  ],
  meetings: [
    { id: 1, title: "Annual General Meeting 2026",       type: "AGM",       date: "2026-03-30", time: "6:00 PM", venue: "Clubhouse", organiser: "Secretary", status: "upcoming", rsvp: { yes: 8, no: 1, maybe: 1 }, agenda: ["FY 2026-27 budget approval", "CCTV installation vote", "New committee election", "Terrace waterproofing update"], minutes: null },
    { id: 2, title: "Emergency: Water Tanker Decision",  type: "Emergency", date: "2026-03-22", time: "7:00 PM", venue: "WhatsApp Call", organiser: "President", status: "upcoming", rsvp: { yes: 5, no: 0, maybe: 2 }, agenda: ["Borewell repair cost: ₹85,000", "Temporary tanker arrangement", "Cost sharing options"], minutes: null },
    { id: 3, title: "Committee Monthly Review — March",  type: "Committee", date: "2026-03-15", time: "5:30 PM", venue: "Flat 201", organiser: "President", status: "completed", rsvp: { yes: 5, no: 0, maybe: 0 }, agenda: ["Fee defaulters action plan", "Complaint resolution review", "Maintenance vendor evaluation"], minutes: "Meeting held on March 15. All 5 committee members attended. Resolved: (1) Send formal notice to 3 defaulters. (2) AI mediation activated for complaint #3. (3) TechLift Co. approved for elevator AMC ₹45,000/year." },
  ],
  amenities: [
    { id: 1, name: "Clubhouse",    icon: "🏛️", capacity: 50,  slots: ["10am-12pm","12pm-2pm","2pm-4pm","4pm-6pm","6pm-8pm","8pm-10pm"], bookings: [{ flat:"202",slot:"6pm-8pm",date:"2026-03-19",purpose:"Birthday party",status:"confirmed"},{ flat:"101",slot:"10am-12pm",date:"2026-03-20",purpose:"Yoga session",status:"confirmed"}], rules: ["Max 50 people","Loud music after 10pm not allowed","Clean after use","₹500 deposit refundable"] },
    { id: 2, name: "Gym",         icon: "💪", capacity: 10,  slots: ["6am-8am","8am-10am","4pm-6pm","6pm-8pm"], bookings: [{ flat:"303",slot:"6am-8am",date:"2026-03-19",purpose:"Workout",status:"confirmed"}], rules: ["Max 10 people","Sanitize equipment after use","No food inside","Proper sports shoes mandatory"] },
    { id: 3, name: "Terrace",     icon: "🌅", capacity: 30,  slots: ["6am-8am","6pm-8pm","8pm-10pm"], bookings: [], rules: ["No loud music","Lights off after 10pm","No open fire","Common area — share respectfully"] },
    { id: 4, name: "Kids' Play Area", icon: "🎠", capacity: 20, slots: ["8am-10am","4pm-6pm","6pm-8pm"], bookings: [{ flat:"201",slot:"4pm-6pm",date:"2026-03-18",purpose:"Children play",status:"confirmed"}], rules: ["Children under 12 only","Adult supervision mandatory","No bikes/scooters inside","Maintain cleanliness"] },
    { id: 5, name: "Swimming Pool", icon: "🏊", capacity: 15, slots: ["6am-8am","8am-10am","4pm-6pm","6pm-8pm"], bookings: [], rules: ["Swim cap mandatory","No food/drinks poolside","Children must be supervised","No diving in shallow end"], maintenanceDay: "Every Monday" },
  ],
  campaigns: [
    { id: 1, title: "Swachh Residency Drive", type: "Cleanliness", date: "2026-03-22", time: "7:00 AM", organiser: "Welfare Committee", status: "upcoming", goal: "Clean all common areas + plant 20 saplings", joined: 14, target: 20, points: 50, description: "World Water Day special! Join us for a community clean-up. Gloves and bags provided. Chai and snacks after!", volunteers: ["Ramesh Sharma","Priya Singh","Anitha Nair","Kiran Rao"] },
    { id: 2, title: "Children's Art Competition", type: "Cultural", date: "2026-04-05", time: "10:00 AM", organiser: "Welfare Committee", status: "upcoming", goal: "50 kids participate", joined: 22, target: 50, points: 30, description: "Theme: 'My Society, My Home'. Ages 5-15. Prizes for all participants. Winners displayed in lobby.", volunteers: ["Priya Singh","Anitha Nair"] },
    { id: 3, title: "Senior Citizen Health Camp", type: "Health", date: "2026-03-10", time: "9:00 AM", organiser: "Welfare Committee", status: "completed", goal: "Free BP/Sugar screening for all residents 60+", joined: 18, target: 15, points: 40, description: "Partnered with Apollo Clinic. Free checkup, medicines for seniors.", volunteers: ["Vijay Kumar","Ramesh Sharma","Lakshmi Iyer"] },
    { id: 4, title: "Diwali Decoration Contest", type: "Festive", date: "2026-10-15", time: "6:00 PM", organiser: "Welfare Committee", status: "planning", goal: "Decorate all floors + common area", joined: 6, target: 30, points: 60, description: "Best decorated floor wins ₹2,000 cash prize! All residents welcome.", volunteers: [] },
  ],
  volunteers: [
    { id: 1, flat: "101", name: "Ramesh Sharma",  block: "A", avatar: "RS", assignedIssues: ["Water leakage - common area","Staircase bulb replacement"], completedTasks: 18, pendingTasks: 1, heroPoints: 340, streak: 6, badges: ["⚡ Quick Resolver","💧 Water Guardian","🌟 Super Volunteer"], lastActive: "Today", appreciations: ["Secretary: Ramesh is our backbone! Always first to respond 🙏","Priya (202): Fixed our corridor light in 10 mins. Legend!","Committee: Certificate of Excellence - Jan 2026"] },
    { id: 2, flat: "202", name: "Priya Singh",    block: "A", avatar: "PS", assignedIssues: ["Kids area cleanliness","Campaign coordination"], completedTasks: 12, pendingTasks: 0, heroPoints: 280, streak: 4, badges: ["🎯 Zero Complaints","🌱 Green Champion"], lastActive: "Today", appreciations: ["Welfare: Best campaign coordinator we've had!","Vijay Kumar: Priya's dedication is unmatched"] },
    { id: 3, flat: "302", name: "Anitha Nair",    block: "B", avatar: "AN", assignedIssues: ["Corridor lighting check","Notice board upkeep"], completedTasks: 22, pendingTasks: 2, heroPoints: 410, streak: 8, badges: ["👑 Block Captain","📋 Notice Ninja","🏆 Top Volunteer March"], lastActive: "2 hrs ago", appreciations: ["President: Anitha runs Block B like a pro. Society's MVP 🏆","All residents: Thank you for the constant updates!","Committee: 3 months straight — no complaint in Block B"] },
    { id: 4, flat: "303", name: "Kiran Rao",      block: "B", avatar: "KR", assignedIssues: ["Lift complaint log","Security roster check"], completedTasks: 8, pendingTasks: 1, heroPoints: 180, streak: 2, badges: ["🔒 Safety First"], lastActive: "Yesterday", appreciations: ["Secretary: Kiran caught the lift issue before it broke down. Saved ₹40,000!"] },
    { id: 5, flat: "201", name: "Vijay Kumar",    block: "A", avatar: "VK", assignedIssues: ["Vendor negotiation","AGM coordination"], completedTasks: 15, pendingTasks: 1, heroPoints: 290, streak: 5, badges: ["🤝 Deal Maker","🏛️ Society Pillar"], lastActive: "Today", appreciations: ["All 10 flats: Thank you President for the new elevator AMC deal!"] },
  ],
  currentUser: {
    flat: "101", name: "Ramesh Sharma", avatar: "RS",
    roles: ["Treasurer", "Resident", "Volunteer"],
    primaryRole: "Treasurer",
    permissions: ["view_finances", "approve_expenses", "mark_paid", "send_reminders", "raise_complaint", "vote_polls", "book_amenity"],
  },
  admin: {
    societies: [
      { id: "SOC001", name: "Sunrise Residency", city: "Hyderabad", blocks: 2, flats: 10, residents: 10, status: "active", plan: "Pro", since: "2026-03-18" },
    ],
    blocks: [
      { id: "B-A", society: "SOC001", name: "Block A", floors: 3, flatsPerFloor: 2, totalFlats: 6 },
      { id: "B-B", society: "SOC001", name: "Block B", floors: 2, flatsPerFloor: 2, totalFlats: 4 },
    ],
    flats: [
      { number: "101", block: "A", floor: 1, sqft: 1200, type: "2BHK", owner: "Ramesh Sharma", status: "occupied" },
      { number: "102", block: "A", floor: 1, sqft: 1200, type: "2BHK", owner: "Suresh Reddy", status: "occupied" },
      { number: "201", block: "A", floor: 2, sqft: 1400, type: "3BHK", owner: "Vijay Kumar", status: "occupied" },
      { number: "202", block: "A", floor: 2, sqft: 1400, type: "3BHK", owner: "Priya Singh", status: "occupied" },
      { number: "301", block: "A", floor: 3, sqft: 1200, type: "2BHK", owner: "Deepak Mehta", status: "occupied" },
      { number: "302", block: "B", floor: 1, sqft: 1100, type: "2BHK", owner: "Anitha Nair", status: "occupied" },
      { number: "303", block: "B", floor: 1, sqft: 1100, type: "2BHK", owner: "Kiran Rao", status: "occupied" },
      { number: "304", block: "B", floor: 2, sqft: 1100, type: "2BHK", owner: "Sanjay Gupta", status: "occupied" },
      { number: "305", block: "B", floor: 2, sqft: 1100, type: "2BHK", owner: "Lakshmi Iyer", status: "occupied" },
      { number: "103", block: "A", floor: 1, sqft: 900, type: "1BHK", owner: "Amit Patel", status: "tenant" },
    ],
    maintenanceModels: [
      { id: 1, name: "Flat Rate", description: "Fixed amount per flat regardless of size", amount: 3000, unit: "per flat/month", active: true },
      { id: 2, name: "Per Sq Ft", description: "Calculated based on carpet area", amount: 2.5, unit: "per sqft/month", active: false },
      { id: 3, name: "Tiered by BHK", description: "Different rates for 1BHK/2BHK/3BHK", amount: null, tiers: { "1BHK": 2000, "2BHK": 3000, "3BHK": 4000 }, unit: "per flat/month", active: false },
      { id: 4, name: "Income Based", description: "Progressive — higher earners pay more", amount: null, unit: "variable", active: false },
    ],
    roles: [
      { name: "Super Admin", color: "#f87171", permissions: ["all"], description: "Full system access" },
      { name: "President", color: "#f59e0b", permissions: ["final_approvals","view_all","manage_committee","override"], description: "Final authority" },
      { name: "Secretary", color: "#818cf8", permissions: ["manage_complaints","post_notices","assign_maintenance","view_residents"], description: "Day-to-day operations" },
      { name: "Treasurer", color: "#4ade80", permissions: ["view_finances","approve_expenses","mark_paid","send_reminders"], description: "Financial management" },
      { name: "Committee Member", color: "#38bdf8", permissions: ["view_all","vote_motions","manage_assigned"], description: "Committee participation" },
      { name: "Resident", color: "#64748b", permissions: ["raise_complaint","vote_polls","book_amenity","view_notices"], description: "Standard resident access" },
      { name: "Tenant", color: "#475569", permissions: ["raise_complaint","book_amenity","view_notices"], description: "Limited tenant access" },
    ],
  },
};

// ─── Icons ───────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 18 }) => {
  const icons = {
    dashboard: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
    conflict: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    maintenance: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
    finance: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    vote: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
    notice: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    ai: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>,
    send: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    up: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>,
    alert: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
    close: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    plus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    user: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    star: <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    trend: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
    peace: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="12" y1="12" x2="4.93" y2="19.07"/><line x1="12" y1="12" x2="19.07" y2="19.07"/></svg>,
    whatsapp: <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
    committee: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    residents: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    shield: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
    gavel: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 13l6 6-3 3-6-6"/><path d="M6 3l3 3-7 7-3-3z"/><path d="M8 6l2-2"/></svg>,
    log: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    harmony: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
    staff: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
    gate: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    package: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    calendar: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    amenity: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>,
    campaign: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>,
    volunteer: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><polyline points="20 8 22 10 26 6"/></svg>,
    trophy: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="8 21 12 17 16 21"/><path d="M12 17V9"/><path d="M19 5H5v8a7 7 0 0 0 14 0V5z"/><line x1="5" y1="5" x2="2" y2="5"/><line x1="19" y1="5" x2="22" y2="5"/></svg>,
  };
  return icons[name] || null;
};

// ─── Status Badge ────────────────────────────────────────────────────────────
const Badge = ({ status }) => {
  const map = {
    open: { bg: "#2d1b1b", color: "#f87171", label: "Open" },
    resolved: { bg: "#1b2d1b", color: "#4ade80", label: "Resolved" },
    mediating: { bg: "#2d2510", color: "#fbbf24", label: "Mediating" },
    "ai-mediated": { bg: "#1b1b3a", color: "#818cf8", label: "AI Resolved" },
    pending: { bg: "#2d2510", color: "#fb923c", label: "Pending" },
    scheduled: { bg: "#1b2530", color: "#38bdf8", label: "Scheduled" },
    "in-progress": { bg: "#2d2510", color: "#fbbf24", label: "In Progress" },
    completed: { bg: "#1b2d1b", color: "#4ade80", label: "Completed" },
    active: { bg: "#1b1b2d", color: "#a78bfa", label: "Active" },
    closed: { bg: "#1e1e1e", color: "#9ca3af", label: "Closed" },
    high: { bg: "#2d1b1b", color: "#f87171", label: "High" },
    medium: { bg: "#2d2510", color: "#fbbf24", label: "Medium" },
    low: { bg: "#1b2d1b", color: "#4ade80", label: "Low" },
  };
  const s = map[status] || { bg: "#1e1e1e", color: "#9ca3af", label: status };
  return (
    <span style={{ background: s.bg, color: s.color, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", border: `1px solid ${s.color}22` }}>
      {s.label}
    </span>
  );
};

// ─── AI Chat Helper ───────────────────────────────────────────────────────────
async function callAI(messages, systemPrompt) {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "Unable to get response.";
}

// ─── Modal ────────────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "85vh", overflow: "auto", padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: 18, fontFamily: "'Playfair Display', serif" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 4 }}><Icon name="close" size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
};

// ─── Input/Textarea Styles ────────────────────────────────────────────────────
const inputStyle = { width: "100%", background: "#0d1117", border: "1px solid #2a2f45", borderRadius: 8, padding: "10px 12px", color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const labelStyle = { color: "#94a3b8", fontSize: 12, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 6, display: "block" };
const btnPrimary = { background: "linear-gradient(135deg, #d97706, #f59e0b)", border: "none", borderRadius: 8, padding: "10px 20px", color: "#0d0f14", fontWeight: 700, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 8 };

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
const Dashboard = ({ data, onNavigate }) => {
  const openComplaints = data.complaints.filter(c => c.status === "open").length;
  const pendingMaintenance = data.maintenance.filter(m => m.status !== "completed").length;
  const unpaidFlats = data.finances.collections.filter(c => !c.paid).length;
  const activePolls = data.polls.filter(p => p.status === "active").length;
  const [showHealthDetail, setShowHealthDetail] = useState(false);

  const stats = [
    { label: "Open Complaints", value: openComplaints, color: "#f87171", icon: "alert", sub: "Tap to manage", nav: "conflicts" },
    { label: "Maintenance Tasks", value: pendingMaintenance, color: "#fbbf24", icon: "maintenance", sub: "Tap to view queue", nav: "maintenance" },
    { label: "Unpaid Dues", value: `${unpaidFlats} flats`, color: "#fb923c", icon: "finance", sub: "Tap to collect", nav: "finances" },
    { label: "Active Polls", value: activePolls, color: "#818cf8", icon: "vote", sub: "Tap to vote", nav: "voting" },
  ];

  const activityFeed = [
    { time: "2 hrs ago", text: "Flat 103 raised a noise complaint against Flat 501", type: "complaint", nav: "conflicts" },
    { time: "4 hrs ago", text: "AI mediation resolved parking dispute between 304 & 201", type: "ai", nav: "conflicts" },
    { time: "6 hrs ago", text: "March maintenance fee collected from 7/10 flats", type: "finance", nav: "finances" },
    { time: "1 day ago", text: "AGM notice pinned by Secretary", type: "notice", nav: "notices" },
    { time: "1 day ago", text: "Elevator servicing scheduled for March 20th", type: "maintenance", nav: "maintenance" },
    { time: "2 days ago", text: "CCTV poll reached 22 votes — results pending", type: "poll", nav: "voting" },
  ];

  const typeColor = { complaint: "#f87171", ai: "#818cf8", finance: "#4ade80", notice: "#fbbf24", maintenance: "#38bdf8", poll: "#a78bfa" };

  const healthItems = [
    { label: "Fee compliance", value: "70%", detail: `${data.finances.collections.filter(c=>c.paid).length}/10 flats paid`, color: "#4ade80", nav: "finances" },
    { label: "Open complaints", value: openComplaints, detail: "Unresolved issues", color: "#f87171", nav: "conflicts" },
    { label: "Maintenance backlog", value: pendingMaintenance, detail: "Tasks pending", color: "#fbbf24", nav: "maintenance" },
    { label: "Poll participation", value: "73%", detail: "Average across 3 polls", color: "#818cf8", nav: "voting" },
    { label: "Volunteer activity", value: `${data.volunteers.filter(v=>v.pendingTasks===0).length}/${data.volunteers.length}`, detail: "Volunteers all-clear", color: "#4ade80", nav: "volunteers" },
    { label: "Harmony avg", value: `${Math.round(data.residents.reduce((s,r)=>{const sc=Math.max(0,100-r.defaultMonths*8-r.complaintsAgainst*15);return s+sc;},0)/data.residents.length)}/100`, detail: "Community harmony", color: "#f472b6", nav: "residents" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: "#e2e8f0", fontSize: 24, fontFamily: "'Playfair Display', serif", margin: "0 0 4px 0" }}>Society Dashboard</h2>
        <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Sunrise Residency, Hyderabad — Live Overview</p>
      </div>

      {/* Health Score — fully clickable */}
      <div onClick={() => setShowHealthDetail(true)} style={{ background: "linear-gradient(135deg, #1a1f35 0%, #161b27 100%)", border: "1px solid #2a2f45", borderRadius: 16, padding: 20, marginBottom: 16, cursor: "pointer", transition: "border-color 0.2s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 auto" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "conic-gradient(#4ade80 0% 68%, #2a2f45 68% 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 54, height: 54, borderRadius: "50%", background: "#161b27", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                <span style={{ color: "#4ade80", fontSize: 18, fontWeight: 800, lineHeight: 1 }}>68</span>
              </div>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 3 }}>Community Health Score</div>
            <div style={{ color: "#e2e8f0", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Moderate — Needs Attention</div>
            <div style={{ color: "#64748b", fontSize: 12 }}>3 unresolved conflicts · 30% fee defaulters</div>
          </div>
          <div style={{ color: "#64748b", fontSize: 18 }}>›</div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          {[
            { v: "68%", l: "Compliance", c: "#4ade80" },
            { v: "5", l: "Open Issues", c: "#f87171" },
            { v: "1", l: "AI Resolved", c: "#818cf8" },
          ].map((x,i) => (
            <div key={i} style={{ background: "#0d1117", borderRadius: 8, padding: "6px 12px", textAlign: "center", flex: 1 }}>
              <div style={{ color: x.c, fontSize: 16, fontWeight: 800 }}>{x.v}</div>
              <div style={{ color: "#475569", fontSize: 10 }}>{x.l}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, color: "#475569", fontSize: 11, textAlign: "right" }}>Tap for full breakdown →</div>
      </div>

      {/* Health Detail Modal */}
      <Modal open={showHealthDetail} onClose={() => setShowHealthDetail(false)} title="Community Health Breakdown">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {healthItems.map((h, i) => (
            <div key={i} onClick={() => { setShowHealthDetail(false); onNavigate(h.nav); }}
              style={{ background: "#0d1117", borderRadius: 10, padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${h.color}22` }}>
              <div>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>{h.label}</div>
                <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>{h.detail}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: h.color, fontSize: 20, fontWeight: 800 }}>{h.value}</span>
                <span style={{ color: "#475569" }}>›</span>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Clickable Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 16 }}>
        {stats.map((s, i) => (
          <div key={i} onClick={() => onNavigate(s.nav)}
            style={{ background: "#161b27", border: `1px solid ${s.color}22`, borderLeft: `3px solid ${s.color}`, borderRadius: 12, padding: 16, cursor: "pointer", transition: "transform 0.1s, border-color 0.2s", active: { transform: "scale(0.98)" } }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ color: "#64748b", fontSize: 10, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 6 }}>{s.label}</div>
                <div style={{ color: s.color, fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
                <div style={{ color: "#475569", fontSize: 11, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>{s.sub} <span>›</span></div>
              </div>
              <div style={{ color: s.color, opacity: 0.5 }}><Icon name={s.icon} size={20} /></div>
            </div>
          </div>
        ))}
      </div>

      {/* Activity Feed — full width */}
      <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 18, marginBottom: 14 }}>
        <h3 style={{ color: "#e2e8f0", fontSize: 14, margin: "0 0 14px 0", fontFamily: "'Playfair Display', serif" }}>Live Activity Feed</h3>
        {activityFeed.map((a, i) => (
          <div key={i} onClick={() => onNavigate(a.nav)}
            style={{ display: "flex", gap: 10, marginBottom: 12, paddingBottom: 12, borderBottom: i < activityFeed.length - 1 ? "1px solid #1e2535" : "none", cursor: "pointer" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: typeColor[a.type], marginTop: 5, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.4 }}>{a.text}</div>
              <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>{a.time}</div>
            </div>
            <span style={{ color: "#2a2f45", fontSize: 14 }}>›</span>
          </div>
        ))}
      </div>

      {/* Financial Snapshot — full width */}
      <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 18 }}>
        <h3 style={{ color: "#e2e8f0", fontSize: 14, margin: "0 0 14px 0", fontFamily: "'Playfair Display', serif" }}>Financial Snapshot</h3>
        <div onClick={() => onNavigate("finances")} style={{ background: "#0d1117", borderRadius: 10, padding: 14, marginBottom: 12, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: "#64748b", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Society Balance</div>
            <div style={{ color: "#4ade80", fontSize: 26, fontWeight: 800, margin: "4px 0" }}>₹{data.finances.balance.toLocaleString("en-IN")}</div>
            <div style={{ color: "#475569", fontSize: 11 }}>Tap for full ledger →</div>
          </div>
          <Icon name="finance" size={28} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { label: "Collected", value: `₹${(data.finances.collections.filter(c=>c.paid).length * 3000).toLocaleString("en-IN")}`, color: "#4ade80", nav: "finances" },
            { label: "Pending", value: `₹${(data.finances.collections.filter(c=>!c.paid).length * 3000).toLocaleString("en-IN")}`, color: "#f87171", nav: "finances" },
            { label: "Expenses (Mar)", value: "₹32,500", color: "#fbbf24", nav: "finances" },
            { label: "Pending approval", value: "₹35,000", color: "#fb923c", nav: "finances" },
          ].map((item, i) => (
            <div key={i} onClick={() => onNavigate(item.nav)}
              style={{ background: "#0d1117", borderRadius: 8, padding: "10px 12px", cursor: "pointer" }}>
              <div style={{ color: "#475569", fontSize: 11, marginBottom: 3 }}>{item.label}</div>
              <div style={{ color: item.color, fontSize: 15, fontWeight: 700 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: CONFLICTS & COMPLAINTS
// ═══════════════════════════════════════════════════════════════════════════════
const Conflicts = ({ data, setData }) => {
  const [aiLoading, setAiLoading] = useState(null);
  const [aiResults, setAiResults] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [myVotes, setMyVotes] = useState({});
  const [form, setForm] = useState({ title: "", category: "Noise", description: "", flat: "", priority: "medium" });

  const handleAIMediate = async (complaint) => {
    setAiLoading(complaint.id);
    try {
      const result = await callAI(
        [{ role: "user", content: `Complaint: "${complaint.title}"\nDetails: ${complaint.description}\nFlat: ${complaint.flat}\nVotes from neighbors: ${complaint.votes}\n\nProvide a fair, empathetic resolution recommendation in 3-4 sentences. Be specific and practical for an Indian apartment society context.` }],
        "You are an expert community mediator for Indian apartment societies (RWAs). You help resolve disputes fairly, citing Indian apartment society norms, mutual respect, and practical solutions. Keep responses concise and actionable."
      );
      setAiResults(prev => ({ ...prev, [complaint.id]: result }));
      setData(prev => ({
        ...prev,
        complaints: prev.complaints.map(c => c.id === complaint.id ? { ...c, status: "mediating" } : c)
      }));
    } catch (e) {
      setAiResults(prev => ({ ...prev, [complaint.id]: "Error connecting to AI. Please try again." }));
    }
    setAiLoading(null);
  };

  const handleVote = (id) => {
    const alreadyVoted = myVotes[id];
    setMyVotes(prev => ({ ...prev, [id]: !alreadyVoted }));
    setData(prev => ({ ...prev, complaints: prev.complaints.map(c => c.id === id ? { ...c, votes: c.votes + (alreadyVoted ? -1 : 1) } : c) }));
  };

  const handleSubmit = () => {
    if (!form.title || !form.flat) return;
    const newC = { id: Date.now(), ...form, status: "open", votes: 0, date: new Date().toISOString().slice(0, 10), comments: 0 };
    setData(prev => ({ ...prev, complaints: [newC, ...prev.complaints] }));
    setShowModal(false);
    setForm({ title: "", category: "Noise", description: "", flat: "", priority: "medium" });
  };

  const categories = ["Noise", "Parking", "Utilities", "Maintenance", "Hygiene", "Security", "Other"];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ color: "#e2e8f0", fontSize: 26, fontFamily: "'Playfair Display', serif", margin: "0 0 4px 0" }}>Conflict Resolution</h2>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Transparent community-driven dispute management with AI mediation</p>
        </div>
        <button style={btnPrimary} onClick={() => setShowModal(true)}><Icon name="plus" size={16} /> Raise Complaint</button>
      </div>

      {/* AI Resolution Panel */}
      <div style={{ background: "linear-gradient(135deg, #1b1b3a, #161b27)", border: "1px solid #818cf833", borderRadius: 14, padding: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
          <div style={{ color: "#818cf8" }}><Icon name="ai" size={20} /></div>
          <div>
            <div style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 600 }}>AI Mediator</div>
            <div style={{ color: "#64748b", fontSize: 12 }}>Click "AI Mediate" on any complaint to get an instant, unbiased resolution suggestion powered by Claude AI</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[{ label: "1 Resolved", color: "#4ade80" }, { label: "2 Mediating", color: "#fbbf24" }, { label: "Unbiased & Transparent", color: "#818cf8" }].map((t, i) => (
            <span key={i} style={{ background: "#0d1117", border: `1px solid ${t.color}33`, color: t.color, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600 }}>{t.label}</span>
          ))}
        </div>
      </div>

      {/* Complaints List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {data.complaints.map(c => (
          <div key={c.id} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 14, padding: 20, transition: "border-color 0.2s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                  <Badge status={c.priority} />
                  <Badge status={c.status} />
                  <span style={{ color: "#475569", fontSize: 12 }}>#{c.category}</span>
                  <span style={{ color: "#475569", fontSize: 12 }}>Flat {c.flat}</span>
                  <span style={{ color: "#475569", fontSize: 12 }}>{c.date}</span>
                </div>
                <h3 style={{ color: "#e2e8f0", fontSize: 16, margin: "0 0 6px 0", fontWeight: 600 }}>{c.title}</h3>
                <p style={{ color: "#64748b", fontSize: 13, margin: 0, lineHeight: 1.5 }}>{c.description}</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <button onClick={() => handleVote(c.id)} style={{ background: myVotes[c.id] ? "#2d2510" : "#0d1117", border: `1px solid ${myVotes[c.id] ? "#fbbf24" : "#2a2f45"}`, borderRadius: 8, padding: "6px 12px", color: myVotes[c.id] ? "#fbbf24" : "#64748b", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 52, transition: "all 0.15s" }}>
                  <Icon name="up" size={14} />
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{c.votes}</span>
                  <span style={{ fontSize: 9, color: myVotes[c.id] ? "#fbbf24" : "#475569" }}>{myVotes[c.id] ? "supported" : "support"}</span>
                </button>
                {myVotes[c.id] && (
                  <button onClick={() => handleVote(c.id)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 9, padding: 0, textDecoration: "underline" }}>unsupport</button>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              {c.status !== "resolved" && c.status !== "ai-mediated" && (
                <button
                  onClick={() => handleAIMediate(c)}
                  disabled={aiLoading === c.id}
                  style={{ background: aiLoading === c.id ? "#1b1b3a" : "linear-gradient(135deg, #312e81, #4f46e5)", border: "none", borderRadius: 8, padding: "8px 16px", color: aiLoading === c.id ? "#818cf8" : "#e2e8f0", cursor: aiLoading === c.id ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Icon name="ai" size={14} />
                  {aiLoading === c.id ? "AI Thinking…" : "AI Mediate"}
                </button>
              )}
              {c.status !== "resolved" && (
                <button onClick={() => setData(prev => ({ ...prev, complaints: prev.complaints.map(x => x.id === c.id ? { ...x, status: "resolved" } : x) }))}
                  style={{ background: "#1b2d1b", border: "1px solid #4ade8033", borderRadius: 8, padding: "8px 16px", color: "#4ade80", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="check" size={14} /> Mark Resolved
                </button>
              )}
            </div>

            {/* AI Result */}
            {aiResults[c.id] && (
              <div style={{ marginTop: 14, background: "#1b1b3a", border: "1px solid #818cf833", borderRadius: 10, padding: 16 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <Icon name="ai" size={14} /><span style={{ color: "#818cf8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>AI Mediation Suggestion</span>
                </div>
                <p style={{ color: "#c4b5fd", fontSize: 13, margin: 0, lineHeight: 1.6 }}>{aiResults[c.id]}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal: Raise Complaint */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Raise a Complaint">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div><label style={labelStyle}>Your Flat Number</label><input style={inputStyle} value={form.flat} onChange={e => setForm({ ...form, flat: e.target.value })} placeholder="e.g. 203" /></div>
          <div><label style={labelStyle}>Complaint Title</label><input style={inputStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Brief title of the issue" /></div>
          <div><label style={labelStyle}>Category</label>
            <select style={inputStyle} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Priority</label>
            <select style={inputStyle} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
          </div>
          <div><label style={labelStyle}>Description</label><textarea style={{ ...inputStyle, height: 90, resize: "vertical" }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the issue in detail…" /></div>
          <button style={{ ...btnPrimary, justifyContent: "center" }} onClick={handleSubmit}>Submit Complaint</button>
        </div>
      </Modal>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: MAINTENANCE
// ═══════════════════════════════════════════════════════════════════════════════
const Maintenance = ({ data, setData }) => {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", category: "Plumbing", flat: "", priority: "medium" });

  const handleAdd = () => {
    if (!form.title) return;
    const n = { id: Date.now(), ...form, status: "open", date: new Date().toISOString().slice(0, 10), assignee: "Unassigned" };
    setData(prev => ({ ...prev, maintenance: [n, ...prev.maintenance] }));
    setShowModal(false);
    setForm({ title: "", category: "Plumbing", flat: "", priority: "medium" });
  };

  const statusFlow = ["open", "scheduled", "in-progress", "completed"];

  const advance = (id) => {
    setData(prev => ({
      ...prev,
      maintenance: prev.maintenance.map(m => {
        if (m.id !== id) return m;
        const i = statusFlow.indexOf(m.status);
        return { ...m, status: statusFlow[Math.min(i + 1, statusFlow.length - 1)] };
      })
    }));
  };

  const cats = ["Plumbing", "Electrical", "Lift", "Structure", "Power", "Landscaping", "Pest Control", "Other"];
  const byStatus = (s) => data.maintenance.filter(m => m.status === s);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ color: "#e2e8f0", fontSize: 26, fontFamily: "'Playfair Display', serif", margin: "0 0 4px 0" }}>Maintenance Tracker</h2>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>All tasks visible to every resident — no more hidden work orders</p>
        </div>
        <button style={btnPrimary} onClick={() => setShowModal(true)}><Icon name="plus" size={16} /> New Request</button>
      </div>

      {/* Kanban */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {[
          { status: "open", label: "Open", color: "#f87171" },
          { status: "scheduled", label: "Scheduled", color: "#38bdf8" },
          { status: "in-progress", label: "In Progress", color: "#fbbf24" },
          { status: "completed", label: "Completed", color: "#4ade80" },
        ].map(col => (
          <div key={col.status} style={{ background: "#0d1117", borderRadius: 14, padding: 16, border: `1px solid ${col.color}22` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: col.color }} />
              <span style={{ color: col.color, fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.5px" }}>{col.label}</span>
              <span style={{ marginLeft: "auto", background: `${col.color}22`, color: col.color, borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>{byStatus(col.status).length}</span>
            </div>
            {byStatus(col.status).map(m => (
              <div key={m.id} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 10, padding: 14, marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  <Badge status={m.priority} />
                  <span style={{ color: "#475569", fontSize: 11 }}>#{m.category}</span>
                </div>
                <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{m.title}</div>
                <div style={{ color: "#475569", fontSize: 12, marginBottom: 4 }}>{m.flat !== "Society" ? `Flat ${m.flat}` : "Common Area"}</div>
                <div style={{ color: "#475569", fontSize: 11, marginBottom: 10 }}>Assignee: {m.assignee}</div>
                {col.status !== "completed" && (
                  <button onClick={() => advance(m.id)} style={{ background: `${col.color}22`, border: `1px solid ${col.color}44`, borderRadius: 6, padding: "5px 10px", color: col.color, cursor: "pointer", fontSize: 11, fontWeight: 600, width: "100%" }}>
                    → Advance Status
                  </button>
                )}
              </div>
            ))}
            {byStatus(col.status).length === 0 && <div style={{ color: "#2a2f45", fontSize: 13, textAlign: "center", paddingTop: 12 }}>No tasks</div>}
          </div>
        ))}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Maintenance Request">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Describe the issue" /></div>
          <div><label style={labelStyle}>Category</label><select style={inputStyle} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{cats.map(c => <option key={c}>{c}</option>)}</select></div>
          <div><label style={labelStyle}>Flat / Location</label><input style={inputStyle} value={form.flat} onChange={e => setForm({ ...form, flat: e.target.value })} placeholder="e.g. 204 or Common Area" /></div>
          <div><label style={labelStyle}>Priority</label><select style={inputStyle} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
          <button style={{ ...btnPrimary, justifyContent: "center" }} onClick={handleAdd}>Submit Request</button>
        </div>
      </Modal>
    </div>
  );
};
// Finances is now a real Supabase-connected component
// imported from components/Finances.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: FINANCES
// ═══════════════════════════════════════════════════════════════════════════════
const Finances = ({ data, setData }) => {
  const [tab, setTab] = useState("overview");
  const collected = data.finances.collections.filter(c => c.paid).length;
  const total = data.finances.collections.length;
  const pct = Math.round((collected / total) * 100);

  const togglePaid = (flat) => {
    setData(prev => ({
      ...prev,
      finances: {
        ...prev.finances,
        collections: prev.finances.collections.map(c => c.flat === flat ? { ...c, paid: !c.paid } : c),
        balance: prev.finances.balance + (prev.finances.collections.find(c => c.flat === flat)?.paid ? -3000 : 3000),
      }
    }));
  };

  const approveExpense = (id) => {
    setData(prev => ({
      ...prev,
      finances: {
        ...prev.finances,
        expenses: prev.finances.expenses.map(e => e.id === id ? { ...e, approved: true } : e),
        balance: prev.finances.balance - (prev.finances.expenses.find(e => e.id === id)?.amount || 0)
      }
    }));
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: "#e2e8f0", fontSize: 26, fontFamily: "'Playfair Display', serif", margin: "0 0 4px 0" }}>Financial Ledger</h2>
        <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Fully transparent — every resident can see every paisa</p>
      </div>

      {/* Balance Card */}
      <div style={{ background: "linear-gradient(135deg, #1b2d1b, #161b27)", border: "1px solid #4ade8033", borderRadius: 16, padding: 24, marginBottom: 20, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>Society Fund Balance</div>
          <div style={{ color: "#4ade80", fontSize: 36, fontWeight: 800, margin: "6px 0" }}>₹{data.finances.balance.toLocaleString("en-IN")}</div>
          <div style={{ color: "#475569", fontSize: 13 }}>As of March 18, 2026</div>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[{ l: "Collected", v: `₹${(collected * 3000).toLocaleString("en-IN")}`, c: "#4ade80" }, { l: "Pending", v: `₹${((total - collected) * 3000).toLocaleString("en-IN")}`, c: "#f87171" }, { l: "Expenses (Mar)", v: "₹32,500", c: "#fbbf24" }].map((x, i) => (
            <div key={i} style={{ background: "#0d1117", borderRadius: 10, padding: "12px 18px", textAlign: "center", minWidth: 100 }}>
              <div style={{ color: x.c, fontSize: 18, fontWeight: 700 }}>{x.v}</div>
              <div style={{ color: "#475569", fontSize: 11, marginTop: 3 }}>{x.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, background: "#0d1117", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {["overview", "collections", "expenses"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? "#1e2535" : "none", border: tab === t ? "1px solid #2a2f45" : "none", borderRadius: 8, padding: "8px 16px", color: tab === t ? "#e2e8f0" : "#64748b", cursor: "pointer", fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 20 }}>
            <h3 style={{ color: "#e2e8f0", margin: "0 0 16px 0", fontSize: 15, fontFamily: "'Playfair Display', serif" }}>Fee Collection Rate</h3>
            <div style={{ position: "relative", height: 10, background: "#0d1117", borderRadius: 10, marginBottom: 10 }}>
              <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #4ade80, #22c55e)", borderRadius: 10 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#4ade80", fontWeight: 700 }}>{pct}% collected</span>
              <span style={{ color: "#64748b", fontSize: 13 }}>{collected}/{total} flats paid</span>
            </div>
          </div>
          <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 20 }}>
            <h3 style={{ color: "#e2e8f0", margin: "0 0 16px 0", fontSize: 15, fontFamily: "'Playfair Display', serif" }}>Expense Breakdown</h3>
            {[{ cat: "Security", amt: 18000, color: "#818cf8" }, { cat: "Maintenance", amt: 8500, color: "#38bdf8" }, { cat: "Utilities", amt: 3200, color: "#4ade80" }, { cat: "Landscaping", amt: 2800, color: "#fbbf24" }].map((x, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "#94a3b8", fontSize: 12 }}>{x.cat}</span>
                  <span style={{ color: x.color, fontSize: 12, fontWeight: 600 }}>₹{x.amt.toLocaleString("en-IN")}</span>
                </div>
                <div style={{ height: 4, background: "#0d1117", borderRadius: 4 }}>
                  <div style={{ height: "100%", width: `${(x.amt / 18000) * 100}%`, background: x.color, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "collections" && (
        <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 100px 120px", padding: "12px 20px", background: "#0d1117", borderBottom: "1px solid #2a2f45" }}>
            {["Flat", "Resident", "Amount", "Status"].map(h => <span key={h} style={{ color: "#475569", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</span>)}
          </div>
          {data.finances.collections.map((c, i) => (
            <div key={c.flat} style={{ display: "grid", gridTemplateColumns: "80px 1fr 100px 120px", padding: "14px 20px", borderBottom: i < data.finances.collections.length - 1 ? "1px solid #1e2535" : "none", alignItems: "center" }}>
              <span style={{ color: "#fbbf24", fontWeight: 700 }}>Flat {c.flat}</span>
              <span style={{ color: "#e2e8f0", fontSize: 14 }}>{c.name}</span>
              <span style={{ color: "#94a3b8", fontSize: 14 }}>₹{c.amount.toLocaleString("en-IN")}</span>
              <button onClick={() => togglePaid(c.flat)} style={{ background: c.paid ? "#1b2d1b" : "#2d1b1b", border: `1px solid ${c.paid ? "#4ade8044" : "#f8717144"}`, borderRadius: 6, padding: "4px 10px", color: c.paid ? "#4ade80" : "#f87171", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                {c.paid ? <><Icon name="check" size={12} /> Paid</> : "Mark Paid"}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "expenses" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.finances.expenses.map(e => (
            <div key={e.id} style={{ background: "#161b27", border: `1px solid ${e.approved ? "#2a2f45" : "#fbbf2444"}`, borderRadius: 12, padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 600 }}>{e.description}</div>
                <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{e.category} · {e.date}</div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ color: "#fbbf24", fontSize: 20, fontWeight: 800 }}>₹{e.amount.toLocaleString("en-IN")}</span>
                {e.approved ? <Badge status="resolved" /> : (
                  <button onClick={() => approveExpense(e.id)} style={{ background: "#2d2510", border: "1px solid #fbbf2444", borderRadius: 6, padding: "6px 14px", color: "#fbbf24", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Approve</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: VOTING
// ═══════════════════════════════════════════════════════════════════════════════
const Voting = ({ data, setData }) => {
  const [voted, setVoted] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ question: "", options: ["", "", ""], deadline: "" });

  const handleVote = (pollId, optIndex) => {
    if (voted[pollId] !== undefined) return;
    setVoted(prev => ({ ...prev, [pollId]: optIndex }));
    setData(prev => ({
      ...prev,
      polls: prev.polls.map(p => p.id === pollId ? {
        ...p,
        votes: p.votes.map((v, i) => i === optIndex ? v + 1 : v),
        total: p.total + 1
      } : p)
    }));
  };

  const handleCreate = () => {
    if (!form.question) return;
    const n = { id: Date.now(), question: form.question, options: form.options.filter(Boolean), votes: form.options.filter(Boolean).map(() => 0), total: 0, deadline: form.deadline, status: "active" };
    setData(prev => ({ ...prev, polls: [n, ...prev.polls] }));
    setShowModal(false);
    setForm({ question: "", options: ["", "", ""], deadline: "" });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ color: "#e2e8f0", fontSize: 26, fontFamily: "'Playfair Display', serif", margin: "0 0 4px 0" }}>Democratic Polls</h2>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Every decision put to a vote — no more one-person committees</p>
        </div>
        <button style={btnPrimary} onClick={() => setShowModal(true)}><Icon name="plus" size={16} /> Create Poll</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {data.polls.map(poll => (
          <div key={poll.id} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 14, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
              <h3 style={{ color: "#e2e8f0", fontSize: 16, margin: 0, fontWeight: 600, flex: 1 }}>{poll.question}</h3>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Badge status={poll.status} />
                <span style={{ color: "#475569", fontSize: 12 }}>{poll.total} votes · Deadline: {poll.deadline}</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {poll.options.map((opt, i) => {
                const pct = poll.total > 0 ? Math.round((poll.votes[i] / poll.total) * 100) : 0;
                const isVoted = voted[poll.id] === i;
                const hasVoted = voted[poll.id] !== undefined;
                const isWinning = poll.votes[i] === Math.max(...poll.votes);
                return (
                  <div key={i} onClick={() => poll.status === "active" && handleVote(poll.id, i)} style={{ cursor: poll.status === "active" && !hasVoted ? "pointer" : "default", background: isVoted ? "#1b1b3a" : "#0d1117", border: `1px solid ${isVoted ? "#818cf8" : isWinning && (hasVoted || poll.status === "closed") ? "#4ade8033" : "#2a2f45"}`, borderRadius: 10, padding: "12px 16px", position: "relative", overflow: "hidden", transition: "all 0.2s" }}>
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: isVoted ? "#818cf810" : "#4ade8008", transition: "width 0.5s ease" }} />
                    <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        {isVoted && <Icon name="check" size={14} />}
                        <span style={{ color: isVoted ? "#818cf8" : "#e2e8f0", fontSize: 14 }}>{opt}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ color: isWinning ? "#4ade80" : "#64748b", fontSize: 13, fontWeight: 700 }}>{pct}%</span>
                        <span style={{ color: "#475569", fontSize: 12 }}>({poll.votes[i]})</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create a New Poll">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div><label style={labelStyle}>Question</label><textarea style={{ ...inputStyle, height: 70, resize: "vertical" }} value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} placeholder="What should the society decide?" /></div>
          {form.options.map((opt, i) => (
            <div key={i}><label style={labelStyle}>Option {i + 1}</label><input style={inputStyle} value={opt} onChange={e => { const o = [...form.options]; o[i] = e.target.value; setForm({ ...form, options: o }); }} placeholder={`Option ${i + 1}`} /></div>
          ))}
          <div><label style={labelStyle}>Deadline</label><input type="date" style={inputStyle} value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} /></div>
          <button style={{ ...btnPrimary, justifyContent: "center" }} onClick={handleCreate}>Create Poll</button>
        </div>
      </Modal>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: NOTICES
// ═══════════════════════════════════════════════════════════════════════════════
const Notices = ({ data, setData }) => {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", type: "info", author: "" });
  const typeColors = { important: "#f87171", alert: "#fb923c", info: "#38bdf8", community: "#4ade80" };

  const handlePost = () => {
    if (!form.title || !form.content) return;
    const n = { id: Date.now(), ...form, date: new Date().toISOString().slice(0, 10), pinned: false };
    setData(prev => ({ ...prev, notices: [n, ...prev.notices] }));
    setShowModal(false);
    setForm({ title: "", content: "", type: "info", author: "" });
  };

  const togglePin = (id) => {
    setData(prev => ({ ...prev, notices: prev.notices.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n) }));
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ color: "#e2e8f0", fontSize: 26, fontFamily: "'Playfair Display', serif", margin: "0 0 4px 0" }}>Notice Board</h2>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Official announcements visible to all residents</p>
        </div>
        <button style={btnPrimary} onClick={() => setShowModal(true)}><Icon name="plus" size={16} /> Post Notice</button>
      </div>

      {/* Pinned */}
      {data.notices.filter(n => n.pinned).length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: "#fbbf24", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>📌 Pinned</div>
          {data.notices.filter(n => n.pinned).map(n => (
            <div key={n.id} style={{ background: "#1e2030", border: `2px solid ${typeColors[n.type]}33`, borderLeft: `4px solid ${typeColors[n.type]}`, borderRadius: 12, padding: 20, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ background: `${typeColors[n.type]}22`, color: typeColors[n.type], borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{n.type}</span>
                  <span style={{ color: "#475569", fontSize: 12 }}>{n.author} · {n.date}</span>
                </div>
                <button onClick={() => togglePin(n.id)} style={{ background: "#1b1a12", border: "1px solid #fbbf2444", borderRadius: 6, padding: "3px 10px", color: "#fbbf24", cursor: "pointer", fontSize: 11 }}>Unpin</button>
              </div>
              <h3 style={{ color: "#e2e8f0", margin: "0 0 8px 0", fontSize: 16, fontWeight: 700 }}>{n.title}</h3>
              <p style={{ color: "#94a3b8", fontSize: 14, margin: 0, lineHeight: 1.6 }}>{n.content}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {data.notices.filter(n => !n.pinned).map(n => (
          <div key={n.id} style={{ background: "#161b27", border: "1px solid #2a2f45", borderLeft: `4px solid ${typeColors[n.type]}66`, borderRadius: 12, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ background: `${typeColors[n.type]}22`, color: typeColors[n.type], borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{n.type}</span>
                <span style={{ color: "#475569", fontSize: 12 }}>{n.author} · {n.date}</span>
              </div>
              <button onClick={() => togglePin(n.id)} style={{ background: "none", border: "1px solid #2a2f45", borderRadius: 6, padding: "3px 10px", color: "#64748b", cursor: "pointer", fontSize: 11 }}>Pin</button>
            </div>
            <h3 style={{ color: "#e2e8f0", margin: "0 0 6px 0", fontSize: 15, fontWeight: 600 }}>{n.title}</h3>
            <p style={{ color: "#64748b", fontSize: 13, margin: 0, lineHeight: 1.5 }}>{n.content}</p>
          </div>
        ))}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Post a Notice">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div><label style={labelStyle}>Title</label><input style={inputStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Notice title" /></div>
          <div><label style={labelStyle}>Type</label><select style={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{["info", "alert", "important", "community"].map(t => <option key={t}>{t}</option>)}</select></div>
          <div><label style={labelStyle}>Author / Department</label><input style={inputStyle} value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} placeholder="e.g. Secretary, Welfare Committee" /></div>
          <div><label style={labelStyle}>Content</label><textarea style={{ ...inputStyle, height: 100, resize: "vertical" }} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Full notice content…" /></div>
          <button style={{ ...btnPrimary, justifyContent: "center" }} onClick={handlePost}>Post Notice</button>
        </div>
      </Modal>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: AI ASSISTANT
// ═══════════════════════════════════════════════════════════════════════════════
const AIAssistant = ({ data }) => {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Namaste! 🙏 I'm your Society AI — trained on Indian RWA laws, housing society norms, and conflict resolution techniques. Ask me anything: disputes, rules, meeting procedures, maintenance best practices, or how to handle difficult neighbors!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesRef = useRef(null);
  const quickQuestions = [
    "How do I handle a noise complaint legally?",
    "What are RWA member rights under law?",
    "How to call an emergency general meeting?",
    "What can society do about defaulters?",
    "How to resolve parking disputes fairly?",
    "Can society ban a resident from common areas?",
  ];

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    const newMessages = [...messages, { role: "user", content: msg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const contextSummary = `Society context: ${data.complaints.filter(c=>c.status==="open").length} open complaints, ₹${data.finances.balance.toLocaleString("en-IN")} in balance, ${data.finances.collections.filter(c=>!c.paid).length} fee defaulters.`;
      const reply = await callAI(
        newMessages.map(m => ({ role: m.role, content: m.content })),
        `You are SocietyOS AI — an expert assistant for Indian apartment societies (RWAs/AOAs). You know Indian housing society laws, the Apartment Ownership Acts, RERA, conflict resolution, mediation, and community management. ${contextSummary} Be empathetic, practical, and specific to Indian context. Keep answers concise and actionable. Use bullet points when helpful.`
      );
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "I'm having trouble connecting right now. Please try again." }]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages, loading]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 200px)", minHeight: 500 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: "#e2e8f0", fontSize: 26, fontFamily: "'Playfair Display', serif", margin: "0 0 4px 0" }}>AI Society Assistant</h2>
        <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Powered by Claude — knows Indian RWA laws, conflict resolution & community management</p>
      </div>

      {/* Quick Questions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {quickQuestions.map((q, i) => (
          <button key={i} onClick={() => sendMessage(q)} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 20, padding: "6px 14px", color: "#94a3b8", cursor: "pointer", fontSize: 12, transition: "all 0.2s", whiteSpace: "nowrap" }}>
            {q}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div ref={messagesRef} style={{ flex: 1, overflowY: "auto", background: "#0d1117", borderRadius: 16, border: "1px solid #2a2f45", padding: 20, marginBottom: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", gap: 12, justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            {m.role === "assistant" && (
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #312e81, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name="ai" size={16} />
              </div>
            )}
            <div style={{ maxWidth: "75%", background: m.role === "user" ? "linear-gradient(135deg, #d97706, #f59e0b)" : "#161b27", border: m.role === "user" ? "none" : "1px solid #2a2f45", borderRadius: m.role === "user" ? "18px 4px 18px 18px" : "4px 18px 18px 18px", padding: "12px 16px", color: m.role === "user" ? "#0d0f14" : "#cbd5e1", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {m.content}
            </div>
            {m.role === "user" && (
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1e2535", border: "1px solid #2a2f45", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name="user" size={16} />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #312e81, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="ai" size={16} />
            </div>
            <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: "4px 18px 18px 18px", padding: "14px 18px", display: "flex", gap: 6 }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#818cf8", animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`, opacity: 0.7 }} />)}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 10 }}>
        <input
          style={{ ...inputStyle, flex: 1, padding: "14px 18px", borderRadius: 12, fontSize: 14 }}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="Ask about conflicts, RWA laws, maintenance, finances…"
        />
        <button onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{ ...btnPrimary, borderRadius: 12, padding: "0 20px", opacity: loading || !input.trim() ? 0.5 : 1 }}>
          <Icon name="send" size={16} />
        </button>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&display=swap');
      `}</style>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: RESIDENTS & FLAT PROFILES + HARMONY SCORE
// ═══════════════════════════════════════════════════════════════════════════════
const calcHarmony = (r) => {
  let score = 100;
  score -= r.defaultMonths * 8;
  score -= r.complaintsAgainst * 15;
  score -= Math.max(0, (r.pollsTotal - r.pollsVoted) * 4);
  score -= r.complaintsRaised > 4 ? 5 : 0;
  score = Math.max(0, Math.min(100, score));
  return score;
};
const harmonyColor = (s) => s >= 80 ? "#4ade80" : s >= 55 ? "#fbbf24" : "#f87171";
const harmonyLabel = (s) => s >= 80 ? "Excellent" : s >= 55 ? "Moderate" : "At Risk";

const ResidentCard = ({ r, complaints, onClick }) => {
  const score = calcHarmony(r);
  const against = complaints.filter(c => c.flat !== r.flat && c.description?.toLowerCase().includes(r.flat)).length + r.complaintsAgainst;
  return (
    <div onClick={onClick} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 14, padding: 18, cursor: "pointer", transition: "border-color 0.2s", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, right: 0, width: 4, bottom: 0, background: harmonyColor(score), borderRadius: "0 14px 14px 0", opacity: 0.6 }} />
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${harmonyColor(score)}22`, border: `2px solid ${harmonyColor(score)}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ color: harmonyColor(score), fontSize: 14, fontWeight: 800 }}>{r.avatar}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6 }}>
            <div>
              <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700 }}>{r.name}</div>
              <div style={{ color: "#475569", fontSize: 12, marginTop: 2 }}>Flat {r.flat} · {r.type === "owner" ? "Owner" : "Tenant"} · {r.members} members</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: harmonyColor(score), fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{score}</div>
              <div style={{ color: harmonyColor(score), fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{harmonyLabel(score)}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {[
              { label: "Dues", val: r.defaultMonths === 0 ? "✓ Clear" : `${r.defaultMonths}mo pending`, color: r.defaultMonths === 0 ? "#4ade80" : "#f87171" },
              { label: "Complaints vs them", val: r.complaintsAgainst, color: r.complaintsAgainst === 0 ? "#4ade80" : "#f87171" },
              { label: "Poll participation", val: `${r.pollsVoted}/${r.pollsTotal}`, color: r.pollsVoted >= r.pollsTotal * 0.7 ? "#4ade80" : "#fbbf24" },
            ].map((x, i) => (
              <div key={i} style={{ background: "#0d1117", borderRadius: 6, padding: "4px 10px" }}>
                <span style={{ color: "#475569", fontSize: 10 }}>{x.label}: </span>
                <span style={{ color: x.color, fontSize: 11, fontWeight: 700 }}>{x.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Residents = ({ data }) => {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const resident = selected ? data.residents.find(r => r.flat === selected) : null;
  const score = resident ? calcHarmony(resident) : 0;

  const filtered = data.residents.filter(r => {
    const s = calcHarmony(r);
    if (filter === "atrisk") return s < 55;
    if (filter === "owners") return r.type === "owner";
    if (filter === "tenants") return r.type === "tenant";
    return true;
  }).sort((a, b) => calcHarmony(b) - calcHarmony(a));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ color: "#e2e8f0", fontSize: 26, fontFamily: "'Playfair Display', serif", margin: "0 0 4px 0" }}>Resident Profiles</h2>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Flat-wise profiles with AI Harmony Score — community health at a glance</p>
        </div>
        <div style={{ background: "#161b27", border: "1px solid #818cf833", borderRadius: 10, padding: "10px 16px", display: "flex", gap: 8, alignItems: "center" }}>
          <Icon name="harmony" size={14} /><span style={{ color: "#818cf8", fontSize: 12, fontWeight: 600 }}>AI Harmony Score™ — India's first predictive conflict scoring</span>
        </div>
      </div>

      {/* Score legend */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {[{ label: "80–100 Excellent", color: "#4ade80" }, { label: "55–79 Moderate", color: "#fbbf24" }, { label: "0–54 At Risk", color: "#f87171" }].map((x, i) => (
          <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", background: "#161b27", border: `1px solid ${x.color}33`, borderRadius: 20, padding: "4px 12px" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: x.color }} />
            <span style={{ color: x.color, fontSize: 12, fontWeight: 600 }}>{x.label}</span>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          {["all", "atrisk", "owners", "tenants"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? "#1e2535" : "none", border: filter === f ? "1px solid #2a2f45" : "1px solid transparent", borderRadius: 8, padding: "4px 12px", color: filter === f ? "#e2e8f0" : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>{f === "atrisk" ? "⚠ At Risk" : f}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
        {filtered.map(r => <ResidentCard key={r.flat} r={r} complaints={data.complaints} onClick={() => setSelected(r.flat)} />)}
      </div>

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={resident ? `Flat ${resident.flat} — ${resident.name}` : ""}>
        {resident && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Harmony Score */}
            <div style={{ background: "#0d1117", borderRadius: 12, padding: 20, display: "flex", gap: 20, alignItems: "center" }}>
              <div style={{ width: 70, height: 70, borderRadius: "50%", background: `conic-gradient(${harmonyColor(score)} 0% ${score}%, #1e2535 ${score}% 100%)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#0d1117", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                  <span style={{ color: harmonyColor(score), fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{score}</span>
                </div>
              </div>
              <div>
                <div style={{ color: harmonyColor(score), fontSize: 18, fontWeight: 700 }}>{harmonyLabel(score)} Resident</div>
                <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>AI Harmony Score based on payment history, complaints, and civic participation</div>
                {score < 55 && <div style={{ color: "#f87171", fontSize: 12, marginTop: 6, fontWeight: 600 }}>⚠ Secretary review recommended</div>}
              </div>
            </div>

            {/* Details Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Resident Since", val: resident.since },
                { label: "Type", val: resident.type === "owner" ? "Flat Owner" : "Tenant" },
                { label: "Household Members", val: resident.members },
                { label: "Vehicle", val: resident.vehicle },
                { label: "Phone", val: resident.phone },
                { label: "Email", val: resident.email },
              ].map((x, i) => (
                <div key={i} style={{ background: "#0d1117", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ color: "#475569", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>{x.label}</div>
                  <div style={{ color: "#e2e8f0", fontSize: 13 }}>{x.val}</div>
                </div>
              ))}
            </div>

            {/* Score Breakdown */}
            <div style={{ background: "#0d1117", borderRadius: 10, padding: 16 }}>
              <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Score Breakdown</div>
              {[
                { label: "Payment record", val: resident.defaultMonths === 0 ? "+40 pts" : `-${resident.defaultMonths * 8} pts`, color: resident.defaultMonths === 0 ? "#4ade80" : "#f87171", note: resident.defaultMonths === 0 ? "All dues clear" : `${resident.defaultMonths} months pending` },
                { label: "Community complaints", val: resident.complaintsAgainst === 0 ? "+30 pts" : `-${resident.complaintsAgainst * 15} pts`, color: resident.complaintsAgainst === 0 ? "#4ade80" : "#f87171", note: `${resident.complaintsAgainst} complaints filed against them` },
                { label: "Poll participation", val: `${Math.round((resident.pollsVoted / resident.pollsTotal) * 30)} pts`, color: "#4ade80", note: `Voted in ${resident.pollsVoted}/${resident.pollsTotal} polls` },
              ].map((x, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 2 ? "1px solid #1e2535" : "none", alignItems: "center" }}>
                  <div>
                    <div style={{ color: "#cbd5e1", fontSize: 13 }}>{x.label}</div>
                    <div style={{ color: "#475569", fontSize: 11 }}>{x.note}</div>
                  </div>
                  <span style={{ color: x.color, fontWeight: 700, fontSize: 14 }}>{x.val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: COMMITTEE & GOVERNANCE
// ═══════════════════════════════════════════════════════════════════════════════
const Committee = ({ data, setData }) => {
  const [tab, setTab] = useState("members");
  const [aiReport, setAiReport] = useState("");
  const [loadingReport, setLoadingReport] = useState(false);

  const roleColors = { President: "#f59e0b", Secretary: "#818cf8", Treasurer: "#4ade80", "Committee Member": "#38bdf8" };
  const roleIcons = { President: "shield", Secretary: "log", Treasurer: "finance", "Committee Member": "committee" };

  const daysLeft = (dateStr) => {
    const diff = new Date(dateStr) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const voteMotion = (motionId, vote) => {
    setData(prev => ({
      ...prev,
      committee: {
        ...prev.committee,
        motions: prev.committee.motions.map(m => m.id === motionId ? { ...m, votes: { ...m.votes, [vote]: m.votes[vote] + 1 } } : m)
      }
    }));
  };

  const generateReport = async () => {
    setLoadingReport(true);
    const summary = `
      Society: Sunrise Residency
      Open complaints: ${data.complaints.filter(c => c.status === "open").length}
      Resolved this month: ${data.complaints.filter(c => c.status === "resolved").length}
      Fee collection: ${data.finances.collections.filter(c => c.paid).length}/${data.finances.collections.length} flats paid
      Expenses this month: ₹32,500
      Balance: ₹${data.finances.balance.toLocaleString("en-IN")}
      Maintenance tasks open: ${data.maintenance.filter(m => m.status === "open").length}
      Active polls: ${data.polls.filter(p => p.status === "active").length}
      Motions passed: ${data.committee.motions.filter(m => m.status === "passed").length}
    `;
    try {
      const result = await callAI(
        [{ role: "user", content: `Generate a concise monthly committee report for March 2026 based on this data:\n${summary}\n\nFormat as a formal but readable report with sections: Executive Summary, Financial Status, Complaints & Resolutions, Maintenance, Upcoming Actions. Keep it under 300 words.` }],
        "You are generating official monthly committee reports for an Indian apartment society (RWA). Write formally but clearly. Use Indian currency format. Be specific with numbers."
      );
      setAiReport(result);
    } catch (e) { setAiReport("Error generating report."); }
    setLoadingReport(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ color: "#e2e8f0", fontSize: 26, fontFamily: "'Playfair Display', serif", margin: "0 0 4px 0" }}>Committee & Governance</h2>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Roles, motions, audit trail — fully transparent governance</p>
        </div>
        <button onClick={generateReport} disabled={loadingReport} style={{ ...btnPrimary, opacity: loadingReport ? 0.6 : 1 }}>
          <Icon name="ai" size={15} />{loadingReport ? "Generating…" : "AI Monthly Report"}
        </button>
      </div>

      {/* AI Report */}
      {aiReport && (
        <div style={{ background: "#1b1b3a", border: "1px solid #818cf833", borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
            <Icon name="ai" size={14} /><span style={{ color: "#818cf8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>AI Generated Monthly Report — March 2026</span>
            <button onClick={() => setAiReport("")} style={{ marginLeft: "auto", background: "none", border: "none", color: "#475569", cursor: "pointer" }}><Icon name="close" size={14} /></button>
          </div>
          <pre style={{ color: "#c4b5fd", fontSize: 13, lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{aiReport}</pre>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, background: "#0d1117", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {["members", "motions", "audit", "rules"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? "#1e2535" : "none", border: tab === t ? "1px solid #2a2f45" : "none", borderRadius: 8, padding: "8px 16px", color: tab === t ? "#e2e8f0" : "#64748b", cursor: "pointer", fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{t === "audit" ? "Audit Log" : t === "rules" ? "Escalation Rules" : t}</button>
        ))}
      </div>

      {tab === "members" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {data.committee.members.map(m => {
            const days = daysLeft(m.termEnd);
            const termPct = Math.max(0, Math.min(100, 100 - (days / 730) * 100));
            return (
              <div key={m.id} style={{ background: "#161b27", border: `1px solid ${roleColors[m.role]}33`, borderRadius: 14, padding: 20 }}>
                <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `${roleColors[m.role]}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name={roleIcons[m.role]} size={20} />
                  </div>
                  <div>
                    <div style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 700 }}>{m.name}</div>
                    <div style={{ color: roleColors[m.role], fontSize: 12, fontWeight: 700, marginTop: 2 }}>{m.role}</div>
                    <div style={{ color: "#475569", fontSize: 11 }}>Flat {m.flat} · {m.phone}</div>
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#64748b", fontSize: 11 }}>Term progress</span>
                    <span style={{ color: days < 90 ? "#f87171" : "#94a3b8", fontSize: 11, fontWeight: 600 }}>{days > 0 ? `${days} days left` : "Term ended"}</span>
                  </div>
                  <div style={{ height: 4, background: "#0d1117", borderRadius: 4 }}>
                    <div style={{ height: "100%", width: `${termPct}%`, background: days < 90 ? "#f87171" : roleColors[m.role], borderRadius: 4, transition: "width 0.5s" }} />
                  </div>
                </div>
                <div>
                  {m.responsibilities.map((r, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                      <div style={{ width: 4, height: 4, borderRadius: "50%", background: roleColors[m.role], flexShrink: 0 }} />
                      <span style={{ color: "#94a3b8", fontSize: 12 }}>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "motions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {data.committee.motions.map(m => {
            const total = m.votes.yes + m.votes.no + m.votes.abstain;
            const yesPct = total > 0 ? Math.round((m.votes.yes / m.quorum) * 100) : 0;
            return (
              <div key={m.id} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 14, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                  <div>
                    <h3 style={{ color: "#e2e8f0", fontSize: 15, margin: "0 0 4px 0", fontWeight: 600 }}>{m.title}</h3>
                    <div style={{ color: "#475569", fontSize: 12 }}>Proposed by {m.proposedBy} · {m.date} · Quorum: {m.quorum} votes needed</div>
                  </div>
                  <Badge status={m.status === "passed" ? "resolved" : m.status === "voting" ? "mediating" : "open"} />
                </div>
                <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                  {[{ label: "Yes", val: m.votes.yes, color: "#4ade80" }, { label: "No", val: m.votes.no, color: "#f87171" }, { label: "Abstain", val: m.votes.abstain, color: "#64748b" }].map((v, i) => (
                    <div key={i} style={{ background: "#0d1117", borderRadius: 8, padding: "8px 16px", textAlign: "center" }}>
                      <div style={{ color: v.color, fontSize: 20, fontWeight: 800 }}>{v.val}</div>
                      <div style={{ color: "#475569", fontSize: 11 }}>{v.label}</div>
                    </div>
                  ))}
                  <div style={{ flex: 1, minWidth: 120, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                      <span>Quorum progress</span><span>{total}/{m.quorum}</span>
                    </div>
                    <div style={{ height: 6, background: "#0d1117", borderRadius: 3 }}>
                      <div style={{ height: "100%", width: `${Math.min(100, (total / m.quorum) * 100)}%`, background: "#4ade80", borderRadius: 3 }} />
                    </div>
                  </div>
                </div>
                {m.status === "voting" && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {["yes", "no", "abstain"].map(v => (
                      <button key={v} onClick={() => voteMotion(m.id, v)} style={{ background: v === "yes" ? "#1b2d1b" : v === "no" ? "#2d1b1b" : "#1e2535", border: `1px solid ${v === "yes" ? "#4ade8044" : v === "no" ? "#f8717144" : "#2a2f45"}`, borderRadius: 8, padding: "7px 16px", color: v === "yes" ? "#4ade80" : v === "no" ? "#f87171" : "#94a3b8", cursor: "pointer", fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>Vote {v}</button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "audit" && (
        <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", background: "#0d1117", borderBottom: "1px solid #2a2f45", display: "flex", gap: 8, alignItems: "center" }}>
            <Icon name="log" size={14} />
            <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Immutable Audit Log — all committee actions recorded</span>
          </div>
          {data.committee.auditLog.map((entry, i) => (
            <div key={entry.id} style={{ padding: "14px 20px", borderBottom: i < data.committee.auditLog.length - 1 ? "1px solid #1e2535" : "none", display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: entry.role === "System" ? "#818cf8" : entry.role === "President" ? "#f59e0b" : entry.role === "Treasurer" ? "#4ade80" : "#38bdf8", marginTop: 5, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: "#e2e8f0", fontSize: 13 }}>{entry.action}</div>
                <div style={{ color: "#475569", fontSize: 11, marginTop: 3 }}>{entry.by} · {entry.date}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "rules" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "#1b1b2d", border: "1px solid #818cf833", borderRadius: 12, padding: 16, marginBottom: 4 }}>
            <div style={{ color: "#818cf8", fontSize: 13, fontWeight: 600 }}>These rules run automatically — no human needed to escalate</div>
          </div>
          {data.committee.escalationRules.map((rule, i) => (
            <div key={i} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <span style={{ background: "#2d2510", color: "#fbbf24", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>TRIGGER</span>
                  <span style={{ color: "#fbbf24", fontSize: 13 }}>{rule.trigger}</span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ background: "#1b2d1b", color: "#4ade80", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>ACTION</span>
                  <span style={{ color: "#94a3b8", fontSize: 13 }}>{rule.action}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: rule.active ? "#4ade80" : "#475569" }} />
                <span style={{ color: rule.active ? "#4ade80" : "#475569", fontSize: 12, fontWeight: 600 }}>{rule.active ? "Active" : "Disabled"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: WHATSAPP INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════
const WhatsAppCenter = ({ data, setData }) => {
  const [tab, setTab] = useState("notifications");
  const [preview, setPreview] = useState(null);
  const [testSent, setTestSent] = useState({});

  const toggleNotif = (id) => {
    setData(prev => ({
      ...prev,
      whatsapp: {
        ...prev.whatsapp,
        notifications: prev.whatsapp.notifications.map(n => n.id === id ? { ...n, enabled: !n.enabled } : n)
      }
    }));
  };

  const sendTest = (id) => {
    setTestSent(prev => ({ ...prev, [id]: true }));
    setTimeout(() => setTestSent(prev => ({ ...prev, [id]: false })), 2500);
  };

  const statusColor = { delivered: "#4ade80", read: "#38bdf8", failed: "#f87171", pending: "#fbbf24" };
  const typeIcon = { fee_reminder: "💰", complaint_update: "⚖️", new_notice: "📢", poll_open: "🗳️", maintenance_alert: "🔧", visitor_approval: "👤", payment_confirmed: "✅" };

  const commands = [
    { cmd: "BALANCE", response: "Society balance: ₹2,84,500. Updated March 18, 2026." },
    { cmd: "MY DUES", response: "Flat 101 (Sharma): All dues clear ✓ March 2026 paid." },
    { cmd: "COMPLAINT", response: "Raising complaint... Reply with: CATEGORY | DESCRIPTION" },
    { cmd: "STATUS 103", response: "Complaint #3: Loud music - Flat 501. Status: Mediating. AI mediation in progress." },
    { cmd: "HELP", response: "Commands: BALANCE, MY DUES, COMPLAINT, STATUS [id], NOTICES, NEXT POLL" },
    { cmd: "NOTICES", response: "Latest: 1) AGM March 30 2) Water off March 20 3) New parking rules. Full list: [link]" },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ color: "#e2e8f0", fontSize: 26, fontFamily: "'Playfair Display', serif", margin: "0 0 4px 0" }}>WhatsApp Integration</h2>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Automated notifications + two-way commands for every resident</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", background: "#1b2d1b", border: "1px solid #4ade8033", borderRadius: 10, padding: "10px 16px" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80" }} />
          <span style={{ color: "#4ade80", fontSize: 13, fontWeight: 600 }}>{data.whatsapp.number}</span>
          <span style={{ color: "#475569", fontSize: 12 }}>· Connected</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Messages Sent", val: data.whatsapp.sentLog.length, color: "#4ade80" },
          { label: "Active Triggers", val: data.whatsapp.notifications.filter(n => n.enabled).length, color: "#818cf8" },
          { label: "Residents Reached", val: "10/10", color: "#38bdf8" },
          { label: "Delivery Rate", val: "100%", color: "#fbbf24" },
        ].map((s, i) => (
          <div key={i} style={{ background: "#161b27", border: `1px solid ${s.color}22`, borderLeft: `3px solid ${s.color}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ color: s.color, fontSize: 22, fontWeight: 800 }}>{s.val}</div>
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, background: "#0d1117", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {["notifications", "sent log", "commands", "setup"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? "#1e2535" : "none", border: tab === t ? "1px solid #2a2f45" : "none", borderRadius: 8, padding: "8px 16px", color: tab === t ? "#e2e8f0" : "#64748b", cursor: "pointer", fontSize: 13, fontWeight: 600, textTransform: "capitalize", whiteSpace: "nowrap" }}>{t}</button>
        ))}
      </div>

      {tab === "notifications" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {data.whatsapp.notifications.map(n => (
            <div key={n.id} style={{ background: "#161b27", border: `1px solid ${n.enabled ? "#25d3662a" : "#2a2f45"}`, borderRadius: 12, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 20 }}>{typeIcon[n.type]}</span>
                  <div>
                    <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600 }}>{n.label}</div>
                    <div style={{ color: "#475569", fontSize: 11 }}>Auto-trigger on event</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={() => sendTest(n.id)} style={{ background: "#1b2d1b", border: "1px solid #4ade8033", borderRadius: 6, padding: "5px 12px", color: testSent[n.id] ? "#4ade80" : "#94a3b8", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    {testSent[n.id] ? "✓ Sent!" : "Test Send"}
                  </button>
                  <button onClick={() => toggleNotif(n.id)} style={{ width: 44, height: 24, borderRadius: 12, border: "none", background: n.enabled ? "#25d366" : "#2a2f45", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: n.enabled ? 23 : 3, transition: "left 0.2s" }} />
                  </button>
                </div>
              </div>
              {/* WA Message Preview */}
              <div style={{ background: "#0d1117", borderRadius: 8, padding: 12, borderLeft: "3px solid #25d366" }}>
                <div style={{ color: "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Message Template</div>
                <div style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>{n.template}</div>
              </div>
              {preview === n.id && (
                <div style={{ marginTop: 10, background: "#1a2a1a", borderRadius: 10, padding: 14, border: "1px solid #25d36633" }}>
                  <div style={{ color: "#25d366", fontSize: 11, fontWeight: 700, marginBottom: 8 }}>📱 WhatsApp Preview</div>
                  <div style={{ background: "#1e3520", borderRadius: "12px 12px 12px 4px", padding: "10px 14px", maxWidth: 280 }}>
                    <div style={{ color: "#e2fce4", fontSize: 13, lineHeight: 1.5 }}>{n.template.replace("{name}", "Sharma Ji").replace("{date}", "March 31").replace("{link}", "society.app/pay").replace("{amount}", "3,000").replace("{month}", "March 2026").replace("{id}", "3").replace("{title}", "Loud music").replace("{status}", "mediating").replace("{question}", "CCTV cameras?").replace("{deadline}", "March 25").replace("{date}", "March 20").replace("{time}", "10am-2pm").replace("{impact}", "Store water.").replace("{flat}", "101").replace("{visitor}", "Raju Kumar")}</div>
                    <div style={{ color: "#4ade8088", fontSize: 10, textAlign: "right", marginTop: 4 }}>✓✓ Delivered</div>
                  </div>
                  <button onClick={() => setPreview(null)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 11, marginTop: 8 }}>Close preview</button>
                </div>
              )}
              {preview !== n.id && <button onClick={() => setPreview(n.id)} style={{ background: "none", border: "none", color: "#25d366", cursor: "pointer", fontSize: 12, marginTop: 8, padding: 0 }}>Preview message →</button>}
            </div>
          ))}
        </div>
      )}

      {tab === "sent log" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.whatsapp.sentLog.map(msg => (
            <div key={msg.id} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 16, display: "flex", gap: 14, alignItems: "flex-start" }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{typeIcon[msg.type]}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
                  <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600 }}>To: {msg.to}</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ color: statusColor[msg.status], fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>● {msg.status}</span>
                    <span style={{ color: "#475569", fontSize: 11 }}>{msg.time}</span>
                  </div>
                </div>
                <div style={{ background: "#0d1117", borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.5 }}>{msg.message}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "commands" && (
        <div>
          <div style={{ background: "#1b2d1b", border: "1px solid #4ade8033", borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ color: "#4ade80", fontSize: 13, fontWeight: 600 }}>Residents can WhatsApp these commands to {data.whatsapp.number} and get instant replies</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {commands.map((c, i) => (
              <div key={i} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 16, display: "grid", gridTemplateColumns: "140px 1fr", gap: 16, alignItems: "center" }}>
                <div style={{ background: "#0d1117", border: "1px solid #25d36633", borderRadius: 8, padding: "8px 14px", textAlign: "center" }}>
                  <div style={{ color: "#25d366", fontSize: 14, fontWeight: 800, fontFamily: "monospace" }}>{c.cmd}</div>
                  <div style={{ color: "#475569", fontSize: 10, marginTop: 2 }}>resident sends</div>
                </div>
                <div style={{ background: "#1e3520", borderRadius: "4px 12px 12px 12px", padding: "10px 14px" }}>
                  <div style={{ color: "#e2fce4", fontSize: 13, lineHeight: 1.5 }}>{c.response}</div>
                  <div style={{ color: "#4ade8088", fontSize: 10, textAlign: "right", marginTop: 4 }}>Bot replies instantly</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "setup" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { step: 1, title: "Create Meta Business Account", desc: "Go to business.facebook.com → create account → verify your society's identity with registration docs", status: "done", link: "business.facebook.com" },
            { step: 2, title: "Apply for WhatsApp Business API", desc: "In Meta Business Suite → WhatsApp → Get Started. Choose 'Direct from Meta' (free). Takes 2–3 days for approval.", status: "done", link: "business.facebook.com/wa/signup" },
            { step: 3, title: "Get your Phone Number ID & Token", desc: "After approval, Meta gives you a Phone Number ID and temporary access token. Add these to your Supabase environment variables.", status: "pending", link: null },
            { step: 4, title: "Create Supabase Edge Function", desc: "Deploy a single edge function that listens to DB changes (via webhooks/triggers) and calls the WhatsApp API. Zero server needed.", status: "pending", link: null },
            { step: 5, title: "Set up webhook for inbound messages", desc: "Point Meta's webhook URL to your Supabase Edge Function endpoint. Residents' replies will auto-update the DB.", status: "pending", link: null },
          ].map((s) => (
            <div key={s.step} style={{ background: "#161b27", border: `1px solid ${s.status === "done" ? "#4ade8033" : "#2a2f45"}`, borderRadius: 12, padding: 18, display: "flex", gap: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: s.status === "done" ? "#1b2d1b" : "#1e2535", border: `2px solid ${s.status === "done" ? "#4ade80" : "#2a2f45"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {s.status === "done" ? <Icon name="check" size={14} /> : <span style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>{s.step}</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{s.title}</div>
                <div style={{ color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>{s.desc}</div>
                {s.link && <div style={{ color: "#38bdf8", fontSize: 12, marginTop: 6 }}>→ {s.link}</div>}
              </div>
            </div>
          ))}
          <div style={{ background: "#1b1b2d", border: "1px solid #818cf833", borderRadius: 12, padding: 16 }}>
            <div style={{ color: "#818cf8", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>💡 Total cost: ₹0/month for first 1,000 conversations</div>
            <div style={{ color: "#64748b", fontSize: 12 }}>Meta gives 1,000 free user-initiated conversations per month. Business-initiated (your notifications) cost ~₹0.40 each. A 10-flat society sends ~50 messages/month = ₹20/month max.</div>
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: STAFF MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════
const StaffManagement = ({ data }) => {
  const [tab, setTab] = useState("staff");
  const [selected, setSelected] = useState(null);
  const [showVisitorForm, setShowVisitorForm] = useState(false);
  const [vForm, setVForm] = useState({ name: "", flat: "", purpose: "", vehicle: "" });

  const statusColor = { "on-duty": "#4ade80", "off-duty": "#64748b", "on-leave": "#f87171" };
  const roleColor = { "Security Guard": "#38bdf8", "Housekeeping": "#f472b6", "Plumber/Electrician": "#fbbf24", "Gardener": "#4ade80" };
  const visitorTypeColor = { "pre-approved": "#4ade80", "delivery": "#38bdf8", "walkin": "#fbbf24" };
  const deliveryStatusColor = { "collected": "#4ade80", "at-gate": "#fbbf24", "uncollected": "#f87171" };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: "#e2e8f0", fontSize: 26, fontFamily: "'Playfair Display', serif", margin: "0 0 4px 0" }}>Gate & Staff Management</h2>
        <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Staff attendance, visitor log, delivery tracking — all in one place</p>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20, background: "#0d1117", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {["staff", "visitors", "deliveries"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? "#1e2535" : "none", border: tab === t ? "1px solid #2a2f45" : "none", borderRadius: 8, padding: "8px 16px", color: tab === t ? "#e2e8f0" : "#64748b", cursor: "pointer", fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{t}</button>
        ))}
      </div>

      {tab === "staff" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 20 }}>
            {[
              { label: "On Duty Now", val: data.staff.filter(s => s.status === "on-duty").length, color: "#4ade80" },
              { label: "Off Duty", val: data.staff.filter(s => s.status === "off-duty").length, color: "#64748b" },
              { label: "On Leave", val: data.staff.filter(s => s.status === "on-leave").length, color: "#f87171" },
              { label: "Avg Rating", val: (data.staff.reduce((s, x) => s + x.rating, 0) / data.staff.length).toFixed(1) + "★", color: "#fbbf24" },
            ].map((s, i) => (
              <div key={i} style={{ background: "#161b27", border: `1px solid ${s.color}22`, borderLeft: `3px solid ${s.color}`, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ color: s.color, fontSize: 22, fontWeight: 800 }}>{s.val}</div>
                <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 12 }}>
            {data.staff.map(s => (
              <div key={s.id} onClick={() => setSelected(selected === s.id ? null : s.id)} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 18, cursor: "pointer" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${roleColor[s.role] || "#64748b"}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: roleColor[s.role] || "#64748b", flexShrink: 0 }}>{s.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700 }}>{s.name}</div>
                      <span style={{ color: statusColor[s.status], fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>● {s.status.replace("-", " ")}</span>
                    </div>
                    <div style={{ color: roleColor[s.role] || "#64748b", fontSize: 12, fontWeight: 600, marginTop: 2 }}>{s.role}</div>
                    <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>Shift: {s.shift}</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {[{ l: "Salary", v: `₹${s.salary.toLocaleString("en-IN")}`, c: "#4ade80" }, { l: "Present", v: `${s.attendance}/28`, c: "#38bdf8" }, { l: "Rating", v: `${s.rating}★`, c: "#fbbf24" }].map((x, i) => (
                    <div key={i} style={{ background: "#0d1117", borderRadius: 7, padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ color: x.c, fontSize: 14, fontWeight: 800 }}>{x.v}</div>
                      <div style={{ color: "#475569", fontSize: 10 }}>{x.l}</div>
                    </div>
                  ))}
                </div>
                {selected === s.id && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #2a2f45" }}>
                    <div style={{ color: "#64748b", fontSize: 12 }}>Since: {s.since} · Phone: {s.phone}</div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>Leaves this month: {s.leaves} days</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      {["Mark Present", "Mark Leave", "Send Notice"].map((a, i) => (
                        <button key={i} style={{ background: "#0d1117", border: "1px solid #2a2f45", borderRadius: 6, padding: "5px 10px", color: "#94a3b8", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{a}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "visitors" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 10 }}>
              {["inside", "expected", "checked-out"].map(s => {
                const count = data.visitors.filter(v => v.status === s).length;
                const colors = { inside: "#4ade80", expected: "#fbbf24", "checked-out": "#64748b" };
                return count > 0 ? <div key={s} style={{ background: `${colors[s]}18`, border: `1px solid ${colors[s]}33`, borderRadius: 20, padding: "4px 12px", color: colors[s], fontSize: 12, fontWeight: 700 }}>● {count} {s.replace("-", " ")}</div> : null;
              })}
            </div>
            <button onClick={() => setShowVisitorForm(true)} style={btnPrimary}><Icon name="plus" size={15} />Pre-Approve Visitor</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.visitors.map(v => (
              <div key={v.id} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 16, display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${visitorTypeColor[v.type]}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: visitorTypeColor[v.type], flexShrink: 0 }}>{v.photo}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
                    <div>
                      <span style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700 }}>{v.name}</span>
                      <span style={{ color: "#475569", fontSize: 12, marginLeft: 8 }}>→ Flat {v.flat}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ background: `${visitorTypeColor[v.type]}18`, color: visitorTypeColor[v.type], borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{v.type}</span>
                      <span style={{ background: v.status === "inside" ? "#1b2d1b" : v.status === "expected" ? "#2d2510" : "#1e2535", color: v.status === "inside" ? "#4ade80" : v.status === "expected" ? "#fbbf24" : "#64748b", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{v.status}</span>
                    </div>
                  </div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>{v.purpose} · {v.vehicle} · In: {v.inTime} {v.outTime ? `· Out: ${v.outTime}` : ""} · {v.date}</div>
                </div>
              </div>
            ))}
          </div>
          <Modal open={showVisitorForm} onClose={() => setShowVisitorForm(false)} title="Pre-Approve a Visitor">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><label style={labelStyle}>Visitor Name</label><input style={inputStyle} value={vForm.name} onChange={e => setVForm({ ...vForm, name: e.target.value })} placeholder="Full name" /></div>
              <div><label style={labelStyle}>For Flat</label><input style={inputStyle} value={vForm.flat} onChange={e => setVForm({ ...vForm, flat: e.target.value })} placeholder="e.g. 205" /></div>
              <div><label style={labelStyle}>Purpose</label><input style={inputStyle} value={vForm.purpose} onChange={e => setVForm({ ...vForm, purpose: e.target.value })} placeholder="e.g. Family visit" /></div>
              <div><label style={labelStyle}>Vehicle Number (optional)</label><input style={inputStyle} value={vForm.vehicle} onChange={e => setVForm({ ...vForm, vehicle: e.target.value })} placeholder="e.g. TS09XX1234" /></div>
              <div style={{ background: "#1b1b2d", border: "1px solid #818cf833", borderRadius: 8, padding: 12, fontSize: 12, color: "#818cf8" }}>✨ A one-time OTP will be sent to Flat {vForm.flat || "?"} resident to confirm this visitor at gate.</div>
              <button style={{ ...btnPrimary, justifyContent: "center" }} onClick={() => setShowVisitorForm(false)}>Pre-Approve & Send OTP</button>
            </div>
          </Modal>
        </div>
      )}

      {tab === "deliveries" && (
        <div>
          <div style={{ background: "#1b2535", border: "1px solid #38bdf833", borderRadius: 12, padding: 14, marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
            <Icon name="package" size={16} /><span style={{ color: "#38bdf8", fontSize: 13, fontWeight: 600 }}>{data.deliveries.filter(d => d.status === "at-gate").length} packages at gate awaiting collection · {data.deliveries.filter(d => d.status === "uncollected").length} uncollected from yesterday</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.deliveries.map(d => (
              <div key={d.id} style={{ background: "#161b27", border: `1px solid ${d.status === "at-gate" ? "#fbbf2433" : d.status === "uncollected" ? "#f8717133" : "#2a2f45"}`, borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
                  <div>
                    <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700 }}>{d.courier} — Flat {d.flat}</div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{d.resident} · {d.items} · {d.inTime} · {d.date}</div>
                  </div>
                  <span style={{ background: `${deliveryStatusColor[d.status]}18`, color: deliveryStatusColor[d.status], borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700 }}>{d.status.replace("-", " ")}</span>
                </div>
                {d.status !== "collected" && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {!d.notified && <button style={{ background: "#1b2535", border: "1px solid #38bdf833", borderRadius: 7, padding: "6px 12px", color: "#38bdf8", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}><Icon name="whatsapp" size={13} />Notify Resident</button>}
                    <button style={{ background: "#1b2d1b", border: "1px solid #4ade8033", borderRadius: 7, padding: "6px 12px", color: "#4ade80", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Mark Collected</button>
                  </div>
                )}
                {d.notified && d.status !== "collected" && <div style={{ fontSize: 11, color: "#4ade80", marginTop: 6 }}>✓ WhatsApp notification sent</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: MEETINGS
// ═══════════════════════════════════════════════════════════════════════════════
const Meetings = ({ data, setData }) => {
  const [showForm, setShowForm] = useState(false);
  const [showMinutes, setShowMinutes] = useState(null);
  const [aiMinutes, setAiMinutes] = useState({});
  const [loadingMinutes, setLoadingMinutes] = useState(null);
  const [rsvpd, setRsvpd] = useState({});
  const [form, setForm] = useState({ title: "", type: "Committee", date: "", time: "", venue: "", agenda: "" });

  const typeColors = { AGM: "#f59e0b", Emergency: "#f87171", Committee: "#818cf8", Welfare: "#4ade80" };

  const generateMinutes = async (meeting) => {
    setLoadingMinutes(meeting.id);
    try {
      const result = await callAI(
        [{ role: "user", content: `Generate formal meeting minutes for:\nTitle: ${meeting.title}\nDate: ${meeting.date} at ${meeting.time}\nVenue: ${meeting.venue}\nAgenda items:\n${meeting.agenda.map((a, i) => `${i + 1}. ${a}`).join("\n")}\nAttendees: Committee members (${meeting.rsvp.yes} present)\n\nWrite concise official minutes with: opened, agenda items discussed with decisions, action items with responsible persons, and closed. Indian society context.` }],
        "You write formal meeting minutes for Indian apartment societies. Be concise, use numbered action items, assign responsibility clearly."
      );
      setAiMinutes(prev => ({ ...prev, [meeting.id]: result }));
    } catch (e) { setAiMinutes(prev => ({ ...prev, [meeting.id]: "Error generating minutes." })); }
    setLoadingMinutes(null);
    setShowMinutes(meeting.id);
  };

  const handleRSVP = (meetingId, response) => {
    setRsvpd(prev => ({ ...prev, [meetingId]: response }));
    setData(prev => ({ ...prev, meetings: prev.meetings.map(m => m.id === meetingId ? { ...m, rsvp: { ...m.rsvp, [response]: m.rsvp[response] + 1 } } : m) }));
  };

  const handleCreate = () => {
    if (!form.title || !form.date) return;
    const n = { id: Date.now(), ...form, agenda: form.agenda.split("\n").filter(Boolean), status: "upcoming", rsvp: { yes: 0, no: 0, maybe: 0 }, minutes: null, organiser: "Secretary" };
    setData(prev => ({ ...prev, meetings: [n, ...prev.meetings] }));
    setShowForm(false);
    setForm({ title: "", type: "Committee", date: "", time: "", venue: "", agenda: "" });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ color: "#e2e8f0", fontSize: 26, fontFamily: "'Playfair Display', serif", margin: "0 0 4px 0" }}>Meetings & Minutes</h2>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>AGMs, committee meetings, emergency calls — RSVP + AI-generated minutes</p>
        </div>
        <button style={btnPrimary} onClick={() => setShowForm(true)}><Icon name="plus" size={15} />Schedule Meeting</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {data.meetings.map(m => (
          <div key={m.id} style={{ background: "#161b27", border: `1px solid ${typeColors[m.type] || "#2a2f45"}33`, borderRadius: 14, overflow: "hidden" }}>
            <div style={{ borderLeft: `4px solid ${typeColors[m.type] || "#64748b"}`, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                <div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <span style={{ background: `${typeColors[m.type]}22`, color: typeColors[m.type], borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{m.type}</span>
                    <Badge status={m.status === "upcoming" ? "scheduled" : m.status === "completed" ? "resolved" : "open"} />
                  </div>
                  <h3 style={{ color: "#e2e8f0", fontSize: 16, margin: "0 0 4px 0", fontWeight: 700 }}>{m.title}</h3>
                  <div style={{ color: "#64748b", fontSize: 13 }}>📅 {m.date} at {m.time} · 📍 {m.venue} · Organised by {m.organiser}</div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  {[{ l: "Going", v: m.rsvp.yes, c: "#4ade80" }, { l: "No", v: m.rsvp.no, c: "#f87171" }, { l: "Maybe", v: m.rsvp.maybe, c: "#fbbf24" }].map((x, i) => (
                    <div key={i} style={{ textAlign: "center", background: "#0d1117", borderRadius: 8, padding: "8px 12px" }}>
                      <div style={{ color: x.c, fontSize: 18, fontWeight: 800 }}>{x.v}</div>
                      <div style={{ color: "#475569", fontSize: 10 }}>{x.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agenda */}
              <div style={{ background: "#0d1117", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Agenda</div>
                {m.agenda.map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <span style={{ color: typeColors[m.type], fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                    <span style={{ color: "#94a3b8", fontSize: 13 }}>{a}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {m.status === "upcoming" && !rsvpd[m.id] && (
                  <>
                    {["yes", "no", "maybe"].map(r => (
                      <button key={r} onClick={() => handleRSVP(m.id, r)} style={{ background: r === "yes" ? "#1b2d1b" : r === "no" ? "#2d1b1b" : "#2d2510", border: `1px solid ${r === "yes" ? "#4ade8044" : r === "no" ? "#f8717144" : "#fbbf2444"}`, borderRadius: 8, padding: "7px 16px", color: r === "yes" ? "#4ade80" : r === "no" ? "#f87171" : "#fbbf24", cursor: "pointer", fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>RSVP: {r === "yes" ? "Going ✓" : r === "no" ? "Can't attend" : "Maybe"}</button>
                    ))}
                  </>
                )}
                {rsvpd[m.id] && <span style={{ color: "#4ade80", fontSize: 13, fontWeight: 600 }}>✓ RSVP recorded: {rsvpd[m.id]}</span>}
                {m.status === "completed" && (
                  <button onClick={() => m.minutes ? setShowMinutes(m.id) : generateMinutes(m)} disabled={loadingMinutes === m.id} style={{ background: "linear-gradient(135deg,#312e81,#4f46e5)", border: "none", borderRadius: 8, padding: "7px 16px", color: "#e2e8f0", cursor: loadingMinutes === m.id ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, opacity: loadingMinutes === m.id ? 0.6 : 1 }}>
                    <Icon name="ai" size={13} />{loadingMinutes === m.id ? "Generating…" : "AI Meeting Minutes"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Minutes Modal */}
      <Modal open={!!showMinutes} onClose={() => setShowMinutes(null)} title="AI Meeting Minutes">
        <pre style={{ color: "#c4b5fd", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>
          {showMinutes && (aiMinutes[showMinutes] || data.meetings.find(m => m.id === showMinutes)?.minutes || "No minutes yet.")}
        </pre>
      </Modal>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Schedule a Meeting">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={labelStyle}>Meeting Title</label><input style={inputStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Emergency Water Crisis Meeting" /></div>
          <div><label style={labelStyle}>Type</label><select style={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{["AGM","Committee","Emergency","Welfare"].map(t => <option key={t}>{t}</option>)}</select></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label style={labelStyle}>Date</label><input type="date" style={inputStyle} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            <div><label style={labelStyle}>Time</label><input type="time" style={inputStyle} value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></div>
          </div>
          <div><label style={labelStyle}>Venue</label><input style={inputStyle} value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} placeholder="e.g. Clubhouse or WhatsApp Call" /></div>
          <div><label style={labelStyle}>Agenda (one item per line)</label><textarea style={{ ...inputStyle, height: 90, resize: "vertical" }} value={form.agenda} onChange={e => setForm({ ...form, agenda: e.target.value })} placeholder="Budget approval&#10;CCTV vote&#10;Maintenance update" /></div>
          <button style={{ ...btnPrimary, justifyContent: "center" }} onClick={handleCreate}>Schedule & Notify All Residents</button>
        </div>
      </Modal>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: AMENITIES BOOKING
// ═══════════════════════════════════════════════════════════════════════════════
const Amenities = ({ data, setData }) => {
  const [selected, setSelected] = useState(null);
  const [bookingForm, setBookingForm] = useState({ flat: "", slot: "", purpose: "", date: "" });
  const [booked, setBooked] = useState({});

  const amenity = selected !== null ? data.amenities[selected] : null;

  const handleBook = () => {
    if (!bookingForm.flat || !bookingForm.slot || !bookingForm.date) return;
    setBooked(prev => ({ ...prev, [`${selected}-${bookingForm.slot}`]: true }));
    setData(prev => ({
      ...prev,
      amenities: prev.amenities.map((a, i) => i === selected ? { ...a, bookings: [...a.bookings, { flat: bookingForm.flat, slot: bookingForm.slot, date: bookingForm.date, purpose: bookingForm.purpose, status: "confirmed" }] } : a)
    }));
    setBookingForm({ flat: "", slot: "", purpose: "", date: "" });
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: "#e2e8f0", fontSize: 26, fontFamily: "'Playfair Display', serif", margin: "0 0 4px 0" }}>Amenity Booking</h2>
        <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Book clubhouse, gym, pool and more — conflicts auto-prevented</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 14, marginBottom: 24 }}>
        {data.amenities.map((a, i) => (
          <button key={a.id} onClick={() => setSelected(selected === i ? null : i)} style={{ background: selected === i ? "#1e2535" : "#161b27", border: `1.5px solid ${selected === i ? "#f59e0b" : "#2a2f45"}`, borderRadius: 14, padding: 18, cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{a.icon}</div>
            <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700 }}>{a.name}</div>
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>Capacity: {a.capacity}</div>
            <div style={{ color: "#4ade80", fontSize: 12, marginTop: 4 }}>{a.bookings.length} booking{a.bookings.length !== 1 ? "s" : ""} today</div>
          </button>
        ))}
      </div>

      {amenity && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, flexWrap: "wrap" }}>
          {/* Slots */}
          <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 14, padding: 20 }}>
            <h3 style={{ color: "#e2e8f0", fontSize: 15, margin: "0 0 16px 0", fontFamily: "'Playfair Display', serif" }}>{amenity.icon} {amenity.name} — Available Slots</h3>
            {amenity.slots.map(slot => {
              const booking = amenity.bookings.find(b => b.slot === slot);
              const isBooked = !!booking || booked[`${selected}-${slot}`];
              return (
                <div key={slot} onClick={() => !isBooked && setBookingForm(p => ({ ...p, slot }))} style={{ background: isBooked ? "#1e2535" : bookingForm.slot === slot ? "#2d2510" : "#0d1117", border: `1px solid ${isBooked ? "#2a2f45" : bookingForm.slot === slot ? "#f59e0b" : "#2a2f45"}`, borderRadius: 10, padding: "10px 14px", marginBottom: 8, cursor: isBooked ? "default" : "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: isBooked ? "#475569" : "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{slot}</span>
                  {isBooked ? <span style={{ color: "#f87171", fontSize: 12, fontWeight: 700 }}>Booked — Flat {booking?.flat || "?"}</span> : bookingForm.slot === slot ? <span style={{ color: "#f59e0b", fontSize: 12, fontWeight: 700 }}>Selected ✓</span> : <span style={{ color: "#4ade80", fontSize: 12 }}>Available</span>}
                </div>
              );
            })}

            {/* Rules */}
            <div style={{ background: "#0d1117", borderRadius: 10, padding: 12, marginTop: 12 }}>
              <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Rules</div>
              {amenity.rules.map((r, i) => <div key={i} style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>• {r}</div>)}
            </div>
          </div>

          {/* Booking Form */}
          <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 14, padding: 20 }}>
            <h3 style={{ color: "#e2e8f0", fontSize: 15, margin: "0 0 16px 0", fontFamily: "'Playfair Display', serif" }}>Book {amenity.name}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label style={labelStyle}>Your Flat</label><input style={inputStyle} value={bookingForm.flat} onChange={e => setBookingForm({ ...bookingForm, flat: e.target.value })} placeholder="e.g. 201" /></div>
              <div><label style={labelStyle}>Date</label><input type="date" style={inputStyle} value={bookingForm.date} onChange={e => setBookingForm({ ...bookingForm, date: e.target.value })} /></div>
              <div><label style={labelStyle}>Time Slot (tap from grid)</label><div style={{ background: "#0d1117", borderRadius: 8, padding: "10px 12px", color: bookingForm.slot ? "#f59e0b" : "#475569", fontSize: 13 }}>{bookingForm.slot || "← Select a slot from the left"}</div></div>
              <div><label style={labelStyle}>Purpose</label><input style={inputStyle} value={bookingForm.purpose} onChange={e => setBookingForm({ ...bookingForm, purpose: e.target.value })} placeholder="e.g. Birthday party" /></div>
              <button onClick={handleBook} style={{ ...btnPrimary, justifyContent: "center", opacity: bookingForm.flat && bookingForm.slot && bookingForm.date ? 1 : 0.5 }}>Confirm Booking</button>
            </div>

            {/* Today's bookings */}
            {amenity.bookings.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Today's Bookings</div>
                {amenity.bookings.map((b, i) => (
                  <div key={i} style={{ background: "#0d1117", borderRadius: 8, padding: "10px 12px", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                    <div><div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>Flat {b.flat}</div><div style={{ color: "#475569", fontSize: 11 }}>{b.purpose}</div></div>
                    <div style={{ textAlign: "right" }}><div style={{ color: "#f59e0b", fontSize: 12, fontWeight: 700 }}>{b.slot}</div><Badge status="scheduled" /></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: CAMPAIGNS & EVENTS
// ═══════════════════════════════════════════════════════════════════════════════
const Campaigns = ({ data, setData }) => {
  const [joined, setJoined] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", type: "Cleanliness", date: "", time: "", description: "", goal: "", points: 30 });

  const typeColors = { Cleanliness: "#4ade80", Cultural: "#f472b6", Health: "#38bdf8", Festive: "#fbbf24", Safety: "#f87171", Environment: "#34d399", Planning: "#818cf8" };
  const typeEmojis = { Cleanliness: "🧹", Cultural: "🎨", Health: "💊", Festive: "🪔", Safety: "🔒", Environment: "🌱", Planning: "📋" };

  const handleJoin = (id) => {
    setJoined(prev => ({ ...prev, [id]: !prev[id] }));
    setData(prev => ({ ...prev, campaigns: prev.campaigns.map(c => c.id === id ? { ...c, joined: c.joined + (joined[id] ? -1 : 1) } : c) }));
  };

  const handleCreate = () => {
    if (!form.title || !form.date) return;
    const n = { id: Date.now(), ...form, status: "upcoming", joined: 0, target: 20, volunteers: [], organiser: "Welfare Committee" };
    setData(prev => ({ ...prev, campaigns: [n, ...prev.campaigns] }));
    setShowForm(false);
    setForm({ title: "", type: "Cleanliness", date: "", time: "", description: "", goal: "", points: 30 });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ color: "#e2e8f0", fontSize: 26, fontFamily: "'Playfair Display', serif", margin: "0 0 4px 0" }}>Community Campaigns</h2>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Events, drives, competitions — build a real community, not just a building</p>
        </div>
        <button style={btnPrimary} onClick={() => setShowForm(true)}><Icon name="plus" size={15} />Create Campaign</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
        {data.campaigns.map(c => {
          const pct = Math.round((c.joined / c.target) * 100);
          const color = typeColors[c.type] || "#818cf8";
          const isJoined = joined[c.id];
          return (
            <div key={c.id} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ background: `linear-gradient(135deg, ${color}22, ${color}08)`, borderBottom: `1px solid ${color}33`, padding: 20 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                  <span style={{ fontSize: 28 }}>{typeEmojis[c.type] || "📣"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                      <span style={{ background: `${color}22`, color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{c.type}</span>
                      <Badge status={c.status === "upcoming" ? "scheduled" : c.status === "completed" ? "resolved" : "open"} />
                      <span style={{ background: "#1b1b2d", color: "#818cf8", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>⚡ +{c.points} pts</span>
                    </div>
                    <h3 style={{ color: "#e2e8f0", fontSize: 15, margin: 0, fontWeight: 700 }}>{c.title}</h3>
                  </div>
                </div>
                <div style={{ color: "#64748b", fontSize: 12 }}>📅 {c.date} at {c.time || "TBD"} · {c.organiser}</div>
              </div>
              <div style={{ padding: 18 }}>
                <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 14px 0", lineHeight: 1.5 }}>{c.description}</p>
                <div style={{ background: "#0d1117", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
                  <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Goal</div>
                  <div style={{ color: "#e2e8f0", fontSize: 13 }}>{c.goal}</div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: "#64748b", fontSize: 12 }}>Participants joined</span>
                    <span style={{ color, fontSize: 12, fontWeight: 700 }}>{c.joined}/{c.target}</span>
                  </div>
                  <div style={{ height: 6, background: "#0d1117", borderRadius: 3 }}>
                    <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: color, borderRadius: 3, transition: "width 0.5s" }} />
                  </div>
                </div>
                {c.volunteers.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Key Volunteers</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {c.volunteers.map((v, i) => <span key={i} style={{ background: "#0d1117", border: "1px solid #2a2f45", borderRadius: 20, padding: "3px 10px", color: "#94a3b8", fontSize: 11 }}>{v.split(" ")[0]}</span>)}
                    </div>
                  </div>
                )}
                {c.status !== "completed" && (
                  <button onClick={() => handleJoin(c.id)} style={{ width: "100%", background: isJoined ? "#1b2d1b" : `${color}22`, border: `1px solid ${isJoined ? "#4ade8044" : color + "44"}`, borderRadius: 10, padding: "10px 0", color: isJoined ? "#4ade80" : color, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                    {isJoined ? "✓ Joined! See you there" : "Join Campaign"}
                  </button>
                )}
                {c.status === "completed" && <div style={{ background: "#1b2d1b", border: "1px solid #4ade8033", borderRadius: 10, padding: "10px 14px", color: "#4ade80", fontSize: 13, fontWeight: 600, textAlign: "center" }}>✓ Completed — Thank you to all {c.joined} participants!</div>}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Create Campaign or Event">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={labelStyle}>Campaign Title</label><input style={inputStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Holi Celebration 2026" /></div>
          <div><label style={labelStyle}>Type</label><select style={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{Object.keys(typeColors).map(t => <option key={t}>{t}</option>)}</select></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label style={labelStyle}>Date</label><input type="date" style={inputStyle} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            <div><label style={labelStyle}>Time</label><input type="time" style={inputStyle} value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></div>
          </div>
          <div><label style={labelStyle}>Goal</label><input style={inputStyle} value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })} placeholder="e.g. Plant 30 trees" /></div>
          <div><label style={labelStyle}>Description</label><textarea style={{ ...inputStyle, height: 80, resize: "vertical" }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Tell residents why they should join…" /></div>
          <div><label style={labelStyle}>Volunteer Points Reward</label><input type="number" style={inputStyle} value={form.points} onChange={e => setForm({ ...form, points: parseInt(e.target.value) })} /></div>
          <button style={{ ...btnPrimary, justifyContent: "center" }} onClick={handleCreate}>Launch Campaign</button>
        </div>
      </Modal>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: VOLUNTEERS & HERO SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════
const Volunteers = ({ data, setData }) => {
  const [tab, setTab] = useState("leaderboard");
  const [selected, setSelected] = useState(null);
  const [appreciationForm, setAppreciationForm] = useState({ target: "", message: "" });
  const [submitted, setSubmitted] = useState({});
  const [showForm, setShowForm] = useState(false);

  const sorted = [...data.volunteers].sort((a, b) => b.heroPoints - a.heroPoints);
  const volunteer = selected !== null ? data.volunteers.find(v => v.id === selected) : null;

  const rankColors = ["#fbbf24", "#94a3b8", "#b45309", "#4ade80", "#4ade80"];
  const rankLabels = ["🥇", "🥈", "🥉", "4th", "5th"];

  const addAppreciation = () => {
    if (!appreciationForm.message || !appreciationForm.target) return;
    setData(prev => ({
      ...prev,
      volunteers: prev.volunteers.map(v => v.name === appreciationForm.target ? { ...v, appreciations: [`You: ${appreciationForm.message}`, ...v.appreciations], heroPoints: v.heroPoints + 20 } : v)
    }));
    setSubmitted(prev => ({ ...prev, [appreciationForm.target]: true }));
    setShowForm(false);
    setAppreciationForm({ target: "", message: "" });
  };

  const completeTask = (volunteerId, taskIdx) => {
    setData(prev => ({
      ...prev,
      volunteers: prev.volunteers.map(v => {
        if (v.id !== volunteerId) return v;
        const newTasks = v.assignedIssues.filter((_, i) => i !== taskIdx);
        return { ...v, assignedIssues: newTasks, completedTasks: v.completedTasks + 1, pendingTasks: Math.max(0, v.pendingTasks - 1), heroPoints: v.heroPoints + 25 };
      })
    }));
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ color: "#e2e8f0", fontSize: 26, fontFamily: "'Playfair Display', serif", margin: "0 0 4px 0" }}>Volunteer Heroes</h2>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Block volunteers, Hero Points, appreciation wall — recognize the unsung heroes</p>
        </div>
        <button style={btnPrimary} onClick={() => setShowForm(true)}><Icon name="harmony" size={15} />Give Appreciation</button>
      </div>

      {/* Hero banner */}
      <div style={{ background: "linear-gradient(135deg, #2d2510, #1a1506)", border: "1px solid #fbbf2433", borderRadius: 16, padding: 20, marginBottom: 24, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ color: "#fbbf24", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>🏆 Block Hero of March 2026</div>
          <div style={{ color: "#e2e8f0", fontSize: 22, fontWeight: 800 }}>{sorted[0]?.name}</div>
          <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>Flat {sorted[0]?.flat} · Block {sorted[0]?.block} · {sorted[0]?.heroPoints} Hero Points · {sorted[0]?.streak} week streak</div>
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            {sorted[0]?.badges.map((b, i) => <span key={i} style={{ background: "#fbbf2422", border: "1px solid #fbbf2433", borderRadius: 20, padding: "3px 10px", color: "#fbbf24", fontSize: 11, fontWeight: 700 }}>{b}</span>)}
          </div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "center" }}>
          <div style={{ fontSize: 48 }}>🏆</div>
          <div style={{ color: "#fbbf24", fontSize: 12, fontWeight: 700 }}>{sorted[0]?.completedTasks} tasks done</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, background: "#0d1117", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {["leaderboard", "tasks", "appreciation wall"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? "#1e2535" : "none", border: tab === t ? "1px solid #2a2f45" : "none", borderRadius: 8, padding: "8px 16px", color: tab === t ? "#e2e8f0" : "#64748b", cursor: "pointer", fontSize: 13, fontWeight: 600, textTransform: "capitalize", whiteSpace: "nowrap" }}>{t}</button>
        ))}
      </div>

      {tab === "leaderboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sorted.map((v, i) => (
            <div key={v.id} onClick={() => setSelected(selected === v.id ? null : v.id)} style={{ background: "#161b27", border: `1px solid ${i === 0 ? "#fbbf2444" : "#2a2f45"}`, borderRadius: 14, padding: 18, cursor: "pointer", transition: "all 0.2s" }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ fontSize: 22, flexShrink: 0, width: 32, textAlign: "center" }}>{rankLabels[i]}</div>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${rankColors[i]}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: rankColors[i], flexShrink: 0 }}>{v.avatar}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700 }}>{v.name}</div>
                      <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>Flat {v.flat} · Block {v.block} · {v.streak} week streak 🔥</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: rankColors[i], fontSize: 22, fontWeight: 900 }}>{v.heroPoints}</div>
                      <div style={{ color: "#475569", fontSize: 10 }}>Hero Points</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    {[{ l: "Done", v: v.completedTasks, c: "#4ade80" }, { l: "Pending", v: v.pendingTasks, c: "#fbbf24" }, { l: "Appreciations", v: v.appreciations.length, c: "#f472b6" }].map((x, j) => (
                      <div key={j} style={{ background: "#0d1117", borderRadius: 6, padding: "4px 10px" }}>
                        <span style={{ color: "#475569", fontSize: 11 }}>{x.l}: </span><span style={{ color: x.c, fontSize: 11, fontWeight: 700 }}>{x.v}</span>
                      </div>
                    ))}
                    {v.badges.slice(0, 2).map((b, j) => <span key={j} style={{ background: "#2d2510", border: "1px solid #fbbf2433", borderRadius: 20, padding: "3px 10px", color: "#fbbf24", fontSize: 10, fontWeight: 700 }}>{b}</span>)}
                  </div>
                </div>
              </div>
              {/* Expanded tasks */}
              {selected === v.id && v.assignedIssues.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #2a2f45" }}>
                  <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Active Assignments</div>
                  {v.assignedIssues.map((issue, j) => (
                    <div key={j} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0d1117", borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fbbf24", flexShrink: 0 }} />
                        <span style={{ color: "#cbd5e1", fontSize: 13 }}>{issue}</span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); completeTask(v.id, j); }} style={{ background: "#1b2d1b", border: "1px solid #4ade8033", borderRadius: 6, padding: "4px 12px", color: "#4ade80", cursor: "pointer", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                        <Icon name="check" size={12} />Done +25pts
                      </button>
                    </div>
                  ))}
                  {v.assignedIssues.length === 0 && <div style={{ color: "#4ade80", fontSize: 13 }}>✓ All tasks completed!</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "tasks" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
          {data.volunteers.map(v => (
            <div key={v.id} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 14, padding: 18 }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "#fbbf2422", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fbbf24", flexShrink: 0 }}>{v.avatar}</div>
                <div>
                  <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700 }}>{v.name}</div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>Block {v.block} · {v.heroPoints} pts</div>
                </div>
              </div>
              {v.assignedIssues.length > 0 ? v.assignedIssues.map((issue, j) => (
                <div key={j} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0d1117", borderRadius: 8, padding: "8px 12px", marginBottom: 6 }}>
                  <span style={{ color: "#94a3b8", fontSize: 12, flex: 1 }}>{issue}</span>
                  <button onClick={() => completeTask(v.id, j)} style={{ background: "#1b2d1b", border: "none", borderRadius: 6, padding: "4px 8px", color: "#4ade80", cursor: "pointer", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>✓</button>
                </div>
              )) : (
                <div style={{ background: "#1b2d1b", border: "1px solid #4ade8033", borderRadius: 8, padding: "10px 12px", color: "#4ade80", fontSize: 13, textAlign: "center" }}>🎉 All clear! Zero pending tasks</div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "appreciation wall" && (
        <div>
          <div style={{ background: "linear-gradient(135deg, #1b1b2d, #161b27)", border: "1px solid #818cf833", borderRadius: 14, padding: 20, marginBottom: 20, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>❤️</div>
            <div style={{ color: "#e2e8f0", fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>Appreciation Wall</div>
            <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>Recognising the volunteers who make Sunrise Residency better every day</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {data.volunteers.map(v => (
              <div key={v.id} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 14, padding: 20 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fbbf2422", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fbbf24" }}>{v.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 700 }}>{v.name}</div>
                    <div style={{ color: "#64748b", fontSize: 12 }}>Flat {v.flat} · Block {v.block}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "#fbbf24", fontSize: 20, fontWeight: 900 }}>{v.heroPoints}</div>
                    <div style={{ color: "#475569", fontSize: 10 }}>Hero Points</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                  {v.badges.map((b, i) => <span key={i} style={{ background: "#2d2510", border: "1px solid #fbbf2433", borderRadius: 20, padding: "3px 10px", color: "#fbbf24", fontSize: 11, fontWeight: 700 }}>{b}</span>)}
                </div>
                {v.appreciations.map((a, i) => (
                  <div key={i} style={{ background: "#0d1117", borderRadius: 10, padding: "10px 14px", marginBottom: 8, borderLeft: "3px solid #f472b6" }}>
                    <div style={{ color: "#f9a8d4", fontSize: 13, lineHeight: 1.5, fontStyle: "italic" }}>"{a}"</div>
                  </div>
                ))}
                {submitted[v.name] && (
                  <div style={{ background: "#1b2d1b", border: "1px solid #4ade8033", borderRadius: 8, padding: "8px 14px", color: "#4ade80", fontSize: 12, marginTop: 8 }}>✓ Your appreciation sent! +20 pts added to their score</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Give Appreciation Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="❤️ Give Appreciation">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#0d1117", borderRadius: 10, padding: 12, color: "#818cf8", fontSize: 13 }}>💡 Sending an appreciation adds +20 Hero Points to the volunteer's score automatically.</div>
          <div><label style={labelStyle}>Volunteer</label>
            <select style={inputStyle} value={appreciationForm.target} onChange={e => setAppreciationForm({ ...appreciationForm, target: e.target.value })}>
              <option value="">Select a volunteer</option>
              {data.volunteers.map(v => <option key={v.id} value={v.name}>{v.name} — Flat {v.flat}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Your Message</label><textarea style={{ ...inputStyle, height: 90, resize: "vertical" }} value={appreciationForm.message} onChange={e => setAppreciationForm({ ...appreciationForm, message: e.target.value })} placeholder="e.g. Thank you for fixing the lift issue so quickly! You saved our day." /></div>
          <button style={{ ...btnPrimary, justifyContent: "center" }} onClick={addAppreciation}>Send Appreciation ❤️</button>
        </div>
      </Modal>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: SUPER ADMIN
// ═══════════════════════════════════════════════════════════════════════════════
const SuperAdmin = ({ data, setData }) => {
  const [tab, setTab] = useState("overview");
  const [showAddResident, setShowAddResident] = useState(false);
  const [showAddFlat, setShowAddFlat] = useState(false);
  const [activeModel, setActiveModel] = useState(data.admin.maintenanceModels.findIndex(m => m.active));
  const [residentForm, setResidentForm] = useState({ name: "", flat: "", phone: "", type: "owner", block: "A" });
  const [flatForm, setFlatForm] = useState({ number: "", block: "A", floor: "1", sqft: "", type: "2BHK", owner: "" });

  const roleColors = { "Super Admin": "#f87171", President: "#f59e0b", Secretary: "#818cf8", Treasurer: "#4ade80", "Committee Member": "#38bdf8", Resident: "#64748b", Tenant: "#475569" };

  const setMaintenanceModel = (idx) => {
    setActiveModel(idx);
    setData(prev => ({ ...prev, admin: { ...prev.admin, maintenanceModels: prev.admin.maintenanceModels.map((m, i) => ({ ...m, active: i === idx })) } }));
  };

  const addResident = () => {
    if (!residentForm.name || !residentForm.flat) return;
    const newR = { flat: residentForm.flat, name: residentForm.name, phone: residentForm.phone, email: "", type: residentForm.type, since: new Date().toISOString().slice(0, 10), members: 1, vehicle: "", avatar: residentForm.name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase(), paidMonths: 0, defaultMonths: 0, complaintsAgainst: 0, complaintsRaised: 0, pollsVoted: 0, pollsTotal: 0 };
    setData(prev => ({ ...prev, residents: [...prev.residents, newR] }));
    setShowAddResident(false);
    setResidentForm({ name: "", flat: "", phone: "", type: "owner", block: "A" });
  };

  const tabs = ["overview", "society", "residents", "roles", "maintenance", "settings"];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ color: "#e2e8f0", fontSize: 24, fontFamily: "'Playfair Display', serif", margin: "0 0 4px 0" }}>Super Admin</h2>
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Society setup, residents, roles, permissions, maintenance models</p>
        </div>
        <div style={{ background: "#2d1b1b", border: "1px solid #f8717133", borderRadius: 20, padding: "4px 14px", display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f87171" }} />
          <span style={{ color: "#f87171", fontSize: 12, fontWeight: 700 }}>Super Admin Mode</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20, background: "#0d1117", borderRadius: 10, padding: 4, overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? "#1e2535" : "none", border: tab === t ? "1px solid #2a2f45" : "none", borderRadius: 8, padding: "7px 14px", color: tab === t ? "#e2e8f0" : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: 600, textTransform: "capitalize", whiteSpace: "nowrap" }}>{t}</button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          {[
            { label: "Societies", val: data.admin.societies.length, color: "#f59e0b", icon: "🏢" },
            { label: "Total Blocks", val: data.admin.blocks.length, color: "#38bdf8", icon: "🏗️" },
            { label: "Total Flats", val: data.admin.flats.length, color: "#818cf8", icon: "🏠" },
            { label: "Residents", val: data.residents.length, color: "#4ade80", icon: "👥" },
            { label: "Committee Size", val: data.committee.members.length, color: "#fbbf24", icon: "🏛️" },
            { label: "Active Roles", val: data.admin.roles.length, color: "#f472b6", icon: "🎭" },
          ].map((s, i) => (
            <div key={i} style={{ background: "#161b27", border: `1px solid ${s.color}22`, borderLeft: `3px solid ${s.color}`, borderRadius: 12, padding: 16, cursor: "pointer" }} onClick={() => setTab(["overview","society","society","residents","overview","roles"][i])}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ color: s.color, fontSize: 24, fontWeight: 800 }}>{s.val}</div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* SOCIETY SETUP */}
      {tab === "society" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Society card */}
          {data.admin.societies.map(s => (
            <div key={s.id} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 14, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                <div>
                  <div style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 700 }}>{s.name}</div>
                  <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>{s.city} · ID: {s.id} · Since: {s.since}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ background: "#1b2d1b", color: "#4ade80", borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700 }}>● {s.status}</span>
                  <span style={{ background: "#2d2510", color: "#fbbf24", borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700 }}>{s.plan}</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[{ l: "Blocks", v: s.blocks }, { l: "Flats", v: s.flats }, { l: "Residents", v: s.residents }].map((x,i) => (
                  <div key={i} style={{ background: "#0d1117", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ color: "#e2e8f0", fontSize: 18, fontWeight: 800 }}>{x.v}</div>
                    <div style={{ color: "#475569", fontSize: 11 }}>{x.l}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Blocks */}
          <h3 style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", margin: "8px 0 0" }}>Blocks & Flats</h3>
          {data.admin.blocks.map(b => (
            <div key={b.id} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700 }}>Block {b.name.replace("Block ", "")}</div>
                <span style={{ color: "#64748b", fontSize: 12 }}>{b.totalFlats} flats · {b.floors} floors</span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {data.admin.flats.filter(f => f.block === b.name.replace("Block ", "")).map(f => (
                  <div key={f.number} style={{ background: f.status === "occupied" ? "#1b2d1b" : f.status === "tenant" ? "#2d2510" : "#1e2535", border: `1px solid ${f.status === "occupied" ? "#4ade8033" : f.status === "tenant" ? "#fbbf2433" : "#2a2f45"}`, borderRadius: 8, padding: "6px 12px", textAlign: "center" }}>
                    <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 700 }}>Flat {f.number}</div>
                    <div style={{ color: "#475569", fontSize: 10 }}>{f.type} · {f.sqft}sqft</div>
                    <div style={{ color: f.status === "occupied" ? "#4ade80" : "#fbbf24", fontSize: 9, fontWeight: 700, marginTop: 2 }}>{f.status}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RESIDENTS MANAGEMENT */}
      {tab === "residents" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ color: "#64748b", fontSize: 13 }}>{data.residents.length} residents · {data.residents.filter(r=>r.type==="owner").length} owners · {data.residents.filter(r=>r.type==="tenant").length} tenants</div>
            <button style={btnPrimary} onClick={() => setShowAddResident(true)}><Icon name="plus" size={14} />Add Resident</button>
          </div>
          <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 80px 80px 100px", padding: "10px 16px", background: "#0d1117", borderBottom: "1px solid #2a2f45" }}>
              {["Flat", "Name", "Type", "Block", "Role"].map(h => <span key={h} style={{ color: "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{h}</span>)}
            </div>
            {data.residents.map((r, i) => {
              const committeeRole = data.committee.members.find(m => m.flat === r.flat);
              return (
                <div key={r.flat} style={{ display: "grid", gridTemplateColumns: "80px 1fr 80px 80px 100px", padding: "12px 16px", borderBottom: i < data.residents.length - 1 ? "1px solid #1e2535" : "none", alignItems: "center" }}>
                  <span style={{ color: "#fbbf24", fontWeight: 700, fontSize: 13 }}>{r.flat}</span>
                  <div>
                    <div style={{ color: "#e2e8f0", fontSize: 13 }}>{r.name}</div>
                    <div style={{ color: "#475569", fontSize: 11 }}>{r.phone}</div>
                  </div>
                  <span style={{ color: r.type === "owner" ? "#4ade80" : "#fbbf24", fontSize: 11, fontWeight: 600, textTransform: "capitalize" }}>{r.type}</span>
                  <span style={{ color: "#64748b", fontSize: 12 }}>Block {data.admin.flats.find(f=>f.number===r.flat)?.block || "?"}</span>
                  <span style={{ color: committeeRole ? roleColors[committeeRole.role] || "#64748b" : "#475569", fontSize: 11, fontWeight: committeeRole ? 700 : 400 }}>{committeeRole ? committeeRole.role : "Resident"}</span>
                </div>
              );
            })}
          </div>

          <Modal open={showAddResident} onClose={() => setShowAddResident(false)} title="Add New Resident">
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              <div><label style={labelStyle}>Full Name</label><input style={inputStyle} value={residentForm.name} onChange={e => setResidentForm({...residentForm, name: e.target.value})} placeholder="e.g. Arun Kumar" /></div>
              <div><label style={labelStyle}>Flat Number</label><input style={inputStyle} value={residentForm.flat} onChange={e => setResidentForm({...residentForm, flat: e.target.value})} placeholder="e.g. 401" /></div>
              <div><label style={labelStyle}>Phone</label><input style={inputStyle} value={residentForm.phone} onChange={e => setResidentForm({...residentForm, phone: e.target.value})} placeholder="9XXXXXXXXX" /></div>
              <div><label style={labelStyle}>Type</label>
                <select style={inputStyle} value={residentForm.type} onChange={e => setResidentForm({...residentForm, type: e.target.value})}>
                  <option value="owner">Owner</option><option value="tenant">Tenant</option>
                </select>
              </div>
              <div><label style={labelStyle}>Block</label>
                <select style={inputStyle} value={residentForm.block} onChange={e => setResidentForm({...residentForm, block: e.target.value})}>
                  {data.admin.blocks.map(b => <option key={b.id} value={b.name.replace("Block ","")}>{b.name}</option>)}
                </select>
              </div>
              <button style={{ ...btnPrimary, justifyContent: "center" }} onClick={addResident}>Add Resident</button>
            </div>
          </Modal>
        </div>
      )}

      {/* ROLES & PERMISSIONS */}
      {tab === "roles" && (
        <div>
          <div style={{ background: "#1b1b2d", border: "1px solid #818cf833", borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 13, color: "#818cf8" }}>
            💡 Roles define what each person can see and do. Assign roles to residents via the Residents tab. Committee roles auto-sync from Committee section.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {data.admin.roles.map((role, i) => (
              <div key={i} style={{ background: "#161b27", border: `1px solid ${roleColors[role.name] || "#2a2f45"}22`, borderLeft: `3px solid ${roleColors[role.name] || "#64748b"}`, borderRadius: 12, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                  <div>
                    <div style={{ color: roleColors[role.name] || "#e2e8f0", fontSize: 15, fontWeight: 700 }}>{role.name}</div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{role.description}</div>
                  </div>
                  <div style={{ color: "#475569", fontSize: 12 }}>{data.residents.filter(r => { const cm = data.committee.members.find(m => m.flat === r.flat); return cm ? cm.role === role.name : role.name === "Resident"; }).length} assigned</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(role.permissions[0] === "all" ? ["view_all","approve_expenses","manage_committee","post_notices","manage_complaints","assign_roles","delete_records"] : role.permissions).map((p, j) => (
                    <span key={j} style={{ background: "#0d1117", border: "1px solid #2a2f45", borderRadius: 20, padding: "3px 10px", color: "#94a3b8", fontSize: 10, fontWeight: 600 }}>{p.replace(/_/g, " ")}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAINTENANCE MODELS */}
      {tab === "maintenance" && (
        <div>
          <div style={{ background: "#1b2d1b", border: "1px solid #4ade8033", borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <div style={{ color: "#4ade80", fontSize: 13, fontWeight: 600 }}>Currently active: <strong>{data.admin.maintenanceModels.find(m=>m.active)?.name || "Flat Rate"}</strong></div>
            <div style={{ color: "#16a34a", fontSize: 12, marginTop: 3 }}>Changing the model recalculates all dues. Takes effect from next billing cycle.</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {data.admin.maintenanceModels.map((model, i) => (
              <div key={i} onClick={() => setMaintenanceModel(i)}
                style={{ background: model.active ? "#1b2d1b" : "#161b27", border: `2px solid ${model.active ? "#4ade80" : "#2a2f45"}`, borderRadius: 14, padding: 20, cursor: "pointer", transition: "all 0.2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${model.active ? "#4ade80" : "#2a2f45"}`, background: model.active ? "#4ade80" : "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {model.active && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#0d1117" }} />}
                    </div>
                    <div>
                      <div style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 700 }}>{model.name}</div>
                      <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{model.description}</div>
                    </div>
                  </div>
                  {model.active && <span style={{ background: "#1b2d1b", color: "#4ade80", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>Active</span>}
                </div>
                {model.amount && (
                  <div style={{ background: "#0d1117", borderRadius: 8, padding: "10px 14px", display: "inline-flex", gap: 8, alignItems: "baseline" }}>
                    <span style={{ color: "#fbbf24", fontSize: 20, fontWeight: 800 }}>₹{model.amount}</span>
                    <span style={{ color: "#475569", fontSize: 12 }}>{model.unit}</span>
                  </div>
                )}
                {model.tiers && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {Object.entries(model.tiers).map(([type, amt]) => (
                      <div key={type} style={{ background: "#0d1117", borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
                        <div style={{ color: "#fbbf24", fontSize: 16, fontWeight: 800 }}>₹{amt}</div>
                        <div style={{ color: "#475569", fontSize: 11 }}>{type}</div>
                      </div>
                    ))}
                  </div>
                )}
                {model.name === "Per Sq Ft" && (
                  <div style={{ marginTop: 10, background: "#0d1117", borderRadius: 8, padding: 12 }}>
                    <div style={{ color: "#64748b", fontSize: 12, marginBottom: 6 }}>Sample calculations:</div>
                    {data.admin.flats.slice(0,3).map(f => (
                      <div key={f.number} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: "#94a3b8" }}>Flat {f.number} ({f.sqft} sqft)</span>
                        <span style={{ color: "#fbbf24", fontWeight: 700 }}>₹{(f.sqft * model.amount).toLocaleString("en-IN")}/month</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SETTINGS */}
      {tab === "settings" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { label: "Society Name", val: "Sunrise Residency", editable: true },
            { label: "City", val: "Hyderabad, Telangana", editable: true },
            { label: "Total Flats", val: "10", editable: false },
            { label: "Monthly Due Date", val: "1st of every month", editable: true },
            { label: "Late Fee", val: "₹100 after 7 days", editable: true },
            { label: "WhatsApp Number", val: "+91 98765 43210", editable: true },
            { label: "Society Registration No.", val: "AP/RWA/2019/4521", editable: true },
            { label: "Bank Account", val: "HDFC xxxx-xxxx-1234", editable: true },
          ].map((s, i) => (
            <div key={i} style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
                <div style={{ color: "#e2e8f0", fontSize: 14, marginTop: 3 }}>{s.val}</div>
              </div>
              {s.editable && <button style={{ background: "#1e2535", border: "1px solid #2a2f45", borderRadius: 7, padding: "5px 12px", color: "#94a3b8", cursor: "pointer", fontSize: 12 }}>Edit</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function SocietyOS() {
  const [data, setData] = useState(INITIAL_DATA);
  const [tab, setTab] = useState("dashboard");
  const [showMore, setShowMore] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const navItems = [
    { id: "dashboard",   label: "Dashboard",    icon: "dashboard"  },
    { id: "conflicts",   label: "Conflicts",    icon: "conflict"   },
    { id: "maintenance", label: "Maintenance",  icon: "maintenance"},
    { id: "finances",    label: "Finances",     icon: "finance"    },
    { id: "voting",      label: "Polls",        icon: "vote"       },
    { id: "notices",     label: "Notices",      icon: "notice"     },
    { id: "residents",   label: "Residents",    icon: "residents"  },
    { id: "committee",   label: "Committee",    icon: "committee"  },
    { id: "staff",       label: "Gate & Staff", icon: "staff"      },
    { id: "meetings",    label: "Meetings",     icon: "calendar"   },
    { id: "amenities",   label: "Amenities",    icon: "amenity"    },
    { id: "campaigns",   label: "Campaigns",    icon: "campaign"   },
    { id: "volunteers",  label: "Volunteers",   icon: "volunteer"  },
    { id: "whatsapp",    label: "WhatsApp",     icon: "whatsapp"   },
    { id: "ai",          label: "AI Assistant", icon: "ai"         },
    { id: "admin",       label: "Super Admin",  icon: "shield"     },
  ];

  const alerts = data.complaints.filter(c => c.status === "open").length + data.maintenance.filter(m => m.status === "open").length;

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#e2e8f0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0d1117; }
        ::-webkit-scrollbar-thumb { background: #2a2f45; border-radius: 3px; }
        input, select, textarea { color-scheme: dark; }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      {/* Top Bar */}
      <div style={{ background: "#0a0d13", borderBottom: "1px solid #1e2535", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, #d97706, #f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="peace" size={16} />
          </div>
          <div>
            <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 800, fontFamily: "'Playfair Display', serif" }}>SocietyOS</div>
            <div style={{ color: "#475569", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px" }}>Sunrise Residency</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {alerts > 0 && !isMobile && (
            <div style={{ background: "#2d1b1b", border: "1px solid #f8717133", borderRadius: 20, padding: "3px 10px", display: "flex", gap: 5, alignItems: "center" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#f87171" }} />
              <span style={{ color: "#f87171", fontSize: 11, fontWeight: 600 }}>{alerts} issues</span>
            </div>
          )}
          {alerts > 0 && isMobile && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f87171" }} />}
          <div onClick={() => setTab("admin")} style={{ display: "flex", gap: 8, alignItems: "center", background: "#1e2535", border: "1px solid #2a2f45", borderRadius: 20, padding: "4px 10px 4px 5px", cursor: "pointer" }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#4ade8022", border: "1px solid #4ade8044", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#4ade80" }}>
              {data.currentUser.avatar}
            </div>
            {!isMobile && (
              <div>
                <div style={{ color: "#e2e8f0", fontSize: 11, fontWeight: 700, lineHeight: 1 }}>{data.currentUser.name.split(" ")[0]}</div>
                <div style={{ color: "#4ade80", fontSize: 9, fontWeight: 600 }}>{data.currentUser.primaryRole}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "flex" }}>
        {/* Sidebar — desktop only */}
        {!isMobile && (
          <div style={{ width: 220, background: "#0a0d13", borderRight: "1px solid #1e2535", minHeight: "calc(100vh - 56px)", padding: "20px 12px", position: "sticky", top: 56, height: "calc(100vh - 56px)", overflowY: "auto", flexShrink: 0 }}>
            {navItems.map(item => {
              const isActive = tab === item.id;
              const badge = item.id === "conflicts"  ? data.complaints.filter(c => c.status === "open").length
                : item.id === "maintenance" ? data.maintenance.filter(m => m.status === "open").length
                : item.id === "residents"   ? data.residents.filter(r => calcHarmony(r) < 55).length
                : item.id === "whatsapp"    ? data.whatsapp.sentLog.length
                : item.id === "staff"       ? data.deliveries.filter(d => d.status === "at-gate").length
                : item.id === "meetings"    ? data.meetings.filter(m => m.status === "upcoming").length
                : item.id === "volunteers"  ? data.volunteers.filter(v => v.pendingTasks > 0).length
                : item.id === "campaigns"   ? data.campaigns.filter(c => c.status === "upcoming").length
                : 0;
              return (
                <button key={item.id} onClick={() => setTab(item.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "none", background: isActive ? "#1e2535" : "none", color: isActive ? "#f59e0b" : "#64748b", cursor: "pointer", fontSize: 13, fontWeight: isActive ? 700 : 500, marginBottom: 4, textAlign: "left", transition: "all 0.15s" }}>
                  <span style={{ opacity: isActive ? 1 : 0.7 }}><Icon name={item.icon} size={17} /></span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {badge > 0 && <span style={{ background: item.id === "residents" ? "#fb923c" : item.id === "whatsapp" ? "#25d366" : "#f87171", color: "#0d0f14", borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>{badge}</span>}
                  {item.id === "ai" && <span style={{ background: "#312e81", color: "#818cf8", borderRadius: 10, padding: "1px 7px", fontSize: 9, fontWeight: 800 }}>AI</span>}
                </button>
              );
            })}
            <div style={{ marginTop: 24, padding: "16px 12px", background: "#161b27", borderRadius: 10, border: "1px solid #2a2f45" }}>
              <div style={{ color: "#64748b", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>Society Health</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                <div style={{ flex: 1, height: 6, background: "#0d1117", borderRadius: 3 }}>
                  <div style={{ width: "68%", height: "100%", background: "linear-gradient(90deg, #f59e0b, #4ade80)", borderRadius: 3 }} />
                </div>
                <span style={{ color: "#4ade80", fontSize: 11, fontWeight: 700 }}>68</span>
              </div>
              <div style={{ color: "#475569", fontSize: 11 }}>Moderate health</div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div style={{ flex: 1, padding: isMobile ? "16px 14px 110px" : "24px 28px", overflowX: "hidden", maxWidth: isMobile ? "100vw" : "calc(100vw - 220px)", width: "100%" }}>
          {tab === "dashboard"   && <Dashboard data={data} onNavigate={setTab} />}
          {tab === "conflicts"   && <ComplaintsReal />}
          {tab === "maintenance" && <Maintenance data={data} setData={setData} />}
          {tab === "finances"    && <FinancesReal />}
          {tab === "voting"      && <PollsReal />}
          {tab === "notices"     && <NoticesReal />}
          {tab === "residents"   && <ResidentsReal />}
          {tab === "committee"   && <Committee data={data} setData={setData} />}
          {tab === "staff"       && <GateReal />}
          {tab === "meetings"    && <MeetingsReal />}
          {tab === "amenities"   && <AmenitiesReal />}
          {tab === "campaigns"   && <Campaigns data={data} setData={setData} />}
          {tab === "volunteers"  && <Volunteers data={data} setData={setData} />}
          {tab === "whatsapp"    && <WhatsAppCenter data={data} setData={setData} />}
          {tab === "ai"          && <AIAssistant data={data} />}
          {tab === "admin"       && <SuperAdmin data={data} setData={setData} />}
        </div>
      </div>

      {/* Mobile Bottom Navigation — 5 tabs + More drawer */}
      {isMobile && (
        <>
          {/* More drawer backdrop */}
          {showMore && (
            <div onClick={() => setShowMore(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 299, backdropFilter: "blur(2px)" }} />
          )}

          {/* More drawer */}
          {showMore && (
            <div style={{ position: "fixed", bottom: 70, left: 12, right: 12, background: "#161b27", border: "1px solid #2a2f45", borderRadius: 20, zIndex: 300, padding: 16, animation: "slideUp 0.2s ease" }}>
              <div style={{ color: "#475569", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12, paddingLeft: 4 }}>All Sections</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { id: "residents",   label: "Residents",  icon: "residents",   color: "#818cf8" },
                  { id: "committee",   label: "Committee",  icon: "committee",   color: "#f59e0b" },
                  { id: "meetings",    label: "Meetings",   icon: "calendar",    color: "#38bdf8" },
                  { id: "amenities",   label: "Amenities",  icon: "amenity",     color: "#4ade80" },
                  { id: "campaigns",   label: "Events",     icon: "campaign",    color: "#f472b6" },
                  { id: "maintenance", label: "Maintenance",icon: "maintenance", color: "#fb923c" },
                  { id: "volunteers",  label: "Volunteers", icon: "volunteer",   color: "#fbbf24" },
                  { id: "whatsapp",    label: "WhatsApp",   icon: "whatsapp",    color: "#25d366" },
                  { id: "ai",          label: "AI",         icon: "ai",          color: "#818cf8" },
                ].map(item => (
                  <button key={item.id} onClick={() => { setTab(item.id); setShowMore(false); }}
                    style={{ background: tab === item.id ? `${item.color}18` : "#0d1117", border: `1px solid ${tab === item.id ? item.color + "44" : "#2a2f45"}`, borderRadius: 12, padding: "14px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <span style={{ color: tab === item.id ? item.color : "#64748b" }}><Icon name={item.icon} size={22} /></span>
                    <span style={{ color: tab === item.id ? item.color : "#64748b", fontSize: 10, fontWeight: tab === item.id ? 700 : 500, textAlign: "center" }}>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Tab Bar */}
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#0a0d13", borderTop: "1px solid #1e2535", zIndex: 200, display: "flex", alignItems: "center", height: 66, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
            {[
              { id: "dashboard",  label: "Home",    icon: "dashboard" },
              { id: "conflicts",  label: "Issues",  icon: "conflict"  },
              { id: "finances",   label: "Finance", icon: "finance"   },
              { id: "notices",    label: "Notices", icon: "notice"    },
              { id: "staff",      label: "Gate",    icon: "staff"     },
            ].map(item => {
              const isActive = tab === item.id && !showMore;
              const badge = item.id === "conflicts" ? data.complaints.filter(c => c.status === "open").length : item.id === "staff" ? data.deliveries.filter(d => d.status === "at-gate").length : 0;
              return (
                <button key={item.id} onClick={() => { setTab(item.id); setShowMore(false); }}
                  style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 0", border: "none", background: "none", cursor: "pointer", position: "relative" }}>
                  {badge > 0 && <div style={{ position: "absolute", top: 4, right: "50%", marginRight: -16, width: 16, height: 16, borderRadius: "50%", background: "#f87171", color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{badge}</div>}
                  <span style={{ color: isActive ? "#f59e0b" : "#475569" }}><Icon name={item.icon} size={22} /></span>
                  <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400, color: isActive ? "#f59e0b" : "#475569" }}>{item.label}</span>
                  {isActive && <div style={{ position: "absolute", bottom: 0, width: 20, height: 2, borderRadius: 1, background: "#f59e0b" }} />}
                </button>
              );
            })}
            {/* More button */}
            <button onClick={() => setShowMore(p => !p)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 0", border: "none", background: "none", cursor: "pointer", position: "relative" }}>
              <span style={{ color: showMore ? "#f59e0b" : "#475569", fontSize: 22, lineHeight: 1 }}>⋯</span>
              <span style={{ fontSize: 10, fontWeight: showMore ? 700 : 400, color: showMore ? "#f59e0b" : "#475569" }}>More</span>
              {showMore && <div style={{ position: "absolute", bottom: 0, width: 20, height: 2, borderRadius: 1, background: "#f59e0b" }} />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

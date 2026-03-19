// supabase/functions/whatsapp-bot/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERIFY_TOKEN = Deno.env.get("WA_VERIFY_TOKEN") ?? "societyos_verify_2026";
const WA_TOKEN     = Deno.env.get("WA_ACCESS_TOKEN") ?? "";
const WA_PHONE_ID  = Deno.env.get("WA_PHONE_NUMBER_ID") ?? "";
const GEMINI_KEY   = Deno.env.get("GEMINI_API_KEY") ?? "";
const SOCIETY_ID   = Deno.env.get("SOCIETY_ID") ?? "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const sessions: Record<string, { state: string; data: Record<string, string> }> = {};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

async function send(to: string, text: string) {
  await fetch(`https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }),
  });
}

async function sendMenu(to: string, header: string, body: string, items: { id: string; title: string; desc?: string }[]) {
  const rows = items.slice(0, 10).map(i => ({ id: i.id, title: i.title.slice(0, 24), description: (i.desc || "").slice(0, 72) }));
  await fetch(`https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp", to, type: "interactive",
      interactive: {
        type: "list",
        header: { type: "text", text: header },
        body: { text: body },
        action: { button: "View Options", sections: [{ title: "Options", rows }] },
      },
    }),
  });
}

async function askAI(prompt: string): Promise<string> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 300 } }) }
    );
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Unable to respond right now.";
  } catch { return "AI unavailable. Please try again."; }
}

async function getResident(phone: string) {
  const cleaned = phone.replace(/\D/g, "").slice(-10);
  const { data } = await supabase.from("residents")
    .select("*, committee_members(role)")
    .eq("society_id", SOCIETY_ID).eq("phone", cleaned).eq("status", "active").single();
  return data;
}

function getRole(r: Record<string, unknown>): string {
  if (r.is_super_admin) return "super_admin";
  const cr = (r.committee_members as {role:string}[])?.[0]?.role;
  if (cr === "President") return "president";
  if (cr === "Secretary") return "secretary";
  if (cr === "Treasurer") return "treasurer";
  if (cr) return "committee";
  if (r.type === "tenant") return "tenant";
  return "resident";
}

async function showMainMenu(to: string, resident: Record<string, unknown>, role: string) {
  const name = (resident.name as string).split(" ")[0];
  const flat = resident.flat_number as string;

  const menus: Record<string, { header: string; body: string; items: { id: string; title: string; desc?: string }[] }> = {
    resident: {
      header: `🏠 Hi ${name}!`,
      body: `Flat ${flat} · What would you like to do?`,
      items: [
        { id: "my_dues",       title: "💰 My Dues",         desc: "View and pay maintenance dues" },
        { id: "raise_issue",   title: "⚠️ Raise Complaint", desc: "Report an issue to committee" },
        { id: "my_complaints", title: "📋 My Complaints",   desc: "Track your complaints" },
        { id: "notices",       title: "📢 Notices",         desc: "Latest society notices" },
        { id: "book_amenity",  title: "🏊 Book Amenity",    desc: "Pool, gym, clubhouse" },
        { id: "visitor_pass",  title: "👤 Visitor Pass",    desc: "Pre-approve a visitor" },
        { id: "ask_ai",        title: "✨ Ask AI",          desc: "Society rules & advice" },
      ],
    },
    tenant: {
      header: `🏠 Hi ${name}!`,
      body: `Flat ${flat} (Tenant)`,
      items: [
        { id: "my_dues",       title: "💰 My Dues",         desc: "View dues" },
        { id: "raise_issue",   title: "⚠️ Raise Complaint", desc: "Report an issue" },
        { id: "my_complaints", title: "📋 My Complaints",   desc: "Track complaints" },
        { id: "notices",       title: "📢 Notices",         desc: "Latest notices" },
        { id: "ask_ai",        title: "✨ Ask AI",          desc: "Advice" },
      ],
    },
    treasurer: {
      header: `💰 Treasurer — Hi ${name}!`,
      body: `What would you like to do?`,
      items: [
        { id: "collection",      title: "📊 Collection Report", desc: "This month status" },
        { id: "defaulters",      title: "⚠️ Defaulters",        desc: "Unpaid flats" },
        { id: "mark_paid",       title: "✅ Mark Paid",          desc: "Record payment" },
        { id: "send_reminders",  title: "📱 Send Reminders",     desc: "WhatsApp defaulters" },
        { id: "society_balance", title: "🏦 Balance",            desc: "Society fund" },
        { id: "add_expense",     title: "📝 Add Expense",        desc: "Record expense" },
      ],
    },
    secretary: {
      header: `📋 Secretary — Hi ${name}!`,
      body: `What would you like to do?`,
      items: [
        { id: "open_complaints",  title: "⚖️ Open Complaints",  desc: "Needs action" },
        { id: "post_notice",      title: "📢 Post Notice",       desc: "Send to all" },
        { id: "maintenance",      title: "🔧 Maintenance",       desc: "Pending tasks" },
        { id: "todays_visitors",  title: "🚦 Today Visitors",    desc: "Gate log" },
        { id: "pending_delivery", title: "📦 Deliveries",        desc: "At gate" },
        { id: "broadcast",        title: "📱 Broadcast",         desc: "Message all" },
        { id: "ask_ai",           title: "✨ AI Draft",          desc: "Draft with AI" },
      ],
    },
    president: {
      header: `🏛️ President — Hi ${name}!`,
      body: `What would you like to do?`,
      items: [
        { id: "society_summary",  title: "📊 Summary",           desc: "Society overview" },
        { id: "collection",       title: "💰 Collections",        desc: "Fee status" },
        { id: "open_complaints",  title: "⚖️ Complaints",         desc: "Open issues" },
        { id: "approve_expense",  title: "✅ Approve Expenses",   desc: "Pending approvals" },
        { id: "ai_report",        title: "✨ Monthly Report",     desc: "AI committee report" },
        { id: "broadcast",        title: "📱 Broadcast",          desc: "Message all" },
      ],
    },
    super_admin: {
      header: `⚙️ Super Admin — Hi ${name}!`,
      body: `Full access`,
      items: [
        { id: "society_summary", title: "📊 Summary",    desc: "Complete overview" },
        { id: "collection",      title: "💰 Collections", desc: "Fee collection" },
        { id: "open_complaints", title: "⚖️ Complaints",  desc: "All open" },
        { id: "defaulters",      title: "⚠️ Defaulters",  desc: "Unpaid flats" },
        { id: "ai_report",       title: "✨ AI Report",   desc: "Monthly summary" },
        { id: "broadcast",       title: "📱 Broadcast",   desc: "Message all" },
      ],
    },
    committee: {
      header: `🏛️ Committee — Hi ${name}!`,
      body: `What would you like to do?`,
      items: [
        { id: "open_complaints", title: "⚖️ Complaints",  desc: "Open complaints" },
        { id: "notices",         title: "📢 Notices",     desc: "Latest notices" },
        { id: "my_dues",         title: "💰 My Dues",     desc: "My flat dues" },
        { id: "raise_issue",     title: "⚠️ Raise Issue", desc: "Report issue" },
      ],
    },
  };

  const menu = menus[role] || menus.resident;
  await sendMenu(to, menu.header, menu.body, menu.items);
}

async function handleAction(to: string, action: string, resident: Record<string, unknown>, role: string) {
  const flat = resident.flat_number as string;
  const name = (resident.name as string).split(" ")[0];
  const month = new Date().toISOString().slice(0, 7);

  switch (action) {
    case "my_dues": {
      const { data: inv } = await supabase.from("invoices").select("*")
        .eq("society_id", SOCIETY_ID).eq("flat_number", flat)
        .order("month", { ascending: false }).limit(3);
      if (!inv?.length) { await send(to, `📋 No invoices found for Flat ${flat}.\n\nContact secretary.\n\nType MENU to go back.`); return; }
      let msg = `💰 *Flat ${flat} — Dues*\n\n`;
      inv.forEach(i => { msg += `${i.month}: ${i.status === "paid" ? "✅ Paid" : `❌ ₹${Number(i.balance_due).toLocaleString("en-IN")} due`}\n`; });
      if (inv[0].status !== "paid") msg += `\n*Pay via UPI to society account. Send ref to treasurer.*`;
      else msg += `\n✅ All paid up!`;
      msg += `\n\nFull history: https://societyos.pages.dev\n\nType MENU to go back.`;
      await send(to, msg);
      break;
    }
    case "raise_issue": {
      sessions[to] = { state: "awaiting_complaint", data: { flat } };
      await send(to, `⚠️ *Raise a Complaint*\n\nDescribe your issue:`);
      break;
    }
    case "my_complaints": {
      const { data: comp } = await supabase.from("complaints").select("ticket_number,title,status")
        .eq("society_id", SOCIETY_ID).eq("flat_number", flat).order("created_at", { ascending: false }).limit(5);
      if (!comp?.length) { await send(to, `📋 No complaints from Flat ${flat}.\n\nType MENU to go back.`); return; }
      let msg = `📋 *Your Complaints*\n\n`;
      comp.forEach(c => { msg += `${c.status === "resolved" ? "✅" : "🔴"} ${c.ticket_number || "#"} — ${c.title} [${c.status}]\n`; });
      msg += `\nType MENU to go back.`;
      await send(to, msg);
      break;
    }
    case "notices": {
      const { data: notices } = await supabase.from("notices").select("title,content,type")
        .eq("society_id", SOCIETY_ID).order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(3);
      if (!notices?.length) { await send(to, `📢 No notices yet.\n\nType MENU to go back.`); return; }
      let msg = `📢 *Society Notices*\n\n`;
      notices.forEach(n => { msg += `${n.type === "urgent" ? "🚨" : "ℹ️"} *${n.title}*\n${(n.content || "").slice(0, 120)}\n\n`; });
      msg += `Type MENU to go back.`;
      await send(to, msg);
      break;
    }
    case "book_amenity": {
      const { data: am } = await supabase.from("amenities").select("name,icon,capacity").eq("society_id", SOCIETY_ID).eq("status", "available");
      if (!am?.length) { await send(to, `🏊 No amenities available now.\n\nType MENU to go back.`); return; }
      let msg = `🏊 *Available Amenities*\n\n`;
      am.forEach(a => { msg += `${a.icon} ${a.name} (cap: ${a.capacity})\n`; });
      msg += `\nTo book visit: https://societyos.pages.dev\n\nType MENU to go back.`;
      await send(to, msg);
      break;
    }
    case "visitor_pass": {
      sessions[to] = { state: "awaiting_visitor_name", data: { flat } };
      await send(to, `👤 *Pre-Approve Visitor*\n\nEnter visitor's name:`);
      break;
    }
    case "ask_ai": {
      sessions[to] = { state: "awaiting_ai_question", data: {} };
      await send(to, `✨ *AI Assistant*\n\nType your question about society rules, rights, or anything:`);
      break;
    }
    case "collection": {
      const { data: inv } = await supabase.from("invoices").select("flat_number,status,amount_paid,balance_due")
        .eq("society_id", SOCIETY_ID).eq("month", month);
      if (!inv?.length) { await send(to, `📊 No invoices for ${month}.\n\nGenerate from: https://societyos.pages.dev`); return; }
      const paid = inv.filter(i => i.status === "paid").length;
      const collected = inv.reduce((s, i) => s + Number(i.amount_paid || 0), 0);
      const pending = inv.reduce((s, i) => s + Number(i.balance_due || 0), 0);
      const unpaid = inv.filter(i => i.status !== "paid").map(i => i.flat_number);
      let msg = `📊 *Collection — ${month}*\n\n✅ ${paid}/${inv.length} paid\n💰 Collected: ₹${collected.toLocaleString("en-IN")}\n⚠️ Pending: ₹${pending.toLocaleString("en-IN")}`;
      if (unpaid.length) msg += `\n\n❌ Unpaid: ${unpaid.join(", ")}`;
      msg += `\n\nType MENU to go back.`;
      await send(to, msg);
      break;
    }
    case "defaulters": {
      const { data: d } = await supabase.from("v_defaulter_aging").select("*").eq("society_id", SOCIETY_ID).order("total_outstanding", { ascending: false });
      if (!d?.length) { await send(to, `✅ No defaulters! All paid.\n\nType MENU to go back.`); return; }
      let msg = `⚠️ *Defaulters*\n\n`;
      d.forEach(x => { msg += `Flat ${x.flat_number}: ₹${Number(x.total_outstanding).toLocaleString("en-IN")} (${x.months_outstanding}m)\n`; });
      msg += `\nType MENU to go back.`;
      await send(to, msg);
      break;
    }
    case "mark_paid": {
      sessions[to] = { state: "awaiting_paid_flat", data: {} };
      await send(to, `✅ *Mark Payment*\n\nEnter flat number:`);
      break;
    }
    case "send_reminders": {
      const { data: unpaid } = await supabase.from("invoices").select("flat_number,balance_due")
        .eq("society_id", SOCIETY_ID).eq("month", month).neq("status", "paid");
      if (!unpaid?.length) { await send(to, `✅ All paid! No reminders needed.\n\nType MENU to go back.`); return; }
      const rows = unpaid.map(i => ({ society_id: SOCIETY_ID, to_flat: i.flat_number, to_number: "", message: `Dear Resident, ₹${Number(i.balance_due).toLocaleString("en-IN")} maintenance due for ${month} — Flat ${i.flat_number}. Please pay. — Society`, type: "fee_reminder", status: "pending" }));
      await supabase.from("whatsapp_log").insert(rows);
      await send(to, `📱 ${unpaid.length} reminders queued.\nFlats: ${unpaid.map(i => i.flat_number).join(", ")}\n\nType MENU to go back.`);
      break;
    }
    case "society_balance": {
      const { data: s } = await supabase.from("societies").select("balance").eq("id", SOCIETY_ID).single();
      await send(to, `🏦 Society Balance: ₹${Number(s?.balance || 0).toLocaleString("en-IN")}\n\nType MENU to go back.`);
      break;
    }
    case "add_expense": {
      sessions[to] = { state: "awaiting_expense_desc", data: {} };
      await send(to, `📝 *Add Expense*\n\nEnter description:`);
      break;
    }
    case "open_complaints": {
      const { data: comp } = await supabase.from("complaints").select("ticket_number,title,flat_number,priority")
        .eq("society_id", SOCIETY_ID).eq("status", "open").order("created_at", { ascending: false }).limit(5);
      if (!comp?.length) { await send(to, `✅ No open complaints!\n\nType MENU to go back.`); return; }
      let msg = `⚖️ *Open Complaints (${comp.length})*\n\n`;
      comp.forEach(c => { msg += `${c.priority === "high" ? "🔴" : "🟡"} Flat ${c.flat_number}: ${c.title}\n`; });
      msg += `\nManage: https://societyos.pages.dev\n\nType MENU to go back.`;
      await send(to, msg);
      break;
    }
    case "post_notice": {
      sessions[to] = { state: "awaiting_notice_title", data: {} };
      await send(to, `📢 *Post Notice*\n\nEnter title:`);
      break;
    }
    case "maintenance": {
      const { data: tasks } = await supabase.from("maintenance_tasks").select("title,status,priority")
        .eq("society_id", SOCIETY_ID).neq("status", "completed").order("created_at", { ascending: false }).limit(5);
      if (!tasks?.length) { await send(to, `✅ No pending tasks.\n\nType MENU to go back.`); return; }
      let msg = `🔧 *Pending Tasks (${tasks.length})*\n\n`;
      tasks.forEach(t => { msg += `${t.priority === "high" ? "🔴" : "🟡"} ${t.title} [${t.status}]\n`; });
      msg += `\nFull list: https://societyos.pages.dev\n\nType MENU to go back.`;
      await send(to, msg);
      break;
    }
    case "todays_visitors": {
      const today = new Date().toISOString().slice(0, 10);
      const { data: v } = await supabase.from("visitors").select("name,flat_number,purpose,in_time,status")
        .eq("society_id", SOCIETY_ID).gte("in_time", `${today}T00:00:00`).order("in_time", { ascending: false }).limit(10);
      if (!v?.length) { await send(to, `🚦 No visitors today.\n\nType MENU to go back.`); return; }
      let msg = `🚦 *Today's Visitors (${v.length})*\n\n`;
      v.forEach(x => { const t = new Date(x.in_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }); msg += `${x.status === "inside" ? "🟢" : "⚪"} ${x.name} → Flat ${x.flat_number} at ${t}\n`; });
      msg += `\nType MENU to go back.`;
      await send(to, msg);
      break;
    }
    case "pending_delivery": {
      const { data: d } = await supabase.from("deliveries").select("flat_number,courier,items").eq("society_id", SOCIETY_ID).eq("status", "at-gate");
      if (!d?.length) { await send(to, `📦 No pending deliveries.\n\nType MENU to go back.`); return; }
      let msg = `📦 *Pending (${d.length})*\n\n`;
      d.forEach(x => { msg += `Flat ${x.flat_number}: ${x.courier} — ${x.items || "Package"}\n`; });
      msg += `\nType MENU to go back.`;
      await send(to, msg);
      break;
    }
    case "broadcast": {
      sessions[to] = { state: "awaiting_broadcast_msg", data: {} };
      await send(to, `📱 *Broadcast to ALL residents*\n\nType message (or CANCEL to abort):`);
      break;
    }
    case "society_summary": {
      const [s, comp, inv, tasks] = await Promise.all([
        supabase.from("societies").select("balance").eq("id", SOCIETY_ID).single(),
        supabase.from("complaints").select("status").eq("society_id", SOCIETY_ID),
        supabase.from("invoices").select("status").eq("society_id", SOCIETY_ID).eq("month", month),
        supabase.from("maintenance_tasks").select("status").eq("society_id", SOCIETY_ID),
      ]);
      const openComp = comp.data?.filter(c => c.status === "open").length || 0;
      const paidInv = inv.data?.filter(i => i.status === "paid").length || 0;
      const totalInv = inv.data?.length || 1;
      const openTasks = tasks.data?.filter(t => t.status !== "completed").length || 0;
      const score = Math.min(100, Math.round((paidInv/totalInv)*40 + Math.max(0,30-openComp*5) + Math.max(0,30-openTasks*3)));
      await send(to, `📊 *Society Summary*\n\n🏥 Health: ${score}/100\n💰 Balance: ₹${Number(s.data?.balance||0).toLocaleString("en-IN")}\n📋 Fees: ${paidInv}/${totalInv} paid\n⚖️ Complaints: ${openComp} open\n🔧 Maintenance: ${openTasks} pending\n\nhttps://societyos.pages.dev\n\nType MENU to go back.`);
      break;
    }
    case "ai_report": {
      await send(to, `✨ Generating report…`);
      const [comp, inv, tasks] = await Promise.all([
        supabase.from("complaints").select("status").eq("society_id", SOCIETY_ID),
        supabase.from("invoices").select("status").eq("society_id", SOCIETY_ID).eq("month", month),
        supabase.from("maintenance_tasks").select("status").eq("society_id", SOCIETY_ID),
      ]);
      const report = await askAI(`5-line WhatsApp monthly committee report for Indian apartment society ${month}: ${inv.data?.filter(i=>i.status==="paid").length||0}/${inv.data?.length||0} fees paid, ${comp.data?.filter(c=>c.status==="open").length||0} open complaints, ${tasks.data?.filter(t=>t.status!=="completed").length||0} maintenance pending. Use emojis, max 150 words.`);
      await send(to, `✨ *Monthly Report*\n\n${report}\n\nType MENU to go back.`);
      break;
    }
    case "approve_expense": {
      const { data: exp } = await supabase.from("expenses").select("description,amount").eq("society_id", SOCIETY_ID).eq("status", "pending").limit(5);
      if (!exp?.length) { await send(to, `✅ No expenses pending.\n\nType MENU to go back.`); return; }
      let msg = `⏳ *Pending Approvals*\n\n`;
      exp.forEach((e,i) => { msg += `${i+1}. ${e.description} — ₹${Number(e.amount).toLocaleString("en-IN")}\n`; });
      msg += `\nApprove: https://societyos.pages.dev\n\nType MENU to go back.`;
      await send(to, msg);
      break;
    }
    default:
      await showMainMenu(to, resident, role);
  }
}

async function handleSession(to: string, text: string, resident: Record<string, unknown>, role: string): Promise<boolean> {
  const session = sessions[to];
  if (!session) return false;
  const flat = resident.flat_number as string;
  const name = (resident.name as string).split(" ")[0];
  const month = new Date().toISOString().slice(0, 7);

  switch (session.state) {
    case "awaiting_complaint": {
      await supabase.from("complaints").insert({ society_id: SOCIETY_ID, flat_number: flat, title: text.slice(0, 100), description: text, category: "General", priority: "medium", status: "open", votes: 0, sla_hours: 168, source: "whatsapp" });
      delete sessions[to];
      await send(to, `✅ Complaint submitted!\n\n"${text.slice(0,80)}"\n\nSecretary notified. Type MENU for more.`);
      return true;
    }
    case "awaiting_visitor_name": {
      session.data.visitor_name = text; session.state = "awaiting_visitor_purpose";
      await send(to, `👤 ${text}\n\nPurpose of visit?`);
      return true;
    }
    case "awaiting_visitor_purpose": {
      await supabase.from("visitors").insert({ society_id: SOCIETY_ID, flat_number: flat, name: session.data.visitor_name, purpose: text, type: "pre-approved", status: "expected", host_name: name });
      delete sessions[to];
      await send(to, `✅ ${session.data.visitor_name} pre-approved for Flat ${flat}.\nPurpose: ${text}\n\nGate notified. Type MENU for more.`);
      return true;
    }
    case "awaiting_paid_flat": {
      session.data.paid_flat = text; session.state = "awaiting_paid_amount";
      await send(to, `Flat ${text} — Amount received (₹)?`);
      return true;
    }
    case "awaiting_paid_amount": {
      const amount = Number(text.replace(/[^0-9]/g, ""));
      if (!amount) { await send(to, `Invalid amount. Numbers only:`); return true; }
      session.data.amount = String(amount); session.state = "awaiting_paid_method";
      await send(to, `₹${amount.toLocaleString("en-IN")} received.\n\nPayment method?\n1. UPI\n2. Cash\n3. Cheque\n4. Bank Transfer`);
      return true;
    }
    case "awaiting_paid_method": {
      const methods: Record<string, string> = { "1": "upi", "2": "cash", "3": "cheque", "4": "neft" };
      const method = methods[text.trim()] || "cash";
      const { data: inv } = await supabase.from("invoices").select("id,flat_id,resident_id,balance_due").eq("society_id", SOCIETY_ID).eq("flat_number", session.data.paid_flat).eq("month", month).single();
      delete sessions[to];
      if (!inv) { await send(to, `No invoice for Flat ${session.data.paid_flat} this month.\n\nType MENU.`); return true; }
      const amount = Number(session.data.amount);
      const newBalance = Math.max(0, Number(inv.balance_due) - amount);
      await supabase.from("payments").insert({ society_id: SOCIETY_ID, invoice_id: inv.id, flat_id: inv.flat_id, amount, method, status: "success", recorded_by: name, paid_at: new Date().toISOString() });
      await supabase.from("invoices").update({ amount_paid: amount, balance_due: newBalance, status: newBalance <= 0 ? "paid" : "partial" }).eq("id", inv.id);
      await send(to, `✅ Payment recorded!\nFlat ${session.data.paid_flat}: ₹${amount.toLocaleString("en-IN")} via ${method.toUpperCase()}\nBy: ${name}\n\nType MENU for more.`);
      return true;
    }
    case "awaiting_notice_title": {
      session.data.title = text; session.state = "awaiting_notice_content";
      await send(to, `Title: *${text}*\n\nNow enter notice content:`);
      return true;
    }
    case "awaiting_notice_content": {
      await supabase.from("notices").insert({ society_id: SOCIETY_ID, title: session.data.title, content: text, type: "info", target: "all", author: name, pinned: false, read_count: 0 });
      delete sessions[to];
      await send(to, `✅ Notice posted!\n📢 ${session.data.title}\n\nType MENU for more.`);
      return true;
    }
    case "awaiting_broadcast_msg": {
      if (text.toUpperCase() === "CANCEL") { delete sessions[to]; await send(to, `Cancelled. Type MENU.`); return true; }
      const { data: residents } = await supabase.from("residents").select("phone,flat_number").eq("society_id", SOCIETY_ID).eq("status", "active").eq("whatsapp_opt_in", true);
      const rows = (residents || []).filter(r => r.phone).map(r => ({ society_id: SOCIETY_ID, to_flat: r.flat_number, to_number: r.phone, message: text, type: "broadcast", status: "pending" }));
      await supabase.from("whatsapp_log").insert(rows);
      delete sessions[to];
      await send(to, `✅ Broadcast queued to ${rows.length} residents.\n\nType MENU for more.`);
      return true;
    }
    case "awaiting_expense_desc": {
      session.data.desc = text; session.state = "awaiting_expense_amount";
      await send(to, `"${text}"\n\nAmount (₹)?`);
      return true;
    }
    case "awaiting_expense_amount": {
      const amount = Number(text.replace(/[^0-9]/g, ""));
      if (!amount) { await send(to, `Invalid. Numbers only:`); return true; }
      await supabase.from("expenses").insert({ society_id: SOCIETY_ID, description: session.data.desc, amount, net_amount: amount, category: "General", expense_date: new Date().toISOString().slice(0,10), status: "pending", created_by: name });
      delete sessions[to];
      await send(to, `✅ Expense added: ${session.data.desc} — ₹${amount.toLocaleString("en-IN")}\nStatus: Pending approval\n\nType MENU for more.`);
      return true;
    }
    case "awaiting_ai_question": {
      await send(to, `✨ Thinking…`);
      const answer = await askAI(`Indian apartment society (RWA) expert. Resident in Hyderabad asks: "${text}". Answer in 3 sentences. End with "Type MENU for more options."`);
      delete sessions[to];
      await send(to, `✨ ${answer}`);
      return true;
    }
    default:
      delete sessions[to];
      return false;
  }
}

serve(async (req) => {
  const url = new URL(req.url);
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN) return new Response(challenge, { status: 200 });
    return new Response("Forbidden", { status: 403 });
  }
  if (req.method !== "POST") return new Response("ok");

  const body = await req.json();
  const messages = body?.entry?.[0]?.changes?.[0]?.value?.messages;
  if (!messages?.length) return new Response("ok");

  for (const msg of messages) {
    const from = msg.from;
    let text = "";
    if (msg.type === "text") text = msg.text?.body?.trim() || "";
    else if (msg.type === "interactive") text = msg.interactive?.list_reply?.id || msg.interactive?.button_reply?.id || "";
    if (!text) continue;

    const resident = await getResident(from);
    if (!resident) {
      await send(from, `👋 Welcome to SocietyOS!\n\nYour number is not registered.\n\nContact your secretary to get registered.\n\nWeb portal: https://societyos.pages.dev`);
      continue;
    }

    const role = getRole(resident);
    const upper = text.toUpperCase();

    if (["MENU","HI","HELLO","START","HOME"].includes(upper)) {
      delete sessions[from];
      await showMainMenu(from, resident, role);
      continue;
    }
    if (upper === "HELP") {
      await send(from, `ℹ️ *Help*\n\nType:\n• MENU — Main menu\n• HI — Start over\n• CANCEL — Cancel action\n\nPortal: https://societyos.pages.dev`);
      continue;
    }

    const handled = await handleSession(from, text, resident, role);
    if (!handled) await handleAction(from, text.toLowerCase(), resident, role);
  }

  return new Response("ok", { status: 200 });
});

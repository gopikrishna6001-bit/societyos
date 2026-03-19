import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("ANON_KEY") ?? "";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);
  try {
    const body = await req.json();
    const action = body.action ?? "";
    const phone = body.phone ?? "";
    const pin = body.pin ?? "";
    const residentId = body.resident_id ?? "";
    const newPin = body.new_pin ?? "";

    if (action === "set_pin") {
      if (!residentId || !newPin) return json({ error: "resident_id and new_pin required" }, 400);
      const { error } = await adminClient.from("residents").update({ pin: newPin, pin_changed: true }).eq("id", residentId);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "lookup") {
      const cleaned = phone.replace(/\D/g, "").slice(-10);
      const { data, error } = await adminClient.from("residents").select("id,name,flat_number,block,type,pin_changed").eq("phone", cleaned).eq("status", "active").order("flat_number");
      if (error) return json({ error: error.message }, 500);
      if (!data?.length) return json({ error: "Phone number not registered. Contact your society secretary." }, 401);
      if (data.length === 1) return json({ resident: data[0], multiple: false });
      return json({ residents: data, multiple: true });
    }

    if (action === "login") {
      const cleaned = phone.replace(/\D/g, "").slice(-10);
      const { data: rows, error: findErr } = await adminClient.from("residents").select("*, committee_members(role)").eq("phone", cleaned).eq("status", "active");
      if (findErr) return json({ error: findErr.message }, 500);
      if (!rows?.length) return json({ error: "Resident not found." }, 401);
      const resident = residentId ? (rows.find((r) => r.id === residentId) || rows[0]) : rows[0];
      const storedPin = resident.pin ?? "";
      if (storedPin !== pin) return json({ error: "Incorrect PIN. Contact your secretary if you forgot it." }, 401);

      let authUserId = resident.auth_user_id;
      const email = cleaned + "@societyos.app";
      const pwd = "sos_" + resident.id;

      if (!authUserId) {
        const { data: nu, error: ce } = await adminClient.auth.admin.createUser({ email, password: pwd, email_confirm: true });
        if (ce) {
          const { data: list } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const ex = list?.users?.find((u) => u.email === email);
          if (ex) { authUserId = ex.id; await adminClient.auth.admin.updateUserById(authUserId, { password: pwd }); }
          else return json({ error: "Auth setup failed: " + ce.message }, 500);
        } else { authUserId = nu.user.id; }
        await adminClient.from("residents").update({ auth_user_id: authUserId }).eq("id", resident.id);
      } else {
        await adminClient.auth.admin.updateUserById(authUserId, { password: pwd });
      }

      const ac = createClient(SUPABASE_URL, ANON_KEY);
      const { data: si, error: se } = await ac.auth.signInWithPassword({ email, password: pwd });
      if (se || !si?.session) return json({ error: "Sign in failed: " + (se?.message ?? "no session") }, 500);

      await adminClient.from("residents").update({ last_login: new Date().toISOString() }).eq("id", resident.id);

      const cr = resident.committee_members?.[0]?.role;
      const role = resident.is_super_admin ? "super_admin" : cr === "President" ? "president" : cr === "Secretary" ? "secretary" : cr === "Treasurer" ? "treasurer" : cr ? "committee" : resident.type === "tenant" ? "tenant" : "resident";

      return json({ session: si.session, resident: { id: resident.id, name: resident.name, flat_number: resident.flat_number, block: resident.block, phone: resident.phone, type: resident.type, society_id: resident.society_id, is_super_admin: resident.is_super_admin, pin_changed: resident.pin_changed, committee_members: resident.committee_members }, role, first_login: !resident.pin_changed });
    }

    if (action === "reset_pin") {
      const { data: target } = await adminClient.from("residents").select("flat_number").eq("id", residentId).single();
      if (!target) return json({ error: "Resident not found" }, 404);
      const defaultPin = target.flat_number.replace(/\D/g, "").padStart(4, "0").slice(-4);
      await adminClient.from("residents").update({ pin: defaultPin, pin_changed: false }).eq("id", residentId);
      return json({ success: true, default_pin: defaultPin });
    }

    return json({ error: "Unknown action: " + action }, 400);
  } catch (err) {
    return json({ error: "Caught: " + (err?.message ?? String(err)) }, 500);
  }
});

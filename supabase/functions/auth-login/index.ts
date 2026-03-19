import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY     = Deno.env.get("ANON_KEY") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function determineRole(r: Record<string, unknown>): string {
  if (r.is_super_admin) return "super_admin";
  const cr = (r.committee_members as { role: string }[])?.[0]?.role;
  if (cr === "President") return "president";
  if (cr === "Secretary") return "secretary";
  if (cr === "Treasurer") return "treasurer";
  if (cr) return "committee";
  if (r.type === "tenant") return "tenant";
  return "resident";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const body = await req.json();
    const { action, phone, pin, resident_id, new_pin } = body;

    // ── LOOKUP ────────────────────────────────────────────────────────────────
    if (action === "lookup") {
      if (!phone) return json({ error: "Phone required" }, 400);
      const cleaned = phone.replace(/\D/g, "").slice(-10);
      const { data: residents } = await adminClient
        .from("residents")
        .select("id, name, flat_number, block, type, pin_changed")
        .eq("phone", cleaned)
        .eq("status", "active")
        .order("flat_number");
      if (!residents?.length) return json({ error: "Phone number not registered. Contact your society secretary." }, 401);
      if (residents.length === 1) return json({ resident: residents[0], multiple: false });
      return json({ residents, multiple: true });
    }

    // ── LOGIN ─────────────────────────────────────────────────────────────────
    if (action === "login") {
      if (!phone || !pin) return json({ error: "Phone and PIN required" }, 400);
      const cleaned = phone.replace(/\D/g, "").slice(-10);

      let query = adminClient.from("residents")
        .select("*, committee_members(role)")
        .eq("phone", cleaned)
        .eq("status", "active");
      if (resident_id) query = query.eq("id", resident_id);

      const { data: residents, error: findErr } = await query;
      if (findErr || !residents?.length) return json({ error: "Resident not found." }, 401);

      const resident = residents[0];

      // Verify PIN
      let pinValid = false;
      if (resident.pin_hash) {
        try { pinValid = await bcrypt.compare(pin, resident.pin_hash); }
        catch (e) { console.error("bcrypt compare error:", e); return json({ error: "PIN check failed." }, 500); }
      } else if (resident.pin) {
        pinValid = resident.pin === pin;
        if (pinValid) {
          // Migrate to hash
          try {
            const hash = await bcrypt.hash(pin);
            await adminClient.from("residents").update({ pin_hash: hash, pin: null }).eq("id", resident.id);
          } catch (e) { console.error("Hash migration error:", e); }
        }
      }

      if (!pinValid) return json({ error: "Incorrect PIN. Contact your secretary if you forgot it." }, 401);

      // Create or get auth user
      let authUserId = resident.auth_user_id;
      const email = `${cleaned}_${resident.flat_number}@societyos.app`;
      const sessionPassword = `sos_${resident.id}`;

      if (!authUserId) {
        const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
          email, password: sessionPassword, email_confirm: true,
          user_metadata: { resident_id: resident.id, society_id: resident.society_id, flat_number: resident.flat_number, name: resident.name },
        });

        if (createErr) {
          // Might already exist — search for it
          const { data: list } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const existing = list?.users?.find(u => u.email === email);
          if (existing) { authUserId = existing.id; }
          else { console.error("Create user error:", createErr); return json({ error: "Auth setup failed." }, 500); }
        } else {
          authUserId = newUser.user.id;
        }

        await adminClient.from("residents").update({ auth_user_id: authUserId }).eq("id", resident.id);
      }

      // Update password and sign in to get JWT
      await adminClient.auth.admin.updateUserById(authUserId, { password: sessionPassword });

      const anonClient = createClient(SUPABASE_URL, ANON_KEY);
      const { data: signIn, error: signInErr } = await anonClient.auth.signInWithPassword({ email, password: sessionPassword });

      if (signInErr || !signIn?.session) {
        console.error("SignIn error:", signInErr);
        return json({ error: "Login failed. Please try again." }, 500);
      }

      await adminClient.from("residents").update({ last_login: new Date().toISOString() }).eq("id", resident.id);

      return json({
        session: signIn.session,
        resident: {
          id: resident.id, name: resident.name, flat_number: resident.flat_number,
          block: resident.block, phone: resident.phone, type: resident.type,
          society_id: resident.society_id, is_super_admin: resident.is_super_admin,
          pin_changed: resident.pin_changed, committee_members: resident.committee_members,
        },
        role: determineRole(resident),
        first_login: !resident.pin_changed,
      });
    }

    // ── SET PIN ───────────────────────────────────────────────────────────────
    if (action === "set_pin") {
      if (!resident_id || !new_pin) return json({ error: "resident_id and new_pin required" }, 400);
      if (new_pin.length !== 4 || !/^\d{4}$/.test(new_pin)) return json({ error: "PIN must be 4 digits" }, 400);
      const hash = await bcrypt.hash(new_pin);
      await adminClient.from("residents").update({ pin_hash: hash, pin: null, pin_changed: true }).eq("id", resident_id);
      return json({ success: true });
    }

    // ── RESET PIN (secretary only) ────────────────────────────────────────────
    if (action === "reset_pin") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return json({ error: "Unauthorized" }, 401);

      const callerClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await callerClient.auth.getUser();
      if (!user) return json({ error: "Unauthorized" }, 401);

      const { data: caller } = await adminClient.from("residents").select("is_super_admin, id").eq("auth_user_id", user.id).single();
      const { data: callerCommittee } = await adminClient.from("committee_members").select("id").eq("resident_id", caller?.id).eq("active", true).single();

      if (!caller?.is_super_admin && !callerCommittee) return json({ error: "Only committee can reset PINs" }, 403);

      const { data: target } = await adminClient.from("residents").select("flat_number").eq("id", resident_id).single();
      if (!target) return json({ error: "Resident not found" }, 404);

      const defaultPin = target.flat_number.replace(/\D/g, "").padStart(4, "0").slice(-4);
      const hash = await bcrypt.hash(defaultPin);
      await adminClient.from("residents").update({ pin_hash: hash, pin: null, pin_changed: false }).eq("id", resident_id);

      return json({ success: true, default_pin: defaultPin });
    }

    return json({ error: "Invalid action" }, 400);

  } catch (err) {
    console.error("auth-login error:", err);
    return json({ error: "Server error. Please try again." }, 500);
  }
});

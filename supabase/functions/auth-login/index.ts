// supabase/functions/auth-login/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Admin client — bypasses RLS for auth operations
const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, phone, pin, resident_id, new_pin } = await req.json();

    // ── LOOKUP (check phone exists, return masked info) ───────────────────────
    if (action === "lookup") {
      if (!phone) return json({ error: "Phone required" }, 400);
      const cleaned = phone.replace(/\D/g, "").slice(-10);

      const { data: residents } = await adminClient
        .from("residents")
        .select("id, name, flat_number, block, type, pin_changed")
        .eq("phone", cleaned)
        .eq("status", "active")
        .order("flat_number");

      if (!residents?.length) {
        return json({ error: "Phone number not registered. Contact your society secretary." }, 401);
      }

      // Single flat — proceed to PIN
      if (residents.length === 1) {
        return json({ resident: residents[0], multiple: false });
      }

      // Multiple flats — return all, ask user to pick
      return json({ residents, multiple: true });
    }

    // ── LOGIN ──────────────────────────────────────────────────────────────────
    if (action === "login") {
      if (!phone || !pin) {
        return json({ error: "Phone and PIN required" }, 400);
      }

      const cleaned = phone.replace(/\D/g, "").slice(-10);

      // Find resident — use resident_id if provided (multi-flat owner)
      let query = adminClient.from("residents")
        .select("*, committee_members(role)")
        .eq("phone", cleaned)
        .eq("status", "active");

      if (resident_id) {
        query = query.eq("id", resident_id);
      }

      const { data: residents, error: findErr } = await query;

      if (findErr || !residents?.length) {
        return json({ error: "Phone number not registered. Contact your secretary." }, 401);
      }

      const resident = residents[0];

      // Verify PIN
      // Support both plaintext (old) and bcrypt (new) PINs
      let pinValid = false;
      if (resident.pin_hash) {
        // Bcrypt hash exists — use secure comparison
        pinValid = await bcrypt.compare(pin, resident.pin_hash);
      } else if (resident.pin) {
        // Legacy plaintext PIN — verify then migrate to hash
        pinValid = resident.pin === pin;
        if (pinValid) {
          // Migrate to bcrypt hash immediately
          const hash = await bcrypt.hash(pin);
          await adminClient.from("residents").update({ pin_hash: hash, pin: null }).eq("id", resident.id);
        }
      }

      if (!pinValid) {
        return json({ error: "Incorrect PIN. Contact your secretary if you forgot it." }, 401);
      }

      // Get or create Supabase auth user for this resident
      let authUserId = resident.auth_user_id;

      if (!authUserId) {
        // Create auth user with phone as email (Supabase auth requires email)
        const email = `${cleaned}@societyos.app`;
        const password = `sos_${resident.id}_${Date.now()}`;

        // Check if user already exists
        const { data: existingUsers } = await adminClient.auth.admin.listUsers();
        const existing = existingUsers?.users?.find(u => u.email === email);

        if (existing) {
          authUserId = existing.id;
        } else {
          const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
              resident_id: resident.id,
              society_id: resident.society_id,
              flat_number: resident.flat_number,
              name: resident.name,
            },
          });

          if (createErr) {
            return json({ error: "Auth setup failed. Contact admin." }, 500);
          }
          authUserId = newUser.user.id;
        }

        // Link auth user to resident
        await adminClient.from("residents")
          .update({ auth_user_id: authUserId })
          .eq("id", resident.id);
      }

      // Generate session token
      const { data: session, error: sessionErr } = await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: `${cleaned}@societyos.app`,
      });

      // Use signInWithPassword approach instead
      // Update the auth user password to a known value for this session
      const sessionPassword = `sos_${pin}_${resident.id.slice(0, 8)}`;
      await adminClient.auth.admin.updateUserById(authUserId, {
        password: sessionPassword,
      });

      // Sign in with that password to get a real JWT session
      const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "");
      const { data: signIn, error: signInErr } = await anonClient.auth.signInWithPassword({
        email: `${cleaned}@societyos.app`,
        password: sessionPassword,
      });

      if (signInErr || !signIn.session) {
        return json({ error: "Login failed. Please try again." }, 500);
      }

      // Determine role
      const role = determineRole(resident);

      // Update last login
      await adminClient.from("residents")
        .update({ last_login: new Date().toISOString() })
        .eq("id", resident.id);

      // Return session + resident info
      return json({
        session: signIn.session,
        resident: {
          id: resident.id,
          name: resident.name,
          flat_number: resident.flat_number,
          block: resident.block,
          phone: resident.phone,
          type: resident.type,
          society_id: resident.society_id,
          is_super_admin: resident.is_super_admin,
          pin_changed: resident.pin_changed,
          committee_members: resident.committee_members,
        },
        role,
        first_login: !resident.pin_changed,
      });
    }

    // ── SET PIN (first login or change) ───────────────────────────────────────
    if (action === "set_pin") {
      if (!resident_id || !new_pin) {
        return json({ error: "resident_id and new_pin required" }, 400);
      }
      if (new_pin.length !== 4 || !/^\d{4}$/.test(new_pin)) {
        return json({ error: "PIN must be exactly 4 digits" }, 400);
      }

      const hash = await bcrypt.hash(new_pin);
      await adminClient.from("residents")
        .update({ pin_hash: hash, pin: null, pin_changed: true })
        .eq("id", resident_id);

      return json({ success: true });
    }

    // ── RESET PIN (secretary resets for a resident) ───────────────────────────
    if (action === "reset_pin") {
      // Verify caller is committee
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return json({ error: "Unauthorized" }, 401);

      const callerClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await callerClient.auth.getUser();
      if (!user) return json({ error: "Unauthorized" }, 401);

      // Check caller is committee
      const { data: caller } = await adminClient.from("residents")
        .select("is_super_admin, id")
        .eq("auth_user_id", user.id)
        .single();

      const { data: callerCommittee } = await adminClient.from("committee_members")
        .select("id").eq("resident_id", caller?.id).eq("active", true).single();

      if (!caller?.is_super_admin && !callerCommittee) {
        return json({ error: "Only committee members can reset PINs" }, 403);
      }

      // Get resident to reset
      const { data: target } = await adminClient.from("residents")
        .select("flat_number, phone").eq("id", resident_id).single();

      if (!target) return json({ error: "Resident not found" }, 404);

      // Reset to default PIN = flat number padded to 4 digits
      const defaultPin = target.flat_number.replace(/\D/g, "").padStart(4, "0").slice(-4);
      const hash = await bcrypt.hash(defaultPin);

      await adminClient.from("residents")
        .update({ pin_hash: hash, pin: null, pin_changed: false })
        .eq("id", resident_id);

      return json({ success: true, default_pin: defaultPin });
    }

    return json({ error: "Invalid action" }, 400);

  } catch (err) {
    console.error("auth-login error:", err);
    return json({ error: "Server error. Please try again." }, 500);
  }
});

function determineRole(resident: Record<string, unknown>): string {
  if (resident.is_super_admin) return "super_admin";
  const cr = (resident.committee_members as { role: string }[])?.[0]?.role;
  if (cr === "President") return "president";
  if (cr === "Secretary") return "secretary";
  if (cr === "Treasurer") return "treasurer";
  if (cr) return "committee";
  if (resident.type === "tenant") return "tenant";
  return "resident";
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

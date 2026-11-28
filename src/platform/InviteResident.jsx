import { useState } from "react";
import { supabase } from "./api.js";
import { Field, control } from "./ui.jsx";

const ROLES = [
  ["resident", "Resident"],
  ["treasurer", "Treasurer"],
  ["committee_admin", "Committee admin"],
];

export default function InviteResident({ communityId, roles }) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const canInvite = roles.includes("committee_admin") || roles.includes("platform_admin");
  if (!canInvite) return null;

  const submit = async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setPending(true);
    setMessage("");
    const result = await supabase.functions.invoke("invite-member", {
      body: { community_id: communityId, email: String(data.email || "").trim(), role: data.role, site_url: window.location.origin },
    });
    setPending(false);
    if (result.error?.context?.status === 409 || result.data?.error === "already_registered") {
      setMessage("This person already has an account. Link them to a unit from Units instead.");
      return;
    }
    setMessage(result.error || !result.data?.ok
      ? "Invitation could not be sent."
      : "Invitation sent. The link expires and works once.");
    event.currentTarget.reset();
  };

  return (
    <form className="mt-6 grid gap-3 border border-slate-800 p-4" onSubmit={submit}>
      <h3 className="text-lg font-semibold">Invite a member</h3>
      <p className="text-sm text-slate-400">An administrator sends the invitation. The recipient sets their own password. There is no public registration.</p>
      <Field label="Email"><input className={control} type="email" name="email" autoComplete="off" required /></Field>
      <Field label="Role">
        <select className={control} name="role" defaultValue="resident">
          {ROLES.filter(([value]) => value === "resident" || value === "treasurer" || roles.includes("platform_admin")).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </Field>
      {message && <p role="status" className="text-sm">{message}</p>}
      <button disabled={pending} className="min-h-12 bg-[#0878E8] px-3 font-semibold text-white" type="submit">
        {pending ? "Sending…" : "Send invitation"}
      </button>
    </form>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { brand, colors } from "../brand.js";
import { INVITE_INVALID, RECOVERY_NOTICE, passwordRule } from "../lib/authPolicy.js";

const page = { minHeight: "100vh", background: colors.navy, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'DM Sans', system-ui, sans-serif" };
const card = { width: "100%", maxWidth: 420, background: colors.white, borderRadius: 16, padding: 28, color: colors.navy };
const field = { width: "100%", marginTop: 6, padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 16 };

function Shell({ title, children }) {
  return (
    <main style={page}>
      <section style={card}>
        <p style={{ margin: 0, color: colors.blue, fontSize: 12, fontWeight: 700, letterSpacing: "0.14em" }}>{brand.name}</p>
        <h1 style={{ margin: "8px 0 0", fontSize: 28 }}>{title}</h1>
        {children}
        <p style={{ marginTop: 16 }}><Link to="/" style={{ color: colors.navy, fontWeight: 700 }}>Back to sign in</Link></p>
      </section>
    </main>
  );
}

export function ResetPassword() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState(undefined);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(({ data }) => { if (live) setSession(data.session ?? null); });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setSession(next);
    });
    return () => { live = false; data.subscription.unsubscribe(); };
  }, []);

  const requestLink = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (String(form.get("website") || "").trim()) {
      setMessage(RECOVERY_NOTICE);
      return;
    }
    setPending(true);
    try {
      await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset` });
    } catch {
      // The notice stays the same when the address has no account.
    } finally {
      setPending(false);
      setMessage(RECOVERY_NOTICE);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    const rule = passwordRule(password);
    if (rule) {
      setMessage(rule);
      return;
    }
    setPending(true);
    const result = await supabase.auth.updateUser({ password });
    setPending(false);
    setMessage(result.error ? "The password could not be saved. Request a new recovery link." : "Your password is saved. You can sign in.");
  };

  if (session === undefined) return <Shell title="Reset password"><p>Checking your session…</p></Shell>;
  if (session) {
    return (
      <Shell title="Choose a new password">
        <form onSubmit={savePassword}>
          <label htmlFor="new-password" style={{ display: "block", marginTop: 18, fontWeight: 700 }}>New password</label>
          <input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} style={field} />
          {message && <p role="status">{message}</p>}
          <button type="submit" disabled={pending} style={{ marginTop: 16, background: colors.blue, color: colors.white, border: "none", borderRadius: 10, padding: "12px 16px", fontWeight: 700 }}>
            {pending ? "Please wait…" : "Save password"}
          </button>
        </form>
      </Shell>
    );
  }
  return (
    <Shell title="Reset password">
      <p>Enter the email your community issued. The response is the same whether or not that account exists.</p>
      <form onSubmit={requestLink}>
        <label htmlFor="recovery-email" style={{ display: "block", marginTop: 18, fontWeight: 700 }}>Email</label>
        <input id="recovery-email" name="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} style={field} />
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px" }} />
        {message && <p role="status">{message}</p>}
        <button type="submit" disabled={pending} style={{ marginTop: 16, background: colors.blue, color: colors.white, border: "none", borderRadius: 10, padding: "12px 16px", fontWeight: 700 }}>
          {pending ? "Please wait…" : "Send recovery link"}
        </button>
      </form>
    </Shell>
  );
}

export function JoinCommunity() {
  const [invite] = useState(() => {
    const token = new URLSearchParams(window.location.search).get("invite");
    if (token) {
      const url = new URL(window.location.href);
      url.searchParams.delete("invite");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }
    return token || "";
  });
  const [password, setPassword] = useState("");
  const [session, setSession] = useState(undefined);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(({ data }) => { if (live) setSession(data.session ?? null); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { if (live) setSession(next); });
    return () => { live = false; data.subscription.unsubscribe(); };
  }, []);

  const activate = async (event) => {
    event.preventDefault();
    const rule = passwordRule(password);
    if (rule) {
      setMessage(rule);
      return;
    }
    if (!session || !invite) {
      setMessage(INVITE_INVALID);
      return;
    }
    setPending(true);
    const updated = await supabase.auth.updateUser({ password });
    if (updated.error) {
      setPending(false);
      setMessage(INVITE_INVALID);
      return;
    }
    const accepted = await supabase.rpc("accept_invitation", { p_token: invite });
    setPending(false);
    setMessage(accepted.error ? INVITE_INVALID : "Your account is ready. You can continue to the community.");
  };

  return (
    <Shell title="Accept invitation">
      {session === undefined ? <p>Checking your session…</p> : (
        <form onSubmit={activate}>
          <p>Open the invitation from your email, then choose your own password. This page cannot create an account without that invitation.</p>
          <label htmlFor="invite-password" style={{ display: "block", marginTop: 18, fontWeight: 700 }}>Password</label>
          <input id="invite-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} style={field} />
          {message && <p role="status">{message}</p>}
          <button type="submit" disabled={pending} style={{ marginTop: 16, background: colors.blue, color: colors.white, border: "none", borderRadius: 10, padding: "12px 16px", fontWeight: 700 }}>
            {pending ? "Please wait…" : "Activate account"}
          </button>
        </form>
      )}
    </Shell>
  );
}

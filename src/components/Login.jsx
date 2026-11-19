import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { brand, colors } from "../brand.js";
import { GENERIC_AUTH_ERROR, passwordRule, signInMessage } from "../lib/authPolicy.js";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (String(form.get("website") || "").trim()) {
      setError(GENERIC_AUTH_ERROR);
      return;
    }
    const rule = passwordRule(password);
    if (rule) {
      setError(rule);
      return;
    }
    setPending(true);
    setError("");
    try {
      const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      if (onLogin) await onLogin(result.data);
    } catch (cause) {
      setError(signInMessage(cause));
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: colors.navy, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 420, background: colors.white, borderRadius: 16, padding: 28 }}>
        <p style={{ margin: 0, color: colors.blue, fontSize: 12, fontWeight: 700, letterSpacing: "0.14em" }}>{brand.name}</p>
        <h1 style={{ margin: "8px 0 0", color: colors.navy, fontSize: 28 }}>{brand.tagline}</h1>
        <p style={{ color: "#475569", fontSize: 14, lineHeight: 1.5 }}>{brand.loginLead}</p>
        <label style={{ display: "block", marginTop: 18, color: colors.navy, fontSize: 13, fontWeight: 700 }} htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)}
          style={{ width: "100%", marginTop: 6, padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 16 }} />
        <label style={{ display: "block", marginTop: 14, color: colors.navy, fontSize: 13, fontWeight: 700 }} htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)}
          style={{ width: "100%", marginTop: 6, padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 16 }} />
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px" }} />
        {error && <p role="alert" style={{ color: "#b91c1c", fontSize: 14 }}>{error}</p>}
        <button type="submit" disabled={pending}
          style={{ width: "100%", marginTop: 18, background: colors.blue, color: colors.white, border: "none", borderRadius: 10, padding: "12px 16px", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
          {pending ? "Please wait…" : "Sign in"}
        </button>
        <p style={{ marginTop: 16, fontSize: 14 }}>
          <Link to="/reset" style={{ color: colors.navy, fontWeight: 700 }}>Forgot password</Link>
        </p>
        <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>
          Sign in with the email your community issued. This form does not accept a phone number or a PIN, and it does not create accounts.
        </p>
      </form>
    </div>
  );
}

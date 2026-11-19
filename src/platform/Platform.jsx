import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { isSupabaseConfigured, rpc, rows, supabase } from "./api.js";
import { explain } from "./api.js";
import {
  ConcernsScreen, DecisionsScreen, DocumentsScreen, FinanceScreen, HistoryScreen,
  HomeScreen, NotificationsScreen, ProfileScreen, SettingsScreen, UnitsScreen,
} from "./screens.jsx";
import { Field, PageStatus, control } from "./ui.jsx";
import { brand } from "../brand.js";
import { Mark, Wordmark } from "../brand/Mark.jsx";

export default function Platform() {
  if (!isSupabaseConfigured) return <ConfigRequired />;
  return <SignedInApp />;
}

function ConfigRequired() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className="flex items-center gap-3 text-[#0f6b56]">
        <Mark size={36} />
        <h1 className="text-4xl font-semibold tracking-[0.14em] text-slate-100">{brand.name}</h1>
      </div>
      <p className="mt-3 text-lg">{brand.tagline}</p>
      <p className="mt-4 text-slate-400">Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, apply the migration, then sign in. No sample balances are shown.</p>
      <Link className="mt-6 inline-block font-semibold text-amber-300" to="/legacy">Open the earlier screens</Link>
    </main>
  );
}

function SignedInApp() {
  const [session, setSession] = useState(undefined);
  const [authError, setAuthError] = useState("");
  useEffect(() => {
    let live = true;
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!live) return;
        if (error) { setAuthError(error.message); setSession(null); return; }
        setSession(data.session);
      })
      .catch((error) => { if (live) { setAuthError(explain(error)); setSession(null); } });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { if (live) setSession(next); });
    return () => { live = false; data.subscription.unsubscribe(); };
  }, []);
  if (session === undefined) return <p className="p-6 text-slate-400">Checking your session…</p>;
  if (authError && !session) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <p role="alert" className="text-red-300">{authError}</p>
        <button type="button" className="mt-3 rounded-lg border border-slate-600 px-3 py-2" onClick={() => window.location.reload()}>Retry</button>
      </main>
    );
  }
  if (!session) return <AuthScreen />;
  return <CommunityApp session={session} />;
}

function AuthScreen() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setPending(true);
    setError("");
    try {
      const result = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
      if (result.error) throw new Error(result.error.message);
    } catch (cause) {
      setError(explain(cause));
    } finally {
      setPending(false);
    }
  };
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="flex items-center gap-3 text-[#0f6b56]">
        <Mark size={40} />
        <h1 className="text-4xl font-semibold tracking-[0.14em] text-slate-100">{brand.name}</h1>
      </div>
      <p className="mt-4 text-lg">{brand.tagline}</p>
      <p className="mt-2 text-sm text-slate-400">{brand.loginLead}</p>
      <form className="mt-6 grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-card" onSubmit={submit}>
        <Field label="Email"><input className={control} type="email" name="email" autoComplete="username" required /></Field>
        <Field label="Password"><input className={control} type="password" name="password" autoComplete="current-password" minLength={8} required /></Field>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <button disabled={pending} className="min-h-12 rounded-lg bg-amber-500 px-3 py-3 font-semibold text-white disabled:opacity-60" type="submit">
          {pending ? "Please wait…" : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-400">Sign in with the email your community issued. This form does not ask for a mobile number and does not send an OTP. A new password is issued by your community administrator.</p>
    </main>
  );
}

function CommunityApp({ session }) {
  const [memberships, setMemberships] = useState(undefined);
  const [error, setError] = useState("");
  const [communityId, setCommunityId] = useState("");
  const load = () => {
    setError("");
    rows(supabase.from("community_memberships").select("community_id, role, communities(name)").eq("profile_id", session.user.id).eq("status", "active"))
      .then((data) => {
        setMemberships(data);
        setCommunityId((current) => current || data[0]?.community_id || "");
      })
      .catch((cause) => { setMemberships([]); setError(explain(cause)); });
  };
  useEffect(load, [session.user.id]);
  if (memberships === undefined) return <p className="p-6 text-slate-400">Loading your communities…</p>;
  if (error) return <main className="p-6"><PageStatus error={error} onRetry={load} /></main>;
  const mine = memberships.filter((row) => row.community_id === communityId);
  if (!mine.length) return <Setup onCreated={(id) => { setCommunityId(id); load(); }} />;
  const roles = mine.map((row) => row.role);
  return <Shell email={session.user.email} community={mine[0].communities} communities={memberships} communityId={communityId} onCommunity={setCommunityId} roles={roles} onSignOut={() => supabase.auth.signOut()} />;
}

function Setup({ onCreated }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <Wordmark />
      <h1 className="mt-4 text-2xl font-semibold">Set up your community</h1>
      <p className="mt-2 text-sm text-slate-400">Approval limits are required. Leave them as the amounts your community has actually agreed. The statement deadline defaults to the 10th of the next month and can be changed.</p>
      <form className="mt-4 grid gap-3" onSubmit={async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget));
        setPending(true);
        setError("");
        try {
          const id = await rpc("create_community", {
            p_name: data.name,
            p_address: data.address,
            p_city: data.city,
            p_treasurer_limit: data.treasurer,
            p_committee_limit: data.committee,
            p_statement_due_day: data.due || 10,
          });
          onCreated(id);
        } catch (cause) {
          setError(explain(cause));
        } finally {
          setPending(false);
        }
      }}>
        <Field label="Community name"><input className={control} name="name" required /></Field>
        <Field label="Address"><input className={control} name="address" /></Field>
        <Field label="City"><input className={control} name="city" /></Field>
        <Field label="Treasurer can approve up to"><input className={control} name="treasurer" inputMode="decimal" required /></Field>
        <Field label="Committee can approve up to"><input className={control} name="committee" inputMode="decimal" required /></Field>
        <Field label="Statement due day"><input className={control} name="due" type="number" min="1" max="28" defaultValue="10" /></Field>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <button disabled={pending} className="min-h-12 rounded-lg bg-amber-500 px-3 py-3 font-semibold text-white" type="submit">{pending ? "Saving…" : "Create community"}</button>
      </form>
    </main>
  );
}

function navigation(roles) {
  const committee = roles.includes("committee_admin") || roles.includes("platform_admin");
  const treasurer = roles.includes("treasurer");
  if (committee || treasurer) {
    return [
      ["home", "Overview"],
      ...(committee ? [["units", "Residents and Units"]] : []),
      ["finance", "Finance"],
      ["collections", "Collections"],
      ["expenses", "Expenses"],
      ["funds", "Funds"],
      ["reconciliation", "Reconciliation"],
      ["reviews", "Auditor Reviews"],
      ["concerns", "Concerns"],
      ["decisions", "Decisions"],
      ["documents", "Documents"],
      ["notifications", "Notifications"],
      ["settings", "Settings"],
      ["history", "Audit History"],
      ["profile", "Profile"],
    ];
  }
  if (roles.includes("resident_auditor")) {
    return [
      ["home", "Overview"],
      ["finance", "Financial Statements"],
      ["expenses", "Expense Reviews"],
      ["reconciliation", "Reconciliation"],
      ["reviews", "Disputes"],
      ["documents", "Documents"],
      ["history", "Audit History"],
      ["profile", "Profile"],
    ];
  }
  return [
    ["home", "Home"],
    ["finance", "Finance"],
    ["concerns", "Concerns"],
    ["decisions", "Decisions"],
    ["documents", "Documents"],
    ["profile", "Profile"],
  ];
}

function roleLabel(roles) {
  const names = {
    platform_admin: "Platform admin",
    committee_admin: "Committee",
    treasurer: "Treasurer",
    resident_auditor: "Auditor",
    resident: "Resident",
  };
  return roles.map((role) => names[role] || role).join(" · ");
}

function Shell({ email, community, communities, communityId, onCommunity, roles, onSignOut }) {
  const items = navigation(roles);
  const [page, setPage] = useState(items[0][0]);
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = items.slice(0, 4);
  const overflow = items.slice(4);
  const unique = [...new Map(communities.map((row) => [row.community_id, row])).values()];
  const openPage = (id) => { setPage(id); setMoreOpen(false); };
  const itemClass = (id) => `min-h-12 rounded-lg px-3 py-2 text-left text-sm ${page === id ? "bg-[#d7efe8] font-semibold text-[#06281f]" : ""}`;
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 md:grid md:grid-cols-[220px_minmax(0,1fr)]">
      <nav className="hidden border-r border-slate-800 bg-slate-900 p-4 md:block" aria-label="Primary">
        <Wordmark />
        <p className="mt-2 text-sm text-slate-400">{brand.tagline}</p>
        <p className="mt-3 font-semibold">{community?.name}</p>
        <div className="mt-4 grid gap-1">
          {items.map(([id, label]) => (
            <button key={id} type="button" className={itemClass(id)} onClick={() => openPage(id)}>{label}</button>
          ))}
        </div>
      </nav>
      <div className="pb-24 md:pb-8">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-950 px-4 py-3">
          <div className="min-w-0">
            <p className="print:hidden"><Wordmark /></p>
            <p className="hidden text-sm font-semibold print:block">{brand.name} · {brand.promise}</p>
            <p className="mt-1 truncate text-lg font-semibold leading-tight">{community?.name}</p>
            <p className="truncate text-sm text-slate-400">{roleLabel(roles)}</p>
          </div>
          {unique.length > 1 && (
            <select className={`${control} max-w-[46%]`} value={communityId} onChange={(event) => onCommunity(event.target.value)} aria-label="Community">
              {unique.map((row) => <option key={row.community_id} value={row.community_id}>{row.communities?.name}</option>)}
            </select>
          )}
        </header>
        <main className="mx-auto w-full max-w-5xl px-4 py-5">
          <Screen page={page} communityId={communityId} roles={roles} email={email} onSignOut={onSignOut} />
        </main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-800 bg-slate-900 pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Mobile">
        <div className="grid grid-cols-5">
          {primary.map(([id, label]) => (
            <button key={id} type="button" className={`min-h-14 px-1 py-2 text-center text-xs leading-tight ${page === id ? "bg-[#d7efe8] font-semibold text-[#06281f]" : ""}`} onClick={() => openPage(id)}>{label}</button>
          ))}
          <button type="button" className="min-h-14 px-1 py-2 text-center text-xs" aria-expanded={moreOpen} onClick={() => setMoreOpen((open) => !open)}>More</button>
        </div>
        {moreOpen && (
          <div className="absolute bottom-full right-2 mb-2 grid max-h-80 w-52 gap-1 overflow-auto rounded-xl border border-slate-800 bg-slate-900 p-2 shadow-card">
            {overflow.map(([id, label]) => <button key={id} type="button" className={itemClass(id)} onClick={() => openPage(id)}>{label}</button>)}
          </div>
        )}
      </nav>
    </div>
  );
}

function Screen({ page, communityId, roles, email, onSignOut }) {
  if (page === "home") return <HomeScreen communityId={communityId} />;
  if (["finance", "collections", "expenses", "funds", "reconciliation", "reviews"].includes(page)) {
    return <FinanceScreen communityId={communityId} roles={roles} focus={page} />;
  }
  if (page === "concerns") return <ConcernsScreen communityId={communityId} roles={roles} />;
  if (page === "decisions") return <DecisionsScreen communityId={communityId} roles={roles} />;
  if (page === "documents") return <DocumentsScreen communityId={communityId} roles={roles} />;
  if (page === "units") return <UnitsScreen communityId={communityId} />;
  if (page === "notifications") return <NotificationsScreen communityId={communityId} />;
  if (page === "settings") return <SettingsScreen communityId={communityId} />;
  if (page === "history") return <HistoryScreen communityId={communityId} />;
  return <ProfileScreen email={email} roles={roles} onSignOut={onSignOut} />;
}

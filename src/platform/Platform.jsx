import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell, Building2, ClipboardList, Ellipsis, Home, Landmark, LifeBuoy, Megaphone, Users,
} from "lucide-react";
import { isSupabaseConfigured, rpc, rows, supabase, withTimeout } from "./api.js";
import { explain } from "./api.js";
import { isDemoEmail } from "./demo/data.js";
import {
  ADMIN_NAV, RESIDENT_MORE, RESIDENT_TABS, canSeePage, isOpsRole,
} from "./appNav.js";
import {
  AmenitiesScreen, AssetsScreen, AssistantScreen, ConcernsScreen, DecisionsScreen, DocumentsScreen,
  FinanceScreen, HistoryScreen, HomeScreen, NoticesScreen, NotificationsScreen, ProfileScreen,
  SettingsScreen, StaffScreen, UnitsScreen, VisitorsScreen,
} from "./screens.jsx";
import { Field, PageStatus, control, useLoad } from "./ui.jsx";
import { brand } from "../brand.js";
import { passwordRule, signInMessage } from "../lib/authPolicy.js";
import { Mark, Wordmark } from "../brand/Mark.jsx";
import { formatNoticeTime, notificationKind, notificationTarget } from "./notifications.js";
import { copy, navLabel } from "./roleCopy.js";
export default function Platform() {
  if (!isSupabaseConfigured) return <ConfigRequired />;
  return <SignedInApp />;
}

function ConfigRequired() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-[#252525]">
      <div className="flex items-center gap-3 text-[#0878E8]">
        <Mark size={36} />
        <h1 className="text-4xl font-semibold tracking-[0.14em] text-[#031D27]">{brand.name}</h1>
      </div>
      <p className="mt-3 text-lg">{brand.tagline}</p>
      <p className="mt-4 text-[#5C5852]">Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, apply the migration, then sign in. No sample balances are shown.</p>
      <Link className="mt-6 inline-block font-semibold text-[#0878E8]" to="/legacy">Open the earlier screens</Link>
    </main>
  );
}

function SignedInApp() {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    let live = true;
    const finish = (next) => { if (live) setSession(next); };
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) {
          supabase.auth.signOut({ scope: "local" });
          finish(null);
          return;
        }
        finish(data.session ?? null);
      })
      .catch(() => {
        supabase.auth.signOut({ scope: "local" });
        finish(null);
      });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => finish(next));
    return () => { live = false; data.subscription.unsubscribe(); };
  }, []);
  if (session === undefined) return <p className="p-6 text-[#5C5852]">Checking your session…</p>;
  if (!session) return <AuthScreen />;
  return <CommunityApp session={session} />;
}

function AuthScreen() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setPending(true);
    setError("");
    try {
      if (String(data.website || "").trim()) throw new Error("credentials");
      const rule = passwordRule(String(data.password || ""));
      if (rule) throw new Error(rule);
      const result = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
      if (result.error) throw result.error;
    } catch (cause) {
      const text = String(cause?.message || "");
      setError(text === "Use at least 8 characters." ? text : signInMessage(cause));
    } finally {
      setPending(false);
    }
  };
  return (
    <main className="auth-screen">
      <div className="auth-lockup">
        <Mark size={44} />
        <h1>{brand.name}</h1>
      </div>
      <p className="auth-tagline">{brand.tagline}</p>
      <p className="auth-lead">{brand.loginLead}</p>
      <form className="auth-form" onSubmit={submit}>
        <Field label="Email"><input className={control} type="email" name="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></Field>
        <Field label="Password"><input className={control} type="password" name="password" autoComplete="current-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></Field>
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="auth-honeypot" />
        {error && <p role="alert" className="auth-error">{error}</p>}
        <button disabled={pending} type="submit">
          {pending ? "Please wait…" : "Sign in"}
        </button>
      </form>
      <DemoAccounts onPick={(account) => { setEmail(account.email); setPassword(account.password); }} />
      <p className="auth-forgot"><Link to="/reset">Forgot password</Link></p>
      <p className="auth-note">Sign in with the email your community issued. This form does not ask for a phone number or a PIN, and it does not create accounts.</p>
    </main>
  );
}

function DemoAccounts({ onPick }) {
  const [accounts, setAccounts] = useState(null);
  const [sharedPassword, setSharedPassword] = useState("");
  useEffect(() => {
    if (import.meta.env.VITE_ENABLE_DEMO_LOGIN !== "true") return undefined;
    let live = true;
    import("../demoAccounts.js").then((mod) => {
      if (!live) return;
      setAccounts(mod.demoAccounts);
      setSharedPassword(mod.demoPassword);
    });
    return () => { live = false; };
  }, []);
  if (!accounts) return null;
  return (
    <section className="live-panel" style={{ marginTop: 16 }}>
      <h2 className="font-display text-lg font-semibold">Isolated demo accounts</h2>
      <p className="mt-1 text-sm demo-secondary">
        These credentials are for the Palm Court fixture only. After sign-in, open{" "}
        <Link className="font-semibold text-[#0878E8]" to="/demo">/demo</Link>{" "}
        to see device-local sample figures. Live SABHA at <code>/</code> never posts demo money to a ledger.
        Shared password: {sharedPassword}.
      </p>
      <div className="mt-3 grid gap-2">
        {accounts.map((account) => (
          <button
            key={account.email}
            type="button"
            className="demo-text-button"
            style={{ width: "100%", textAlign: "left", minHeight: 48 }}
            onClick={() => onPick(account)}
          >
            {account.role}<span className="mt-0.5 block demo-secondary">{account.email}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function CommunityApp({ session }) {
  // Live product always uses authenticated community memberships and ledger data.
  // Palm Court DemoApp is isolated at /demo and only when VITE_ENABLE_DEMO_LOGIN=true.
  return <LiveCommunity session={session} />;
}

async function loadMyMemberships(userId) {
  // Prefer RPC (no nested embed; avoids PostgREST/RLS hangs on some hosted schemas).
  try {
    const data = await withTimeout(rpc("my_memberships"), 10000, "Loading communities");
    return asMembershipRows(data);
  } catch (rpcError) {
    // Fallback for hosts that have not applied the my_memberships migration yet.
    const plain = await withTimeout(
      rows(
        supabase
          .from("community_memberships")
          .select("community_id, role")
          .eq("profile_id", userId)
          .eq("status", "active"),
      ),
      10000,
      "Loading communities",
    );
    const ids = [...new Set(plain.map((row) => row.community_id).filter(Boolean))];
    let names = {};
    if (ids.length) {
      try {
        const communities = await withTimeout(
          rows(supabase.from("communities").select("id, name").in("id", ids)),
          8000,
          "Loading community names",
        );
        names = Object.fromEntries(communities.map((row) => [row.id, row.name]));
      } catch {
        names = {};
      }
    }
    return plain.map((row) => ({
      community_id: row.community_id,
      role: row.role,
      communities: { name: names[row.community_id] || "Community" },
    }));
  }
}

function asMembershipRows(data) {
  return (Array.isArray(data) ? data : []).map((row) => ({
    community_id: row.community_id,
    role: row.role,
    communities: { name: row.community_name || row.communities?.name || "Community" },
  }));
}

function LiveCommunity({ session }) {
  const [memberships, setMemberships] = useState(undefined);
  const [error, setError] = useState("");
  const [communityId, setCommunityId] = useState("");
  const [slow, setSlow] = useState(false);
  const load = () => {
    setError("");
    setMemberships(undefined);
    setSlow(false);
    const slowTimer = setTimeout(() => setSlow(true), 4000);
    loadMyMemberships(session.user.id)
      .then((data) => {
        setMemberships(data);
        setCommunityId((current) => current || data[0]?.community_id || "");
      })
      .catch((cause) => {
        setMemberships([]);
        setError(explain(cause));
      })
      .finally(() => clearTimeout(slowTimer));
  };
  useEffect(load, [session.user.id]);
  if (memberships === undefined) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-[#252525]">
        <Wordmark />
        <p className="mt-6 text-[#5C5852]">Loading your communities…</p>
        {slow && (
          <p className="mt-3 text-sm text-[#5C5852]">
            This is taking longer than expected. If it stays here, the membership lookup may be blocked or the hosted schema may be missing a migration.
          </p>
        )}
        <button type="button" className="mt-6 min-h-12 border border-[#031D27]/30 bg-white px-3" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
        {slow && (
          <button type="button" className="mt-3 min-h-12 bg-[#0878E8] px-3 font-semibold text-white" onClick={load}>
            Retry
          </button>
        )}
      </main>
    );
  }
  if (error) {
    return (
      <main className="mx-auto max-w-lg p-6 text-[#252525]">
        <PageStatus error={error} onRetry={load} />
        <button type="button" className="mt-4 min-h-12 border border-[#031D27]/30 bg-white px-3" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </main>
    );
  }
  const mine = memberships.filter((row) => row.community_id === communityId);
  if (!mine.length) {
    return (
      <Setup
        email={session.user.email}
        onCreated={(id) => { setCommunityId(id); load(); }}
        onSignOut={() => supabase.auth.signOut()}
      />
    );
  }
  const roles = mine.map((row) => row.role);
  return <Shell email={session.user.email} community={mine[0].communities} communities={memberships} communityId={communityId} onCommunity={setCommunityId} roles={roles} onSignOut={() => supabase.auth.signOut()} />;
}

function Setup({ onCreated, email, onSignOut }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const demo = isDemoEmail(email);
  return (
    <main className="mx-auto max-w-lg px-4 py-10 text-[#252525]">
      <Wordmark />
      <h1 className="mt-4 text-2xl font-semibold text-[#031D27]">No society membership yet</h1>
      <p className="mt-2 text-sm text-[#5C5852]">
        Signed in as {email}. This account is not linked to a community membership in the live ledger.
        {demo
          ? " Demo fixture accounts use the isolated Palm Court preview, or create a real community below."
          : " Create a community below, or ask your committee to invite this email."}
      </p>
      {demo && (
        <p className="mt-3 text-sm">
          <Link className="font-semibold text-[#0878E8]" to="/demo">Open isolated Palm Court demo</Link>
          {" "}(device-local figures only; not live society data).
        </p>
      )}
      <h2 className="mt-8 text-lg font-semibold text-[#031D27]">Create a community</h2>
      <p className="mt-2 text-sm text-[#5C5852]">Approval limits are required. Leave them as the amounts your community has actually agreed. The statement deadline defaults to the 10th of the next month and can be changed.</p>
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
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={pending} className="min-h-12 rounded-lg bg-[#0878E8] px-3 py-3 font-semibold text-white" type="submit">{pending ? "Saving…" : "Create community"}</button>
      </form>
      {onSignOut && (
        <button type="button" className="mt-6 min-h-12 w-full border border-[#031D27]/30 bg-white px-3" onClick={onSignOut}>
          Sign out
        </button>
      )}
    </main>
  );
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

const TAB_ICONS = {
  home: Home,
  visitors: Users,
  finance: Landmark,
  notices: Megaphone,
  concerns: LifeBuoy,
  decisions: Building2,
  amenities: ClipboardList,
};

function readViewMode(roles) {
  try {
    const saved = localStorage.getItem("sabha-view-mode");
    if (saved === "admin" || saved === "resident") return saved;
  } catch { /* ignore */ }
  return isOpsRole(roles) ? "admin" : "resident";
}

function Shell({ email, community, communities, communityId, onCommunity, roles, onSignOut }) {
  const ops = isOpsRole(roles);
  const [mode, setMode] = useState(() => readViewMode(roles));
  const view = ops ? mode : "resident";
  const sidebar = view === "admin"
    ? ADMIN_NAV.filter(([id]) => canSeePage(roles, id)).map(([id]) => [id, navLabel(id, roles, "admin")])
    : RESIDENT_TABS.map(([id]) => [id, navLabel(id, roles, "resident")]);
  const primary = view === "resident"
    ? RESIDENT_TABS.map(([id]) => [id, navLabel(id, roles, "resident")])
    : sidebar.slice(0, 4);
  const overflow = view === "resident"
    ? RESIDENT_MORE.map(([id]) => [id, navLabel(id, roles, "resident")])
    : sidebar.slice(4);
  const [page, setPage] = useState("home");
  const [menu, setMenu] = useState("");
  const notes = useLoad(
    () => rows(supabase.from("notifications").select("id,title,body,event_type,read_at,created_at").eq("community_id", communityId).order("created_at", { ascending: false }).limit(12)),
    [communityId],
  );
  const unread = (notes.data || []).filter((note) => !note.read_at).length;
  const unique = [...new Map(communities.map((row) => [row.community_id, row])).values()];
  const openPage = (id) => { setPage(id); setMenu(""); };
  const current = ["collections", "expenses", "funds", "reconciliation", "reviews", "transactions"].includes(page) ? "finance" : page;
  const initials = String(email || "?")
    .split("@")[0]
    .split(/[._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "?";

  const switchMode = (next) => {
    setMode(next);
    try { localStorage.setItem("sabha-view-mode", next); } catch { /* ignore */ }
    setPage("home");
    setMenu("");
  };

  const openNote = async (note) => {
    if (!note.read_at) {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", note.id);
      notes.reload();
    }
    openPage(notificationTarget(note));
  };

  return (
    <div className={`app-shell ${view === "admin" ? "app-shell-admin" : "app-shell-resident"}`}>
      <aside className="app-sidebar">
        <div className="app-brand">
          <Mark size={40} />
          <strong>{brand.name}</strong>
        </div>
        <p>{brand.tagline}</p>
        <p className="demo-secondary" style={{ color: "#d6f6fa", marginTop: 8 }}>{community?.name}</p>
        <p className="demo-secondary" style={{ color: "#b7ecef", fontSize: 12 }}>{roleLabel(roles)}</p>
        {ops && (
          <div className="app-mode-toggle" role="group" aria-label="App mode">
            <button type="button" aria-pressed={view === "resident"} onClick={() => switchMode("resident")}>{copy.home.myHome}</button>
            <button type="button" aria-pressed={view === "admin"} onClick={() => switchMode("admin")}>{copy.home.manage}</button>
          </div>
        )}
        <nav aria-label={view === "admin" ? "Society admin" : "Resident"} style={{ marginTop: 16 }}>
          {(view === "admin" ? sidebar : [...primary, ...overflow]).map(([id, label]) => (
            <button key={id} type="button" aria-current={page === id ? "page" : undefined} onClick={() => openPage(id)}>
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <div className="app-column">
        <header className="app-header">
          <div className="app-header-title">
            <span className="app-header-mark"><Mark size={36} /></span>
            <span>
              <strong>{brand.name}</strong>
              <small>{community?.name || "Community"}</small>
            </span>
          </div>
          <div className="app-header-actions">
            {unique.length > 1 && (
              <select
                className={control}
                style={{ width: "auto", minHeight: 40, padding: "0 10px", borderRadius: 999, maxWidth: "40vw" }}
                value={communityId}
                onChange={(event) => onCommunity(event.target.value)}
                aria-label="Community"
              >
                {unique.map((row) => (
                  <option key={row.community_id} value={row.community_id}>{row.communities?.name}</option>
                ))}
              </select>
            )}
            <button type="button" className="app-bell" aria-label={unread ? `${unread} unread alerts` : "Alerts"} aria-expanded={menu === "notes"} onClick={() => setMenu((value) => (value === "notes" ? "" : "notes"))}>
              <Bell size={18} aria-hidden="true" />
              {unread > 0 && <span className="app-bell-badge">{unread > 9 ? "9+" : unread}</span>}
            </button>
            <button type="button" className="app-avatar" aria-label="Profile" aria-expanded={menu === "profile"} onClick={() => setMenu((value) => (value === "profile" ? "" : "profile"))}>
              {initials}
            </button>
          </div>
          {menu === "notes" && (
            <div className="app-popover app-popover-wide" role="dialog" aria-label="Alerts">
              <div className="app-popover-head">
                <strong>Alerts</strong>
                {unread > 0 && <span className="record-chip warn">{unread} new</span>}
              </div>
              <PageStatus loading={notes.loading} error={notes.error} onRetry={notes.reload} empty={!notes.loading && !(notes.data || []).length} title="No alerts yet" body="Guest check-ins, payment proofs, and tickets show here." />
              <ul className="app-note-list">
                {(notes.data || []).slice(0, 8).map((note) => (
                  <li key={note.id} className={!note.read_at ? "unread" : undefined}>
                    <button type="button" onClick={() => openNote(note)}>
                      <span>
                        <span className="demo-secondary">{notificationKind(note.event_type)} · {formatNoticeTime(note.created_at)}</span>
                        <br />
                        <strong>{note.title}</strong>
                        <br />
                        <span className="demo-secondary">{note.body}</span>
                      </span>
                      {!note.read_at && <span className="record-chip warn">New</span>}
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => openPage("notifications")}>Open inbox</button>
            </div>
          )}
          {menu === "profile" && (
            <div className="app-popover" role="dialog" aria-label="Profile">
              <p><strong>{roleLabel(roles)}</strong><br />{email}</p>
              {ops && (
                <>
                  <button type="button" onClick={() => switchMode(view === "admin" ? "resident" : "admin")}>
                    {view === "admin" ? copy.home.myHome : copy.home.manage}
                  </button>
                </>
              )}
              <button type="button" onClick={() => openPage("profile")}>Profile</button>
              <button type="button" onClick={onSignOut}>Sign out</button>
            </div>
          )}
        </header>
        {ops && (
          <div className="app-mode-bar" role="group" aria-label="App mode">
            <button type="button" aria-pressed={view === "resident"} onClick={() => switchMode("resident")}>{copy.home.myHome}</button>
            <button type="button" aria-pressed={view === "admin"} onClick={() => switchMode("admin")}>{copy.home.manage}</button>
          </div>
        )}
        {view === "admin" && (
          <nav className="app-admin-strip" aria-label="Society admin">
            {sidebar.map(([id, label]) => (
              <button key={id} type="button" aria-current={(id === "finance" ? current === "finance" : page === id) ? "page" : undefined} onClick={() => openPage(id)}>
                {label}
              </button>
            ))}
          </nav>
        )}
        <p className="app-note record-context">{roleLabel(roles)} · {email}</p>
        <main className="app-main">
          <Screen page={page} communityId={communityId} roles={roles} email={email} onSignOut={onSignOut} onOpen={openPage} view={view} />
        </main>
      </div>
      {view === "resident" && (
        <nav className="app-tabbar" aria-label="Mobile">
          {primary.map(([id, label]) => {
            const Icon = TAB_ICONS[id] || Home;
            return (
              <button key={id} type="button" aria-current={current === id ? "page" : undefined} onClick={() => openPage(id)}>
                <Icon size={20} aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
          <button
            type="button"
            aria-current={menu === "more" || overflow.some(([id]) => id === page) ? "page" : undefined}
            aria-expanded={menu === "more"}
            onClick={() => setMenu((value) => (value === "more" ? "" : "more"))}
          >
            <Ellipsis size={20} aria-hidden="true" />
            <span>More</span>
          </button>
          {menu === "more" && (
            <div className="app-more-sheet" role="dialog" aria-label="More">
              {overflow.map(([id, label]) => (
                <button key={id} type="button" aria-current={page === id ? "page" : undefined} onClick={() => openPage(id)}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </nav>
      )}
    </div>
  );
}

function Screen({ page, communityId, roles, email, onSignOut, onOpen, view }) {
  if (page === "home") return <HomeScreen communityId={communityId} roles={roles} onOpen={onOpen} view={view} />;
  if (["finance", "collections", "expenses", "funds", "reconciliation", "reviews", "transactions"].includes(page)) {
    return <FinanceScreen communityId={communityId} roles={roles} focus={page} />;
  }
  if (page === "concerns") return <ConcernsScreen communityId={communityId} roles={roles} />;
  if (page === "decisions") return <DecisionsScreen communityId={communityId} roles={roles} />;
  if (page === "notices") return <NoticesScreen communityId={communityId} roles={roles} />;
  if (page === "visitors") return <VisitorsScreen communityId={communityId} roles={roles} />;
  if (page === "amenities") return <AmenitiesScreen communityId={communityId} roles={roles} />;
  if (page === "assets") return <AssetsScreen communityId={communityId} roles={roles} />;
  if (page === "staff") return <StaffScreen communityId={communityId} roles={roles} />;
  if (page === "assistant") return <AssistantScreen communityId={communityId} />;
  if (page === "documents") return <DocumentsScreen communityId={communityId} roles={roles} />;
  if (page === "units") return <UnitsScreen communityId={communityId} />;
  if (page === "notifications") return <NotificationsScreen communityId={communityId} onOpen={onOpen} />;
  if (page === "settings") return <SettingsScreen communityId={communityId} roles={roles} />;
  if (page === "history") return <HistoryScreen communityId={communityId} />;
  return <ProfileScreen email={email} roles={roles} onSignOut={onSignOut} />;
}

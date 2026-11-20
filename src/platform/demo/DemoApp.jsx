import { useReducer, useState } from "react";
import { NavLink, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { Bell, Building2, Ellipsis, Home, Landmark, LifeBuoy } from "lucide-react";
import { brand } from "../../brand.js";
import { Mark } from "../../brand/Mark.jsx";
import {
  collectionSnapshot,
  community,
  createDemoState,
  funds,
  meetings,
  months,
  notices,
  personaFromEmail,
} from "./data.js";
import { DemoProvider, useDemo } from "./context.js";
import { Community } from "./Community.jsx";
import { Concerns } from "./Concerns.jsx";
import { Finance } from "./Finance.jsx";
import { More } from "./More.jsx";
import { Meter, MonthChart, rupee } from "./ui.jsx";

const NAV = [
  ["/", "Home", Home],
  ["/community", "Community", Building2],
  ["/finance", "Finance", Landmark],
  ["/concerns", "Concerns", LifeBuoy],
  ["/more", "More", Ellipsis],
];

function reducer(state, action) {
  if (action.type === "month") return { ...state, monthId: action.id, notice: "" };
  if (action.type === "approve") {
    return {
      ...state,
      notice: "Recorded in this demo. The community ledger was not changed.",
      expenses: state.expenses.map((row) => row.id !== action.id ? row : {
        ...row,
        approval: "Approved",
        history: [...row.history, { id: `${row.id}-demo`, at: "2026-11-19", by: action.by, action: "Approved in this demo" }],
      }),
    };
  }
  if (action.type === "vote") {
    return {
      ...state,
      votes: [...state.votes, action.id],
      polls: state.polls.map((poll) => poll.id === action.id ? { ...poll, yes: poll.yes + 1 } : poll),
      notice: "Your vote is counted on this device only.",
    };
  }
  if (action.type === "book") {
    return {
      ...state,
      notice: "Booking kept in this demo. No amenity register was updated.",
      bookings: [...state.bookings, { id: `book-${state.bookings.length + 1}`, amenity: "Clubhouse", flat: "A-402", when: "20 November 2026, 18:00", purpose: "Demo booking" }],
    };
  }
  if (action.type === "visitor") {
    return {
      ...state,
      notice: "Guest expectation kept in this demo.",
      visitors: [...state.visitors, { id: `vis-${state.visitors.length + 1}`, name: "Guest of A-402", flat: "A-402", when: "19 November, 20:15", kind: "Guest" }],
    };
  }
  if (action.type === "reply") {
    return {
      ...state,
      notice: "Reply saved in this demo.",
      concerns: state.concerns.map((item) => item.id !== action.id ? item : {
        ...item,
        responses: [...item.responses, { at: "19 November 2026", by: action.by, text: action.text }],
      }),
    };
  }
  if (action.type === "pay") {
    return {
      ...state,
      notice: "Payment recorded in this demo. No bank or ledger was updated.",
      invoices: state.invoices.map((row) => row.id !== action.id ? row : {
        ...row,
        status: "Paid",
        paid: row.billed,
        outstanding: 0,
        receipt: `DEMO-RCPT-${row.flat}`,
        paidOn: "19 November 2026",
      }),
    };
  }
  if (action.type === "raise") {
    const id = `con-demo-${state.concerns.length + 1}`;
    return {
      ...state,
      notice: "Concern saved in this demo. Nothing was written to a community ticket register.",
      concerns: [{
        id,
        title: action.title,
        description: action.description,
        category: action.category,
        visibility: action.visibility,
        status: "Open",
        priority: "Normal",
        raisedOn: "19 November 2026",
        raisedBy: action.by,
        flat: action.flat,
        assignee: "Unassigned",
        responses: [],
      }, ...state.concerns],
    };
  }
  if (action.type === "expense") {
    const id = `exp-demo-${state.expenses.length + 1}`;
    return {
      ...state,
      notice: "Expense draft kept in this demo. The community ledger was not changed.",
      expenses: [{
        id,
        date: "19 November 2026",
        description: action.description,
        category: action.category,
        amount: action.amount,
        approval: "Pending committee",
        payment: "Awaiting payment",
        document: action.document || "Demo attachment",
        history: [{ id: `${id}-sub`, at: "2026-11-19", by: action.by, action: "Submitted in this demo" }],
      }, ...state.expenses],
    };
  }
  if (action.type === "observe") {
    return {
      ...state,
      notice: "Audit observation saved in this demo.",
      observation: action.text,
      observationHistory: [...(state.observationHistory || []), { at: "19 November 2026", by: action.by, text: action.text }],
    };
  }
  if (action.type === "invite") {
    return {
      ...state,
      notice: "Invitation kept in this demo. No email was sent and no membership was created.",
      invitations: [...(state.invitations || []), {
        id: `inv-${(state.invitations || []).length + 1}`,
        email: action.email,
        role: action.role,
        status: "Demo only",
        createdOn: "19 November 2026",
      }],
    };
  }
  return state;
}

export function DemoApp({ email, onSignOut }) {
  const person = personaFromEmail(email);
  const [state, dispatch] = useReducer(reducer, null, () => ({ ...createDemoState(), votes: [] }));
  return (
    <DemoProvider value={{ person, state, dispatch, onSignOut }}>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<HomeScreen />} />
          <Route path="community" element={<Community />} />
          <Route path="finance" element={<Finance />} />
          <Route path="concerns" element={<Concerns />} />
          <Route path="more" element={<More />} />
        </Route>
      </Routes>
    </DemoProvider>
  );
}

function Shell() {
  const { person, onSignOut } = useDemo();
  const [menu, setMenu] = useState("");
  const close = () => setMenu("");
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-brand">
          <Mark size={40} />
          <strong>{brand.name}</strong>
        </div>
        <p>{brand.tagline}</p>
        <nav aria-label="Primary">
          {NAV.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === "/"} onClick={close}>
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="app-column">
        <header className="app-header">
          <div className="app-header-title">
            <span className="app-header-mark"><Mark size={36} /></span>
            <span>
              <strong>{brand.name}</strong>
              <small>{community.name}</small>
            </span>
          </div>
          <div className="app-header-actions">
            <button type="button" aria-label="Notifications" aria-expanded={menu === "notes"} onClick={() => setMenu((current) => current === "notes" ? "" : "notes")}>
              <Bell size={18} aria-hidden="true" />
            </button>
            <button type="button" className="app-avatar" aria-label="Profile" aria-expanded={menu === "profile"} onClick={() => setMenu((current) => current === "profile" ? "" : "profile")}>
              {person.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
            </button>
          </div>
          {menu === "notes" && (
            <div className="app-popover" role="dialog" aria-label="Notifications">
              {notices.map((notice) => <p key={notice.id}><strong>{notice.title}</strong><br />{notice.date}</p>)}
              <button type="button" onClick={close}>Close</button>
            </div>
          )}
          {menu === "profile" && (
            <div className="app-popover" role="dialog" aria-label="Profile">
              <p><strong>{person.name}</strong><br />{person.label} · {person.flat}</p>
              <button type="button" onClick={onSignOut}>Sign out</button>
            </div>
          )}
        </header>
        <p className="app-note">Demo mode. Palm Court figures stay on this device and are not written to a community ledger.</p>
        <main className="app-main">
          <Outlet />
        </main>
      </div>
      <nav className="app-tabbar" aria-label="Mobile">
        {NAV.map(([to, label, Icon]) => (
          <NavLink key={to} to={to} end={to === "/"} onClick={close}>
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function HomeScreen() {
  const { person, state } = useDemo();
  const navigate = useNavigate();
  const snapshot = collectionSnapshot(state.invoices);
  const month = months.find((item) => item.id === state.monthId) || months.at(-1);
  const recent = state.expenses.slice(0, 5);
  const meeting = meetings.find((item) => item.status === "Upcoming");
  const openFinance = (tab, extra = {}) => {
    const params = new URLSearchParams({ tab, ...extra });
    navigate(`/finance?${params.toString()}`);
  };
  const openCommunity = (tab, extra = {}) => {
    const params = new URLSearchParams({ tab, ...extra });
    navigate(`/community?${params.toString()}`);
  };
  return (
    <section className="dash">
      <header className="dash-welcome">
        <h1>{person.name.split(" ")[0]}, November is {snapshot.efficiency}% collected.</h1>
        <p>{community.name} · {community.city} · {month.label}</p>
      </header>
      <div className="metric-grid">
        <button type="button" className="metric" onClick={() => openFinance("Maintenance", { status: "Paid" })}>
          <span>Collected</span><strong>{rupee(snapshot.collected)}</strong>
        </button>
        <button type="button" className="metric" onClick={() => openFinance("Maintenance", { status: "Due" })}>
          <span>Outstanding</span><strong>{rupee(snapshot.outstanding)}</strong>
        </button>
        <button type="button" className="metric" onClick={() => openFinance("Transactions")}>
          <span>Expenses</span><strong>{rupee(month.expenses)}</strong>
        </button>
        <button type="button" className="metric" onClick={() => openFinance("Overview")}>
          <span>Bank balance</span><strong>{rupee(funds.bank)}</strong>
        </button>
        <button type="button" className="metric" onClick={() => openFinance("Reports")}>
          <span>Corpus</span><strong>{rupee(funds.corpus)}</strong>
        </button>
        <button type="button" className="metric" onClick={() => openFinance("Reports")}>
          <span>Reserve</span><strong>{rupee(funds.reserve)}</strong>
        </button>
      </div>
      <div className="dash-grid">
        <article className="card">
          <h2>Collection progress</h2>
          <Meter value={snapshot.collected} max={snapshot.billed} label="November maintenance collection" />
          <p>{rupee(snapshot.collected)} of {rupee(snapshot.billed)} billed. Maintenance is {rupee(community.maintenancePerUnit)} per occupied unit.</p>
          <button type="button" className="demo-text-button" onClick={() => openFinance("Maintenance")}>Open maintenance register</button>
        </article>
        <article className="card">
          <h2>Income and expenditure</h2>
          <MonthChart months={months} activeId={month.id} />
          <button type="button" className="demo-text-button" onClick={() => openFinance("Reports")}>Open finance reports</button>
        </article>
      </div>
      <div className="dash-grid">
        <article className="card">
          <h2>Recent transactions</h2>
          <ul className="demo-link-list">
            {recent.map((row) => (
              <li key={row.id}>
                <button type="button" className="demo-text-button" onClick={() => openFinance("Transactions", { expense: row.id })}>
                  {row.date} · {row.description} · {rupee(row.amount)}
                </button>
              </li>
            ))}
          </ul>
        </article>
        <article className="card">
          <h2>Announcements</h2>
          <button type="button" className="demo-text-button" onClick={() => openCommunity("Notices", { notice: notices[0].id })}>
            <strong>{notices[0].title}</strong>
            <br />
            <span className="demo-secondary">{notices[0].body}</span>
          </button>
          <h2>Upcoming meeting</h2>
          <button type="button" className="demo-text-button" onClick={() => openCommunity("Meetings", { meeting: meeting.id })}>
            {meeting.title} · {meeting.when} · {meeting.venue}
          </button>
          <button type="button" className="demo-text-button" onClick={() => navigate("/concerns")}>Open concerns register</button>
        </article>
      </div>
    </section>
  );
}

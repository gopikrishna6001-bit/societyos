import { useReducer, useState } from "react";
import { NavLink, Outlet, Route, Routes } from "react-router-dom";
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
import { Meter, rupee } from "./ui.jsx";

const NAV = [
  ["/", "Home", Home],
  ["/community", "Community", Building2],
  ["/finance", "Bills", Landmark],
  ["/concerns", "Complaints", LifeBuoy],
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
        <p className="app-note">ISOLATED DEMO — Palm Court fixture only. Figures stay on this device and are never written to a community ledger. Live SABHA is at <a href="/">/</a>.</p>
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
  const snapshot = collectionSnapshot();
  const month = months.find((item) => item.id === state.monthId) || months.at(-1);
  const recent = state.expenses.slice(-5).reverse();
  const meeting = meetings.find((item) => item.status === "Upcoming");
  return (
    <section className="record">
      <header className="record-hero">
        <h1>Hi {person.name.split(" ")[0]}</h1>
        <p>Pay dues, raise a complaint, or check notices.</p>
      </header>
      <div className="record-shortcuts" role="navigation" aria-label="Quick actions">
        <NavLink to="/finance">Pay maintenance</NavLink>
        <NavLink to="/concerns">Raise complaint</NavLink>
        <NavLink to="/more">Book hall</NavLink>
        <NavLink to="/community">Invite guest</NavLink>
        <NavLink to="/community">Notices</NavLink>
        <NavLink to="/community">Meetings</NavLink>
      </div>
      <div className="record-band">
        <h2>Your dues</h2>
        <p className="record-meta">{rupee(snapshot.outstanding)} still due · {month.label}</p>
        <Meter value={snapshot.collected} max={snapshot.billed} label="November maintenance collection" />
        <p className="record-meta">{rupee(snapshot.collected)} of {rupee(snapshot.billed)} paid by the society this month.</p>
      </div>
      <div className="record-panel">
        <h2>Notices</h2>
        <p><strong>{notices[0].title}</strong></p>
        <p className="record-meta">{notices[0].body}</p>
        <p className="record-meta" style={{ marginTop: 12 }}><strong>Next meeting</strong> · {meeting.title} · {meeting.when}</p>
      </div>
      {person.role !== "resident" && (
        <div className="record-panel">
          <h2>Recent expenses</h2>
          <ul>{recent.map((row) => <li key={row.id}>{row.date} · {row.description} · {rupee(row.amount)}</li>)}</ul>
          <p className="record-meta">Bank {rupee(funds.bank)} · Corpus {rupee(funds.corpus)}</p>
        </div>
      )}
    </section>
  );
}

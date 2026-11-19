import { useReducer, useState } from "react";
import { Building2, Ellipsis, Home, Landmark, LifeBuoy } from "lucide-react";
import { brand } from "../../brand.js";
import { rupee } from "./ui.jsx";
import {
  bankClosings,
  collectionSnapshot,
  community,
  concerns,
  createDemoState,
  meetings,
  months,
  notices,
  personaFromEmail,
  statement,
  visibleConcerns,
} from "./data.js";
import { Community } from "./Community.jsx";
import { Concerns } from "./Concerns.jsx";
import { Finance } from "./Finance.jsx";
import { More } from "./More.jsx";
import { Meter, MonthChart } from "./ui.jsx";

const NAV = [
  ["home", "Home", Home],
  ["community", "Community", Building2],
  ["finance", "Finance", Landmark],
  ["concerns", "Concerns", LifeBuoy],
  ["more", "More", Ellipsis],
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
  const [page, setPage] = useState("home");
  const open = visibleConcerns(state.concerns, person).filter((item) => item.status !== "Resolved").length;
  const pending = state.expenses.filter((row) => row.approval === "Pending committee");
  return (
    <div className="demo-shell">
      <p className="demo-banner">Demo mode. Palm Court figures stay on this device and are not written to a community ledger. <button type="button" className="demo-text-button" onClick={onSignOut}>Sign out</button></p>
      <div className="demo-layout">
        <nav className="demo-rail" aria-label="Primary">
          <strong>{brand.name}</strong>
          <span>{brand.tagline}</span>
          <span>{community.name}</span>
          <span>{person.label}</span>
          {NAV.map(([id, label, Icon]) => (
            <button key={id} type="button" aria-current={page === id ? "page" : undefined} onClick={() => setPage(id)}>
              <Icon size={18} aria-hidden="true" /> {label}
            </button>
          ))}
        </nav>
        <main className="demo-main">
          {page === "home" && <HomeScreen person={person} state={state} pending={pending} openConcerns={open} onOpen={setPage} />}
          {page === "community" && <Community state={state} dispatch={dispatch} />}
          {page === "finance" && <Finance state={state} dispatch={dispatch} person={person} />}
          {page === "concerns" && <Concerns state={state} dispatch={dispatch} person={person} />}
          {page === "more" && <More person={person} onSignOut={onSignOut} />}
        </main>
      </div>
      <nav className="demo-mobile-nav" aria-label="Mobile">
        {NAV.map(([id, label, Icon]) => (
          <button key={id} type="button" aria-current={page === id ? "page" : undefined} onClick={() => setPage(id)}>
            <Icon size={20} aria-hidden="true" /> {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function HomeScreen({ person, state, pending, openConcerns, onOpen }) {
  const snapshot = collectionSnapshot();
  const month = months.find((item) => item.id === state.monthId) || months.at(-1);
  const recent = state.expenses.slice(-5).reverse();
  const meeting = meetings.find((item) => item.status === "Upcoming");
  const banks = bankClosings();
  return (
    <section>
      <div className="demo-band">
        <h1>{person.name.split(" ")[0]}, November is {snapshot.efficiency}% collected.</h1>
        <p>{community.name} · {community.city} · {community.monthLabel}</p>
        <dl className="demo-facts">
          <div><dt>Units</dt><dd>{community.units}</dd></div>
          <div><dt>Occupied</dt><dd>{community.occupied}</dd></div>
          <div><dt>Vacant</dt><dd>{community.vacant}</dd></div>
          <div><dt>Residents</dt><dd>{community.residents}</dd></div>
          <div><dt>Staff</dt><dd>{community.staffCount}</dd></div>
        </dl>
      </div>
      <section className="demo-panel">
        <h2>November collection</h2>
        <Meter value={snapshot.collected} max={snapshot.billed} label="November maintenance collection" />
        <p>{rupee(snapshot.collected)} collected of {rupee(snapshot.billed)} billed. {rupee(snapshot.outstanding)} is still outstanding. Maintenance is {rupee(community.maintenancePerUnit)} per occupied unit.</p>
      </section>
      <div className="demo-split">
        <section className="demo-panel">
          <h2>Collection and expenditure</h2>
          <MonthChart months={months} activeId={month.id} />
          <p className="demo-secondary">The highlighted month follows the reporting period in Finance. November expenses are the 20 itemised transactions.</p>
        </section>
        <section className="demo-panel">
          <h2>Where the money sits</h2>
          <p>Operating bank {rupee(1875000)}. Corpus {rupee(3250000)}. Reserve {rupee(840000)}.</p>
          <p className="demo-secondary">November added {rupee(month.collected - month.expenses)} to the operating bank. The bank trend closes at {rupee(banks.at(-1).closing)}.</p>
          <h2>Pending actions</h2>
          {pending.length === 0 ? <p>No expenses are waiting.</p> : pending.map((row) => <p key={row.id}>{row.description} · {rupee(row.amount)}</p>)}
          <button type="button" className="demo-primary" onClick={() => onOpen("finance")}>Open finance</button>
        </section>
      </div>
      <div className="demo-split">
        <section className="demo-panel">
          <h2>Recent transactions</h2>
          <ul>{recent.map((row) => <li key={row.id}>{row.date} · {row.description} · {rupee(row.amount)} · {row.approval}</li>)}</ul>
          <h2>Latest notice</h2>
          <p>{notices[0].title}. {notices[0].body}</p>
        </section>
        <section className="demo-panel">
          <h2>Coming up</h2>
          <p>{meeting.title} · {meeting.when} · {meeting.venue}</p>
          <h2>Concerns and publication</h2>
          <p>{openConcerns} open concerns visible to you. {concerns.filter((item) => item.visibility === "Public" && item.status !== "Resolved").length} of the public ones are still open.</p>
          <p>November statement: {statement.status}. Due {statement.due}.</p>
          <p>{statement.observation}</p>
          <div className="demo-actions">
            <button type="button" onClick={() => onOpen("concerns")}><LifeBuoy size={16} aria-hidden="true" /> Review concerns</button>
            <button type="button" onClick={() => onOpen("community")}><Building2 size={16} aria-hidden="true" /> Open community</button>
            <button type="button" onClick={() => onOpen("more")}><Landmark size={16} aria-hidden="true" /> Read documents</button>
          </div>
        </section>
      </div>
    </section>
  );
}

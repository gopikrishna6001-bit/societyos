import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { amenities, buildHouseholds, committee, flats, meetings, notices, resolutions, staff } from "./data.js";
import { Empty } from "./ui.jsx";

const TABS = ["Directory", "Units", "Committee", "Staff", "Notices", "Meetings", "Polls", "Amenities", "Visitors"];

export function Community({ state, dispatch }) {
  const [tab, setTab] = useState("Directory");
  const [query, setQuery] = useState("");
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const people = useMemo(() => buildHouseholds(), []);
  const homes = useMemo(() => flats(), []);
  const found = people.filter((person) => `${person.name} ${person.flat}`.toLowerCase().includes(query.trim().toLowerCase()));
  const unitRows = homes.filter((flat) => flat.toLowerCase().includes(query.trim().toLowerCase()));
  const notice = notices.find((item) => item.id === selectedNotice);
  const meeting = meetings.find((item) => item.id === selectedMeeting);

  return (
    <section>
      <h1>Community</h1>
      <p className="demo-secondary">Fictional residents of Palm Court. No phone numbers are stored in this preview.</p>
      <div className="demo-tabs" role="tablist" aria-label="Community">
        {TABS.map((name) => <button key={name} type="button" role="tab" aria-selected={tab === name} onClick={() => { setTab(name); setSelectedNotice(null); setSelectedMeeting(null); }}>{name}</button>)}
      </div>
      <div className="demo-panel">
        {tab === "Directory" && (
          <>
            <h2>Resident directory</h2>
            <input aria-label="Search residents" placeholder="Search a name or flat" value={query} onChange={(event) => setQuery(event.target.value)} />
            {found.length === 0 && <Empty title="No resident matches" body="Try a flat such as A-402." />}
            <ul>
              {found.slice(0, 20).map((person) => <li key={person.id}>{person.name} · {person.flat} · {person.relationship}</li>)}
            </ul>
            <p className="demo-secondary">{people.length} residents across 108 occupied homes. Showing {Math.min(20, found.length)} matches.</p>
          </>
        )}
        {tab === "Units" && (
          <>
            <h2>Units and occupancy</h2>
            <input aria-label="Search units" placeholder="Search a unit" value={query} onChange={(event) => setQuery(event.target.value)} />
            <ul>
              {unitRows.slice(0, 30).map((flat) => {
                const occupied = homes.indexOf(flat) < 108;
                return <li key={flat}>{flat} · {occupied ? "Occupied" : "Vacant"}</li>;
              })}
            </ul>
            <p className="demo-secondary">120 units. D-701 through D-1003 are the 12 vacant homes.</p>
          </>
        )}
        {tab === "Committee" && (
          <>
            <h2>Committee</h2>
            <ul>{committee.map((member) => <li key={member.name}><strong>{member.name}</strong>, {member.title} · {member.flat}. {member.focus}</li>)}</ul>
          </>
        )}
        {tab === "Staff" && (
          <>
            <h2>Staff</h2>
            <ul>{staff.map((member) => <li key={member.id}>{member.name} · {member.role}</li>)}</ul>
          </>
        )}
        {tab === "Notices" && (notice ? (
          <article>
            <button type="button" className="demo-text-button" onClick={() => setSelectedNotice(null)}><ArrowLeft size={16} aria-hidden="true" /> All notices</button>
            <h2>{notice.title}</h2>
            <p>{notice.date}</p>
            <p>{notice.body}</p>
          </article>
        ) : (
          <>
            <h2>Notices</h2>
            {notices.map((item) => <button key={item.id} type="button" className="demo-row" onClick={() => setSelectedNotice(item.id)}><span>{item.title}<br /><span className="demo-secondary">{item.date}</span></span></button>)}
          </>
        ))}
        {tab === "Meetings" && (meeting ? (
          <article>
            <button type="button" className="demo-text-button" onClick={() => setSelectedMeeting(null)}><ArrowLeft size={16} aria-hidden="true" /> All meetings</button>
            <h2>{meeting.title}</h2>
            <p>{meeting.when} · {meeting.venue} · {meeting.status}</p>
            <h3>Agenda</h3>
            <ul>{meeting.agenda.map((item) => <li key={item}>{item}</li>)}</ul>
            <h3>Resolutions</h3>
            <ul>{resolutions.filter((item) => item.meeting === meeting.title).map((item) => <li key={item.id}>{item.title} · {item.result} · {item.date}</li>)}</ul>
            {meeting.actions.length > 0 && (
              <>
                <h3>Action items</h3>
                <ul>{meeting.actions.map((item) => <li key={item.item}>{item.item} · {item.owner} · {item.state}</li>)}</ul>
              </>
            )}
          </article>
        ) : (
          <>
            <h2>Meetings</h2>
            {meetings.map((item) => <button key={item.id} type="button" className="demo-row" onClick={() => setSelectedMeeting(item.id)}><span>{item.title}<br /><span className="demo-secondary">{item.when} · {item.status}</span></span></button>)}
          </>
        ))}
        {tab === "Polls" && (
          <>
            <h2>Polls</h2>
            {state.polls.map((poll) => (
              <article key={poll.id}>
                <h3>{poll.question}</h3>
                <p>{poll.status} · closes {poll.closes} · Yes {poll.yes} · No {poll.no}</p>
                {poll.status === "Open" && !state.votes.includes(poll.id) && (
                  <button type="button" className="demo-primary" onClick={() => dispatch({ type: "vote", id: poll.id })}>Vote yes in this demo</button>
                )}
                {state.votes.includes(poll.id) && <p>Your demo vote was counted on this device.</p>}
              </article>
            ))}
          </>
        )}
        {tab === "Amenities" && (
          <>
            <h2>Amenities and bookings</h2>
            {amenities.map((amenity) => (
              <article key={amenity.id}>
                <h3>{amenity.name}</h3>
                <p>{amenity.note}</p>
                {amenity.slots.length > 0 && <p>Open slots: {amenity.slots.join(", ")}</p>}
              </article>
            ))}
            <h3>Bookings</h3>
            <ul>{state.bookings.map((booking) => <li key={booking.id}>{booking.when} · {booking.amenity} · {booking.flat} · {booking.purpose}</li>)}</ul>
            <button type="button" className="demo-primary" onClick={() => dispatch({ type: "book" })}>Book the clubhouse in this demo</button>
          </>
        )}
        {tab === "Visitors" && (
          <>
            <h2>Visitors and deliveries</h2>
            <ul>{state.visitors.map((visit) => <li key={visit.id}>{visit.when} · {visit.kind} · {visit.name} · {visit.flat}</li>)}</ul>
            <button type="button" className="demo-primary" onClick={() => dispatch({ type: "visitor" })}>Expect a guest in this demo</button>
          </>
        )}
      </div>
    </section>
  );
}

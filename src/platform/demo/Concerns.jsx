import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { visibleConcerns } from "./data.js";
import { useDemo } from "./context.js";
import { Empty, Notice } from "./ui.jsx";

export function Concerns() {
  const { state, dispatch, person } = useDemo();
  const [status, setStatus] = useState("All");
  const [selected, setSelected] = useState(null);
  const [compose, setCompose] = useState(false);
  const visible = visibleConcerns(state.concerns, person).filter((item) => status === "All" || item.status === status);
  const concern = visible.find((item) => item.id === selected);
  const canManage = ["committee_admin", "platform_admin"].includes(person.role);
  return (
    <section>
      <h1>Concerns</h1>
      <p className="demo-secondary">{person.role === "resident" ? "You see public concerns and private concerns raised from your flat." : "This role can see public and private concerns."}</p>
      <Notice>{state.notice}</Notice>
      <div className="demo-filters">
        <select aria-label="Concern status" value={status} onChange={(event) => { setStatus(event.target.value); setSelected(null); }}>
          {["All", "Open", "In progress", "Assigned", "Resolved"].map((item) => <option key={item}>{item}</option>)}
        </select>
        <button type="button" className="demo-primary" onClick={() => { setCompose(true); setSelected(null); }}>Raise a concern</button>
      </div>
      <div className="demo-panel">
        {compose && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const data = Object.fromEntries(new FormData(event.currentTarget));
              dispatch({
                type: "raise",
                title: String(data.title || "").trim(),
                description: String(data.description || "").trim(),
                category: String(data.category || "General"),
                visibility: String(data.visibility || "Public"),
                by: person.name,
                flat: person.flat,
              });
              setCompose(false);
              event.currentTarget.reset();
            }}
          >
            <h2>Raise a demo concern</h2>
            <label htmlFor="concern-title">Title</label>
            <input id="concern-title" name="title" required autoComplete="off" />
            <label htmlFor="concern-description">Description</label>
            <textarea id="concern-description" name="description" rows={4} required />
            <label htmlFor="concern-category">Category</label>
            <select id="concern-category" name="category" defaultValue="General">
              {["Maintenance", "Water", "Electricity", "Security", "Finance", "General"].map((item) => <option key={item}>{item}</option>)}
            </select>
            <label htmlFor="concern-visibility">Visibility</label>
            <select id="concern-visibility" name="visibility" defaultValue="Public">
              <option>Public</option>
              <option>Private</option>
            </select>
            <button type="submit" className="demo-primary">Save on this device</button>
            <button type="button" className="demo-text-button" onClick={() => setCompose(false)}>Cancel</button>
          </form>
        )}
        {concern ? (
          <article>
            <button type="button" className="demo-text-button" onClick={() => setSelected(null)}><ArrowLeft size={16} aria-hidden="true" /> All concerns</button>
            <h2>{concern.title}</h2>
            <p><span className="demo-status">{concern.visibility}</span><span className="demo-status">{concern.status}</span><span className="demo-status">{concern.priority}</span></p>
            <p>{concern.category} · raised {concern.raisedOn} by {concern.raisedBy}, {concern.flat}</p>
            <p>{concern.description}</p>
            <p>Assigned to {concern.assignee}.</p>
            <h3>Response history</h3>
            <ol>{concern.responses.map((response) => <li key={`${response.at}-${response.by}`}>{response.at} · {response.by}: {response.text}</li>)}</ol>
            <form onSubmit={(event) => {
              event.preventDefault();
              const text = new FormData(event.currentTarget).get("reply");
              dispatch({ type: "reply", id: concern.id, by: person.name, text });
              event.currentTarget.reset();
            }}>
              <label htmlFor="reply">{canManage ? "Respond or update status note" : "Add a demo reply"}</label>
              <input id="reply" name="reply" required />
              <button type="submit" className="demo-primary">Save reply on this device</button>
            </form>
          </article>
        ) : !compose && (visible.length === 0 ? <Empty title="No concerns in this view" body="Choose another status. Private items stay hidden from residents of other flats." /> : visible.map((item) => (
          <button key={item.id} type="button" className="demo-row" onClick={() => setSelected(item.id)}>
            <span>{item.title}<br /><span className="demo-secondary">{item.category} · {item.raisedOn} · {item.assignee}</span></span>
            <span className="demo-status">{item.visibility}</span>
          </button>
        )))}
      </div>
    </section>
  );
}

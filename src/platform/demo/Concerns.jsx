import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { visibleConcerns } from "./data.js";
import { useDemo } from "./context.js";
import { Empty } from "./ui.jsx";

export function Concerns() {
  const { state, dispatch, person } = useDemo();
  const [status, setStatus] = useState("All");
  const [selected, setSelected] = useState(null);
  const visible = visibleConcerns(state.concerns, person).filter((item) => status === "All" || item.status === status);
  const concern = visible.find((item) => item.id === selected);
  return (
    <section>
      <h1>Concerns</h1>
      <p className="demo-secondary">{person.role === "resident" ? "You see public concerns and private concerns raised from your flat." : "This role can see public and private concerns."}</p>
      <div className="demo-filters">
        <select aria-label="Concern status" value={status} onChange={(event) => { setStatus(event.target.value); setSelected(null); }}>
          {["All", "Open", "In progress", "Assigned", "Resolved"].map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <div className="demo-panel">
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
              <label htmlFor="reply">Add a demo reply</label>
              <input id="reply" name="reply" required />
              <button type="submit" className="demo-primary">Save reply on this device</button>
            </form>
          </article>
        ) : visible.length === 0 ? <Empty title="No concerns in this view" body="Choose another status. Private items stay hidden from residents of other flats." /> : visible.map((item) => (
          <button key={item.id} type="button" className="demo-row" onClick={() => setSelected(item.id)}>
            <span>{item.title}<br /><span className="demo-secondary">{item.category} · {item.raisedOn} · {item.assignee}</span></span>
            <span className="demo-status">{item.visibility}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

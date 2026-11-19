import { useState } from "react";
import { documents, statement } from "./data.js";
import { useDemo } from "./context.js";

const ANSWERS = [
  ["collection", "November collection is ₹4,32,000 of ₹4,86,000 billed, which is 88.9%. Outstanding this month is ₹54,000."],
  ["bank", "The operating bank in this demo closes at ₹18,75,000. Corpus is ₹32,50,000 and the reserve is ₹8,40,000."],
  ["meeting", "The next committee meeting is 22 November 2026 at the clubhouse."],
];

export function More() {
  const { person, onSignOut } = useDemo();
  const [section, setSection] = useState("Profile");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const sections = ["Profile", "Documents", "Assistant", "Settings"];
  return (
    <section>
      <h1>More</h1>
      <div className="demo-tabs" role="tablist" aria-label="More">
        {sections.map((name) => <button key={name} type="button" role="tab" aria-selected={section === name} onClick={() => setSection(name)}>{name}</button>)}
      </div>
      <div className="demo-panel">
        {section === "Profile" && (
          <>
            <h2>{person.name}</h2>
            <p>{person.label} · {person.flat}</p>
            <p>Palm Court Residences, Hyderabad. This profile exists only in the demo.</p>
            <button type="button" className="demo-primary" onClick={onSignOut}>Sign out</button>
          </>
        )}
        {section === "Documents" && (
          <>
            <h2>Documents</h2>
            <ul>
              {documents.map((document) => <li key={document.id}>{document.title} · {document.status} · {document.date}</li>)}
            </ul>
            <h3>November draft</h3>
            <p>{statement.status}. Due {statement.due}. {statement.observation}</p>
          </>
        )}
        {section === "Assistant" && (
          <>
            <h2>Ask about this demo</h2>
            <p>Answers come from the Palm Court fixture. This does not call an external model.</p>
            <form onSubmit={(event) => {
              event.preventDefault();
              const text = question.toLowerCase();
              const match = ANSWERS.find(([word]) => text.includes(word));
              setAnswer(match ? match[1] : "Try asking about the collection, the bank, or the meeting.");
            }}>
              <label htmlFor="ask">Question</label>
              <input id="ask" value={question} onChange={(event) => setQuestion(event.target.value)} required />
              <button type="submit" className="demo-primary">Ask</button>
            </form>
            {answer && <p role="status">{answer}</p>}
          </>
        )}
        {section === "Settings" && (
          <>
            <h2>Community settings</h2>
            <p>Palm Court Residences · Hyderabad, Telangana · Asia/Kolkata</p>
            <p>Maintenance is ₹4,500 per occupied unit. Statements are due on the 10th. Invitations and setting changes are turned off so this demo cannot write to a community.</p>
          </>
        )}
      </div>
    </section>
  );
}

import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { canApprove, categoryTotals, collectionSnapshot, funds, months, novemberInvoices, publishedCategories } from "./data.js";
import { useDemo } from "./context.js";
import { Empty, Meter, MonthChart, MoneyTable, Notice, rupee } from "./ui.jsx";

export function Finance() {
  const { state, dispatch, person } = useDemo();
  const [tab, setTab] = useState("Overview");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [query, setQuery] = useState("");
  const [invoiceStatus, setInvoiceStatus] = useState("All");
  const [selected, setSelected] = useState(null);
  const month = months.find((item) => item.id === state.monthId) || months.at(-1);
  const openMonth = month.id === "2026-11";
  const invoices = novemberInvoices();
  const snapshot = collectionSnapshot(invoices);
  const categories = openMonth ? categoryTotals(state.expenses) : publishedCategories(month);
  const filtered = useMemo(() => state.expenses.filter((row) => {
    const categoryMatch = category === "All" || row.category === category;
    const statusMatch = status === "All" || row.approval === status || row.payment === status;
    const text = `${row.description} ${row.category}`.toLowerCase().includes(query.trim().toLowerCase());
    return categoryMatch && statusMatch && text;
  }), [state.expenses, category, status, query]);
  const shownInvoices = invoices.filter((row) => {
    const statusMatch = invoiceStatus === "All" || row.status === invoiceStatus;
    return statusMatch && row.flat.toLowerCase().includes(query.trim().toLowerCase());
  });
  const expense = state.expenses.find((row) => row.id === selected);

  return (
    <section>
      <h1>Bills & accounts</h1>
      <p className="demo-secondary">November is the open month. Pay dues or review society accounts. Changes stay on this device only.</p>
      <div className="demo-tabs" role="tablist" aria-label="Bills">
        {["Overview", "Transactions", "Maintenance", "Reports"].map((name) => (
          <button key={name} type="button" role="tab" aria-selected={tab === name} onClick={() => { setTab(name); setSelected(null); }}>{name}</button>
        ))}
      </div>
      <label className="demo-filters">
        Reporting period
        <select aria-label="Reporting period" value={state.monthId} onChange={(event) => dispatch({ type: "month", id: event.target.value })}>
          {months.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <Notice>{state.notice}</Notice>

      {tab === "Overview" && (
        <div className="demo-panel">
          <h2>{month.label}</h2>
          <Meter value={month.collected} max={month.billed} label={`${month.label} collection`} />
          <MoneyTable rows={[
            { term: "Income billed", value: rupee(month.billed) },
            { term: "Income collected", value: rupee(month.collected) },
            { term: "Expenses", value: rupee(month.expenses) },
            { term: "Operating bank", value: rupee(funds.bank) },
            { term: "Corpus fund", value: rupee(funds.corpus) },
            { term: "Reserve fund", value: rupee(funds.reserve) },
            { term: "Outstanding this month", value: rupee(openMonth ? snapshot.outstanding : month.billed - month.collected) },
          ]} />
        </div>
      )}

      {tab === "Transactions" && (
        <div className="demo-panel">
          <h2>{openMonth ? "November transactions" : `${month.label} categories`}</h2>
          {openMonth ? (
            <>
              <div className="demo-filters">
                <input aria-label="Search transactions" placeholder="Search description" value={query} onChange={(event) => setQuery(event.target.value)} />
                <select aria-label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option>All</option>
                  {[...new Set(state.expenses.map((row) => row.category))].map((item) => <option key={item}>{item}</option>)}
                </select>
                <select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
                  {["All", "Approved", "Pending committee", "Paid", "Awaiting payment", "Unpaid"].map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
              {filtered.length === 0 && <Empty title="No transactions match" body="Clear the search or status to see all 20 November records." action={<button type="button" className="demo-text-button" onClick={() => { setQuery(""); setCategory("All"); setStatus("All"); }}>Clear filter</button>} />}
              {expense ? (
                <article className="demo-detail">
                  <button type="button" className="demo-text-button" onClick={() => setSelected(null)}><ArrowLeft size={16} aria-hidden="true" /> Back to the list</button>
                  <h2>{expense.description}</h2>
                  <p>{expense.category} · {expense.date} · {rupee(expense.amount)}</p>
                  <p><span className="demo-status">{expense.approval}</span><span className="demo-status">{expense.payment}</span><span className="demo-status">{expense.document}</span></p>
                  <h3>Approval history</h3>
                  <ol>
                    {expense.history.map((step) => <li key={step.id}>{step.at} · {step.by} · {step.action}</li>)}
                  </ol>
                  {canApprove(person) && expense.approval === "Pending committee" && (
                    <button type="button" className="demo-primary" onClick={() => dispatch({ type: "approve", id: expense.id, by: `${person.name}, ${person.label}` })}>Approve in this demo</button>
                  )}
                </article>
              ) : filtered.map((row) => (
                <button key={row.id} type="button" className="demo-row" onClick={() => setSelected(row.id)}>
                  <span>{row.date} · {row.description}<br /><span className="demo-secondary">{row.category} · {row.approval} · {row.document}</span></span>
                  <strong>{rupee(row.amount)}</strong>
                </button>
              ))}
            </>
          ) : (
            <MoneyTable rows={categories.map((row) => ({ term: row.category, value: rupee(row.amount) }))} />
          )}
        </div>
      )}

      {tab === "Maintenance" && (
        <div className="demo-panel">
          <h2>November maintenance</h2>
          <p>{rupee(4500)} per occupied unit. {snapshot.efficiency}% collected. Paid, partial and outstanding rows sum to the billed amount.</p>
          <MoneyTable rows={[
            { term: "Billed", value: rupee(snapshot.billed) },
            { term: "Paid", value: rupee(snapshot.collected) },
            { term: "Outstanding", value: rupee(snapshot.outstanding) },
          ]} />
          <div className="demo-filters">
            <input aria-label="Find a flat" placeholder="Flat, for example A-402" value={query} onChange={(event) => setQuery(event.target.value)} />
            <select aria-label="Invoice status" value={invoiceStatus} onChange={(event) => setInvoiceStatus(event.target.value)}>
              {["All", "Paid", "Partial", "Outstanding"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          {shownInvoices.length === 0 && <Empty title="No invoices match" body="Try another flat or status." />}
          <div className="app-scroll">
          <table className="demo-table demo-table-wide">
            <thead>
              <tr><th>Flat</th><th>Status</th><th>Billed</th><th>Paid</th><th>Left</th></tr>
            </thead>
            <tbody>
              {shownInvoices.slice(0, 24).map((row) => (
                <tr key={row.id}>
                  <th scope="row">{row.flat}{row.flat === person.flat ? " · your flat" : ""}</th>
                  <td>{row.status}</td>
                  <td>{rupee(row.billed)}</td>
                  <td>{rupee(row.paid)}</td>
                  <td>{rupee(row.outstanding)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {shownInvoices.length > 24 && <p className="demo-secondary">Showing 24 of {shownInvoices.length}. Search a flat to open its row.</p>}
        </div>
      )}

      {tab === "Reports" && (
        <div className="demo-panel">
          <h2>Income and expenditure</h2>
          <MonthChart months={months} activeId={month.id} />
          <MoneyTable rows={[
            { term: `${month.label} collected`, value: rupee(month.collected) },
            { term: `${month.label} expenses`, value: rupee(month.expenses) },
            { term: "Surplus this month", value: rupee(month.collected - month.expenses) },
            ...categories.map((row) => ({ term: row.category, value: rupee(row.amount) })),
            { term: "Corpus fund", value: rupee(funds.corpus) },
            { term: "Reserve fund", value: rupee(funds.reserve) },
          ]} />
        </div>
      )}
    </section>
  );
}

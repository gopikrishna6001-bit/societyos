import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { canApprove, canReview, categoryTotals, collectionSnapshot, funds, months, publishedCategories } from "./data.js";
import { useDemo } from "./context.js";
import { Empty, Meter, MonthChart, MoneyTable, Notice, rupee } from "./ui.jsx";

const TABS = ["Overview", "Transactions", "Maintenance", "Reports"];

export function Finance() {
  const { state, dispatch, person } = useDemo();
  const [params, setParams] = useSearchParams();
  const requestedTab = params.get("tab");
  const [tab, setTab] = useState(TABS.includes(requestedTab) ? requestedTab : "Overview");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [query, setQuery] = useState("");
  const [invoiceStatus, setInvoiceStatus] = useState(params.get("status") || "All");
  const [selected, setSelected] = useState(params.get("expense"));
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const month = months.find((item) => item.id === state.monthId) || months.at(-1);
  const openMonth = month.id === "2026-11";
  const invoices = state.invoices.filter((row) => row.billed > 0);
  const snapshot = collectionSnapshot(invoices);
  const categories = openMonth ? categoryTotals(state.expenses) : publishedCategories(month);
  const filtered = useMemo(() => state.expenses.filter((row) => {
    const categoryMatch = category === "All" || row.category === category;
    const statusMatch = status === "All" || row.approval === status || row.payment === status;
    const text = `${row.description} ${row.category}`.toLowerCase().includes(query.trim().toLowerCase());
    return categoryMatch && statusMatch && text;
  }), [state.expenses, category, status, query]);
  const shownInvoices = invoices.filter((row) => {
    const statusMatch = invoiceStatus === "All"
      || row.status === invoiceStatus
      || (invoiceStatus === "Due" && (row.status === "Outstanding" || row.status === "Partial"));
    return statusMatch && row.flat.toLowerCase().includes(query.trim().toLowerCase());
  });
  const expense = state.expenses.find((row) => row.id === selected);
  const invoice = invoices.find((row) => row.id === selectedInvoice);
  const canCreateExpense = ["treasurer", "committee_admin", "platform_admin"].includes(person.role);

  useEffect(() => {
    const nextTab = params.get("tab");
    if (TABS.includes(nextTab)) setTab(nextTab);
    if (params.get("status")) setInvoiceStatus(params.get("status"));
    if (params.get("expense")) setSelected(params.get("expense"));
  }, [params]);

  const openTab = (name) => {
    setTab(name);
    setSelected(null);
    setSelectedInvoice(null);
    setParams(name === "Overview" ? {} : { tab: name });
  };

  return (
    <section>
      <h1>Finance</h1>
      <p className="demo-secondary">November is the open month. Earlier months use their published totals. Nothing here is posted to a ledger.</p>
      <div className="demo-tabs" role="tablist" aria-label="Finance">
        {TABS.map((name) => (
          <button key={name} type="button" role="tab" aria-selected={tab === name} onClick={() => openTab(name)}>{name}</button>
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
          <button type="button" className="demo-text-button" onClick={() => openTab("Maintenance")}>Inspect maintenance invoices</button>
          <button type="button" className="demo-text-button" onClick={() => openTab("Transactions")}>Inspect expense register</button>
        </div>
      )}

      {tab === "Transactions" && (
        <div className="demo-panel">
          <h2>{openMonth ? "November transactions" : `${month.label} categories`}</h2>
          {openMonth ? (
            <>
              {canCreateExpense && (
                <form
                  className="demo-filters"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const data = Object.fromEntries(new FormData(event.currentTarget));
                    dispatch({
                      type: "expense",
                      description: String(data.description || "").trim(),
                      category: String(data.category || "Other"),
                      amount: Number(data.amount || 0),
                      document: String(data.document || "Demo attachment"),
                      by: `${person.name}, ${person.label}`,
                    });
                    event.currentTarget.reset();
                    setTab("Transactions");
                  }}
                >
                  <h3>Submit a demo expense</h3>
                  <input name="description" aria-label="Expense description" placeholder="Description" required />
                  <select name="category" aria-label="Expense category" defaultValue="Security">
                    {["Security", "Housekeeping", "Electricity", "Water", "Lift maintenance", "Plumbing", "Civil repairs", "Gardening", "Administration", "Insurance", "Emergency repairs", "Other"].map((item) => <option key={item}>{item}</option>)}
                  </select>
                  <input name="amount" aria-label="Expense amount" type="number" min="1" step="1" placeholder="Amount" required />
                  <input name="document" aria-label="Supporting document" placeholder="Supporting document label" defaultValue="Demo attachment" />
                  <button type="submit" className="demo-primary">Submit for approval in this demo</button>
                </form>
              )}
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
              {filtered.length === 0 && <Empty title="No transactions match" body="Clear the search or status to see all November records." action={<button type="button" className="demo-text-button" onClick={() => { setQuery(""); setCategory("All"); setStatus("All"); }}>Clear filter</button>} />}
              {expense ? (
                <article className="demo-detail">
                  <button type="button" className="demo-text-button" onClick={() => { setSelected(null); setParams({ tab: "Transactions" }); }}><ArrowLeft size={16} aria-hidden="true" /> Back to the list</button>
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
                <button key={row.id} type="button" className="demo-row" onClick={() => { setSelected(row.id); setParams({ tab: "Transactions", expense: row.id }); }}>
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
              {["All", "Due", "Paid", "Partial", "Outstanding"].map((item) => <option key={item}>{item}</option>)}
            </select>
            <button type="button" className="demo-text-button" onClick={() => { setInvoiceStatus("All"); setQuery(person.flat); setSelectedInvoice(`inv-${person.flat}`); }}>
              Open your flat invoice
            </button>
          </div>
          {invoice ? (
            <article className="demo-detail">
              <button type="button" className="demo-text-button" onClick={() => setSelectedInvoice(null)}><ArrowLeft size={16} aria-hidden="true" /> Back to invoices</button>
              <h2>Invoice {invoice.flat}</h2>
              <p>Status {invoice.status}. Billed {rupee(invoice.billed)}. Paid {rupee(invoice.paid)}. Left {rupee(invoice.outstanding)}.</p>
              {invoice.receipt && <p>Receipt {invoice.receipt} · paid {invoice.paidOn}</p>}
              {invoice.flat === person.flat && invoice.outstanding > 0 && (
                <button type="button" className="demo-primary" onClick={() => dispatch({ type: "pay", id: invoice.id })}>
                  Record demo payment for {invoice.flat}
                </button>
              )}
              {invoice.flat === person.flat && invoice.outstanding === 0 && (
                <p className="demo-secondary">This flat is paid in the demo{invoice.receipt ? `. Receipt ${invoice.receipt}` : "."}</p>
              )}
              {invoice.flat !== person.flat && person.role === "resident" && (
                <p className="demo-secondary">Residents can inspect their own invoice payment flow. Other flats stay read-only in this demo.</p>
              )}
              {invoice.flat !== person.flat && person.role !== "resident" && invoice.outstanding > 0 && (
                <button type="button" className="demo-primary" onClick={() => dispatch({ type: "pay", id: invoice.id })}>
                  Record demo collection for {invoice.flat}
                </button>
              )}
            </article>
          ) : (
            <>
              {shownInvoices.length === 0 && <Empty title="No invoices match" body="Try another flat or status." />}
              <div className="app-scroll">
                <table className="demo-table demo-table-wide">
                  <thead>
                    <tr><th>Flat</th><th>Status</th><th>Billed</th><th>Paid</th><th>Left</th></tr>
                  </thead>
                  <tbody>
                    {shownInvoices.slice(0, 24).map((row) => (
                      <tr key={row.id}>
                        <th scope="row">
                          <button type="button" className="demo-text-button" onClick={() => setSelectedInvoice(row.id)}>
                            {row.flat}{row.flat === person.flat ? " · your flat" : ""}
                          </button>
                        </th>
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
            </>
          )}
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
          {canReview(person) && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const text = String(new FormData(event.currentTarget).get("observation") || "").trim();
                dispatch({ type: "observe", text, by: person.name });
                event.currentTarget.reset();
              }}
            >
              <h3>Audit observation</h3>
              <p className="demo-secondary">Current note: {state.observation}</p>
              <label htmlFor="observation">Raise or update a demo observation</label>
              <input id="observation" name="observation" required />
              <button type="submit" className="demo-primary">Save observation in this demo</button>
            </form>
          )}
          {(state.observationHistory || []).length > 0 && (
            <>
              <h3>Observation history</h3>
              <ol>{state.observationHistory.map((item, index) => <li key={`${item.at}-${index}`}>{item.at} · {item.by}: {item.text}</li>)}</ol>
            </>
          )}
        </div>
      )}
    </section>
  );
}

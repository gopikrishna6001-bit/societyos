import { useEffect, useState } from "react";
import { rpc, rows, supabase } from "./api.js";
import { downloadText, inr, toCsv } from "./money.js";
import { Field, FilterSheet, PageStatus, SaveForm, control, useLoad } from "./ui.jsx";
import { brand } from "../brand.js";
import InviteResident from "./InviteResident.jsx";

const TICKET_CATEGORIES = ["Maintenance", "Water", "Electricity", "Security", "Housekeeping", "Lift and facilities", "Finance", "Governance", "General", "Other"];
const EXPENSE_CATEGORIES = ["Security", "Housekeeping", "Electricity", "Water", "Lift maintenance", "Plumbing", "Civil repairs", "Gardening", "Administration", "Insurance", "Emergency repairs", "Other"];

function accountsOf(list, type) {
  return (list || []).filter((account) => account.account_type === type);
}

function asList(data) {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

export function HomeScreen({ communityId, roles = [], onOpen }) {
  const query = useLoad(() => rpc("resident_dashboard", { p_community: communityId }), [communityId]);
  const actions = useLoad(() => rpc("action_centre", { p_community: communityId }), [communityId]);
  const dues = useLoad(() => rpc("my_unit_demands", { p_community: communityId }), [communityId]);
  const periods = useLoad(
    () => rows(supabase.from("collection_periods").select("id,financial_year,period_month,due_on").eq("community_id", communityId).order("period_month", { ascending: false })),
    [communityId],
  );
  const [periodId, setPeriodId] = useState("");
  useEffect(() => {
    if (!periodId && periods.data?.[0]?.id) setPeriodId(periods.data[0].id);
  }, [periods.data, periodId]);
  const financial = roles.some((role) => ["treasurer", "resident_auditor", "committee_admin", "platform_admin"].includes(role));
  const summary = useLoad(
    () => (financial && periodId
      ? rpc("collection_summary", { p_community: communityId, p_period: periodId }).then((result) => (Array.isArray(result) ? result[0] || null : result))
      : Promise.resolve(null)),
    [communityId, periodId, financial],
  );
  const ledger = useLoad(
    () => (financial ? rpc("recent_ledger_entries", { p_community: communityId, p_limit: 8 }) : Promise.resolve([])),
    [communityId, financial],
  );
  const periodExpenses = useLoad(() => {
    if (!financial || !periods.data?.length || !periodId) return Promise.resolve([]);
    const period = periods.data.find((row) => row.id === periodId);
    if (!period?.period_month) return Promise.resolve([]);
    const start = period.period_month;
    const endDate = new Date(`${start}T00:00:00Z`);
    endDate.setUTCMonth(endDate.getUTCMonth() + 1);
    endDate.setUTCDate(0);
    const end = endDate.toISOString().slice(0, 10);
    return rpc("period_expense_register", { p_community: communityId, p_start: start, p_end: end });
  }, [communityId, periodId, periods.data, financial]);

  const dash = query.data;
  const funds = dash?.funds || [];
  const banks = dash?.banks || [];
  const corpus = funds.filter((fund) => fund.fund_kind === "corpus");
  const reserve = funds.filter((fund) => fund.fund_kind === "special" || fund.fund_kind === "emergency" || fund.fund_kind === "other");
  const maintenance = funds.filter((fund) => fund.fund_kind === "maintenance" || !fund.fund_kind);
  const bankTotal = banks.reduce((sum, row) => sum + Number(row.book_balance || 0), 0);
  const corpusTotal = corpus.reduce((sum, row) => sum + Number(row.closing || 0), 0);
  const reserveTotal = reserve.reduce((sum, row) => sum + Number(row.closing || 0), 0);
  const expenseTotal = asList(periodExpenses.data).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const nextMeeting = dash?.upcoming_meetings?.[0];
  const statement = dash?.latest_statement;
  const outstanding = asList(dues.data).filter((row) => Number(row?.outstanding_amount) > 0);
  const actionItems = asList(actions.data?.items);
  const selectedPeriod = (periods.data || []).find((row) => row.id === periodId);
  const collected = Number(summary.data?.collected || 0);
  const billed = Number(summary.data?.expected || 0);
  const periodOutstanding = Number(summary.data?.outstanding || 0);
  const progress = billed > 0 ? Math.round((collected / billed) * 1000) / 10 : 0;

  const periodLabel = selectedPeriod
    ? `${selectedPeriod.financial_year} · ${selectedPeriod.period_month}`
    : "No billing period opened yet";

  return (
    <section className="dash">
      <header className="dash-welcome">
        <h1>{financial ? "Society home" : "Your home"}</h1>
        <p>{brand.promise} · {periodLabel}</p>
      </header>

      <div className="live-actions">
        <button type="button" className="primary" onClick={() => onOpen?.("collections")}>Pay / verify maintenance</button>
        <button type="button" onClick={() => onOpen?.("concerns")}>Raise concern</button>
        <button type="button" onClick={() => onOpen?.("notices")}>Notices</button>
        <button type="button" onClick={() => onOpen?.("decisions")}>Meetings &amp; votes</button>
      </div>

      <article className="card">
        <h2>Needs your attention</h2>
        <PageStatus loading={actions.loading} error={actions.error} onRetry={actions.reload} empty={!actions.loading && !actions.error && actionItems.length === 0} title="Nothing waiting for you" body="When dues, proofs, concerns or meetings need attention, they appear here." />
        {!!actionItems.length && (
          <ul className="live-list">
            {actionItems.map((item) => (
              <li key={`${item.module}-${item.id}`}>
                <button type="button" className="row" onClick={() => onOpen?.(item.page || "home")}>
                  <span>
                    <strong>{item.title}</strong>
                    <br />
                    <span className="demo-secondary">{item.module} · {item.status}{item.due_on ? ` · due ${item.due_on}` : ""}</span>
                  </span>
                  <span className="demo-status">{item.action || "Open"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </article>

      {!!outstanding.length && (
        <article className="card">
          <h2>Your outstanding dues</h2>
          <ul className="live-list">
            {outstanding.map((row) => (
              <li key={row.demand_id} className="row">
                <span>Unit {row.unit_number} · {row.financial_year} · due {row.due_on}</span>
                <strong className="tabular">{inr(row.outstanding_amount)}</strong>
              </li>
            ))}
          </ul>
          <div className="demo-actions">
            <button type="button" className="demo-primary" onClick={() => onOpen?.("collections")}>Submit payment proof</button>
          </div>
        </article>
      )}

      {financial && (
        <>
          <div className="live-panel" style={{ marginTop: 12 }}>
            <Field label="Billing period">
              <select className={control} value={periodId} onChange={(event) => setPeriodId(event.target.value)} aria-label="Billing period">
                {(periods.data || []).length === 0 && <option value="">No period opened</option>}
                {(periods.data || []).map((period) => (
                  <option key={period.id} value={period.id}>{period.financial_year} · {period.period_month}</option>
                ))}
              </select>
            </Field>
          </div>
          <PageStatus loading={periods.loading || summary.loading} error={periods.error || summary.error} onRetry={() => { periods.reload(); summary.reload(); }} empty={!periods.loading && !(periods.data || []).length} title="No collection period" body="Open a billing month under Collections before period metrics appear." />
          {selectedPeriod && (
            <div className="metric-grid">
              <button type="button" className="metric" onClick={() => onOpen?.("collections")}><span>Collected</span><strong>{inr(collected)}</strong></button>
              <button type="button" className="metric" onClick={() => onOpen?.("collections")}><span>Outstanding</span><strong>{inr(periodOutstanding)}</strong></button>
              <button type="button" className="metric" onClick={() => onOpen?.("expenses")}><span>Expenses</span><strong>{inr(expenseTotal)}</strong></button>
              <button type="button" className="metric" onClick={() => onOpen?.("reconciliation")}><span>Bank balance</span><strong>{inr(bankTotal)}</strong></button>
              <button type="button" className="metric" onClick={() => onOpen?.("funds")}><span>Corpus</span><strong>{inr(corpusTotal)}</strong></button>
              <button type="button" className="metric" onClick={() => onOpen?.("funds")}><span>Reserve / other</span><strong>{inr(reserveTotal)}</strong></button>
            </div>
          )}
          {selectedPeriod && (
            <article className="card">
              <h2>Collection progress</h2>
              <div className="demo-meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Collection progress">
                <span style={{ "--demo-scale": Math.min(progress, 100) / 100 }} />
              </div>
              <p>{inr(collected)} of {inr(billed)} billed · due {selectedPeriod.due_on}</p>
              <div className="demo-actions">
                <button type="button" onClick={() => onOpen?.("collections")}>Open collection register</button>
              </div>
            </article>
          )}
          {selectedPeriod && (
            <article className="card">
              <h2>Income and expenditure</h2>
              <div className="metric-grid">
                <div className="metric"><span>Maintenance collected</span><strong>{inr(collected)}</strong></div>
                <div className="metric"><span>Expenses in period</span><strong>{inr(expenseTotal)}</strong></div>
              </div>
              <PageStatus loading={periodExpenses.loading} error={periodExpenses.error} onRetry={periodExpenses.reload} empty={!periodExpenses.loading && !asList(periodExpenses.data).length} title="No expenses in this period" body="Posted expenses appear here after the treasurer records them." />
              <ul className="live-list">
                {asList(periodExpenses.data).slice(0, 5).map((row) => (
                  <li key={row.expense_id}>
                    <button type="button" className="row" onClick={() => onOpen?.("expenses")}>
                      <span>{row.occurred_on} · {row.expense_number} · {row.category}</span>
                      <strong className="tabular">{inr(row.amount)}</strong>
                    </button>
                  </li>
                ))}
              </ul>
            </article>
          )}
        </>
      )}

      {!financial && (
        <article className="card">
          <h2>Community books</h2>
          <p className="demo-secondary">Fund totals and unit registers stay with treasurer, committee and auditor roles. Your dues, notices and concerns stay available here.</p>
        </article>
      )}

      <PageStatus loading={query.loading} error={query.error} onRetry={query.reload} empty={!query.loading && !query.error && funds.length === 0 && !financial} title="No fund balances yet" body="When the treasurer opens funds and posts balances, community totals appear for authorized roles." />
      {!!maintenance.length && financial && (
        <button type="button" className="metric" style={{ width: "100%", textAlign: "left" }} onClick={() => onOpen?.("funds")}>
          <span>Maintenance funds</span>
          <strong>{inr(maintenance.reduce((sum, row) => sum + Number(row.closing || 0), 0))}</strong>
        </button>
      )}

      {financial && (
        <article className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <h2 style={{ margin: 0 }}>Recent ledger transactions</h2>
            <button type="button" className="demo-text-button" onClick={() => onOpen?.("history")}>Full history</button>
          </div>
          <PageStatus loading={ledger.loading} error={ledger.error} onRetry={ledger.reload} empty={!ledger.loading && !asList(ledger.data).length} title="No journal entries yet" body="Receipts, payments and adjustments appear here after they are posted." />
          <ul className="live-list">
            {asList(ledger.data).map((entry) => (
              <li key={entry.entry_id}>
                <button type="button" className="row" onClick={() => onOpen?.(entry.entry_type === "payment" ? "expenses" : "collections")}>
                  <span>
                    <strong>{entry.entry_type}</strong>
                    <br />
                    <span className="demo-secondary">{entry.occurred_on} · {entry.narration}</span>
                  </span>
                  <strong className="tabular">{inr(entry.amount)}</strong>
                </button>
              </li>
            ))}
          </ul>
        </article>
      )}

      <div className="dash-grid">
        <article className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <h2 style={{ margin: 0 }}>Announcements</h2>
            <button type="button" className="demo-text-button" onClick={() => onOpen?.("notices")}>All notices</button>
          </div>
          <PageStatus loading={query.loading} error={null} empty={!query.loading && !(dash?.announcements || []).length} title="No announcements" body="Published notices appear here." />
          <ul className="live-list">
            {(dash?.announcements || []).map((item, index) => (
              <li key={`${item.title}-${index}`}>
                <button type="button" className="row" onClick={() => onOpen?.(item.event_type ? "notifications" : "notices")}>
                  <span>
                    <strong>{item.title}</strong>
                    <br />
                    <span className="demo-secondary">{item.body}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </article>
        <article className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <h2 style={{ margin: 0 }}>Upcoming meetings</h2>
            <button type="button" className="demo-text-button" onClick={() => onOpen?.("decisions")}>Meetings</button>
          </div>
          <PageStatus loading={query.loading} error={null} empty={!query.loading && !(dash?.upcoming_meetings || []).length} title="No upcoming meetings" body="Scheduled meetings appear here when the committee posts them." />
          <ul className="live-list">
            {(dash?.upcoming_meetings || []).map((meeting, index) => (
              <li key={`${meeting.title}-${index}`}>
                <button type="button" className="row" onClick={() => onOpen?.("decisions")}>
                  <span>
                    <strong>{meeting.title}</strong>
                    <br />
                    <span className="demo-secondary">{new Date(meeting.held_on).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} · {meeting.venue || "Venue TBA"}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {nextMeeting && financial && statement && !["published", "published_with_exceptions"].includes(statement.status) && (
            <div className="demo-actions">
              <button type="button" className="demo-primary" onClick={() => onOpen?.("finance")}>Review latest statement</button>
            </div>
          )}
        </article>
      </div>

      {dash && (
        <div className="dash-grid">
          <List title="Recently resolved concerns" items={dash.recently_resolved} render={(item) => `${item.number}: ${item.subject}`} empty="No resolved public concerns yet." />
          {financial && <List title="Bank book balances" items={dash.banks} render={(item) => `${item.name}: ${inr(item.book_balance)}`} empty="No bank ledger has been opened." />}
        </div>
      )}
    </section>
  );
}

function Row({ term, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-800 px-3 py-3 last:border-b-0">
      <dt className="text-sm text-slate-400">{term}</dt>
      <dd className="tabular text-lg font-semibold">{value}</dd>
    </div>
  );
}

function Card({ label, value }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function List({ title, items, render, empty }) {
  return (
    <article className="card">
      <h2>{title}</h2>
      {items?.length ? (
        <ul className="live-list">
          {items.map((item, index) => <li key={index} className="row"><span>{render(item)}</span></li>)}
        </ul>
      ) : (
        <p className="demo-secondary">{empty}</p>
      )}
    </article>
  );
}

export function FinanceScreen({ communityId, roles, focus }) {
  const canPost = roles.includes("treasurer");
  const canReview = roles.includes("resident_auditor");
  const canSeeRecon = roles.some((role) => ["treasurer", "committee_admin", "resident_auditor", "platform_admin"].includes(role));
  const funds = useLoad(() => rpc("account_balances", { p_community: communityId }), [communityId]);
  const ledger = useLoad(
    () => rows(supabase.from("accounts").select("id,name,code,account_type,fund_kind").eq("community_id", communityId)),
    [communityId],
  );
  const expenses = useLoad(
    () => rows(supabase.from("expenses").select("id,expense_number,occurred_on,description,payee,amount,approval_status,auditor_status,payment_status,expense_categories(name)").eq("community_id", communityId).order("occurred_on", { ascending: false })),
    [communityId],
  );
  const periods = useLoad(
    () => rows(supabase.from("collection_periods").select("id,financial_year,period_month,due_on").eq("community_id", communityId).order("period_month", { ascending: false })),
    [communityId],
  );
  const [section, setSection] = useState(focus === "finance" ? "funds" : focus);
  useEffect(() => { setSection(focus === "finance" ? "funds" : focus); }, [focus]);
  const show = (name) => section === name;
  const entries = useLoad(
    () => rows(supabase.from("journal_entries").select("id,occurred_on,entry_type,narration,idempotency_key,reverses_entry_id,created_at").eq("community_id", communityId).order("occurred_on", { ascending: false }).limit(40)),
    [communityId],
  );
  const [openEntry, setOpenEntry] = useState("");
  const entryLines = useLoad(
    () => (openEntry
      ? rows(supabase.from("journal_lines").select("id,direction,amount,accounts(name,code,account_type)").eq("entry_id", openEntry))
      : Promise.resolve([])),
    [openEntry],
  );
  const sections = [
    ["funds", "Funds"],
    ["collections", "Collections"],
    ["expenses", "Expenses"],
    ["transactions", "Transactions"],
    ...(canSeeRecon ? [["reconciliation", "Reconciliation"]] : []),
    ["reviews", "Reviews"],
    ["statements", "Statements"],
  ];

  const exportBalances = () => {
    const data = funds.data || [];
    if (!data.length) return;
    downloadText("fund-balances.csv", toCsv(data.map((row) => ({
      fund: row.name,
      kind: row.fund_kind,
      opening: row.opening,
      receipts: row.receipts,
      payments: row.payments,
      transfers_in: row.transfers_in,
      transfers_out: row.transfers_out,
      closing: row.closing,
    }))));
  };

  return (
    <section className="dash">
      <header className="dash-welcome">
        <h1>Finance</h1>
        <p>Live ledger records for this community.</p>
      </header>
      <Field label="Section">
        <select className={control} value={sections.some(([id]) => id === section) ? section : "funds"} onChange={(event) => setSection(event.target.value)} aria-label="Finance section">
          {sections.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </Field>
      {show("funds") && (
        <article className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <h2 style={{ margin: 0 }}>Funds</h2>
            <button type="button" className="demo-text-button" onClick={exportBalances}>Export CSV</button>
          </div>
          <PageStatus loading={funds.loading} error={funds.error} onRetry={funds.reload} empty={!funds.loading && !funds.error && !(funds.data || []).length} title="No funds opened" body="Open a maintenance, corpus, special, emergency, or other fund before posting money." />
          <ul className="live-list">
            {(funds.data || []).map((row) => (
              <li key={row.account_id} className="row">
                <span>
                  <strong>{row.name}</strong>
                  <br />
                  <span className="demo-secondary">Opening {inr(row.opening)} · Receipts {inr(row.receipts)} · Payments {inr(row.payments)}</span>
                  <br />
                  <span className="demo-secondary">Transfers in {inr(row.transfers_in)} · out {inr(row.transfers_out)}</span>
                </span>
                <strong className="tabular">{inr(row.closing)}</strong>
              </li>
            ))}
          </ul>
          <p className="demo-secondary" style={{ marginTop: 8, fontSize: 12 }}>Closing = opening + receipts − payments + transfers in − transfers out + adjustments. Individual flat dues are not shown here.</p>
          {canPost && (
            <SaveForm submitLabel="Open fund" onSubmit={(data) => rpc("open_fund", { p_community: communityId, p_code: data.code, p_name: data.name, p_kind: data.kind, p_description: data.description }).then(funds.reload)}>
              <Field label="Code"><input className={control} name="code" required /></Field>
              <Field label="Name"><input className={control} name="name" required /></Field>
              <Field label="Kind">
                <select className={control} name="kind" defaultValue="maintenance">
                  {["maintenance", "corpus", "special", "emergency", "other"].map((kind) => <option key={kind}>{kind}</option>)}
                </select>
              </Field>
              <Field label="Description"><input className={control} name="description" /></Field>
            </SaveForm>
          )}
          {canPost && (
            <SaveForm confirmMessage="Reverse this posted entry? A reversal is permanent and does not delete the original." submitLabel="Reverse a posted entry" onSubmit={(data) => rpc("reverse_entry", {
              p_entry: data.entry,
              p_date: data.date,
              p_narration: data.narration,
              p_key: data.key || crypto.randomUUID(),
            }).then(funds.reload)}>
              <Field label="Original journal entry"><input className={control} name="entry" required /></Field>
              <Field label="Reversal date"><input className={control} type="date" name="date" required /></Field>
              <Field label="Narration"><input className={control} name="narration" required /></Field>
              <Field label="Idempotency key"><input className={control} name="key" /></Field>
            </SaveForm>
          )}
        </article>
      )}

      {show("collections") && (
        <Collections communityId={communityId} canPost={canPost} periods={periods} ledger={ledger.data || []} onPosted={funds.reload} />
      )}

      {show("expenses") && (
        <Expenses communityId={communityId} canPost={canPost} canReview={canReview} expenses={expenses} funds={accountsOf(ledger.data, "fund")} banks={accountsOf(ledger.data, "bank")} onPosted={funds.reload} />
      )}

      {show("transactions") && (
        <div>
          <h2 className="mb-3 text-xl font-semibold">Ledger transactions</h2>
          <p className="mb-3 text-sm text-slate-400">Posted journal entries. Corrections use reversals — originals are never deleted.</p>
          <PageStatus loading={entries.loading} error={entries.error} onRetry={entries.reload} empty={!entries.loading && !(entries.data || []).length} title="No transactions posted" body="Collections, expenses and opening balances create journal entries here." />
          <ul className="space-y-2 text-sm">
            {(entries.data || []).map((entry) => (
              <li key={entry.id} className="border border-slate-800 bg-white p-3">
                <button type="button" className="w-full text-left" onClick={() => setOpenEntry(openEntry === entry.id ? "" : entry.id)}>
                  <div className="flex flex-wrap justify-between gap-2">
                    <strong>{entry.entry_type}</strong>
                    <span>{entry.occurred_on}</span>
                  </div>
                  <p>{entry.narration}</p>
                  <p className="font-mono text-xs text-slate-500">{entry.id}</p>
                </button>
                {openEntry === entry.id && (
                  <div className="mt-3 border-t border-slate-800 pt-3">
                    <p className="text-slate-400">Idempotency {entry.idempotency_key}</p>
                    {entry.reverses_entry_id && <p className="text-slate-400">Reverses {entry.reverses_entry_id}</p>}
                    <PageStatus loading={entryLines.loading} error={entryLines.error} onRetry={entryLines.reload} empty={!entryLines.loading && !(entryLines.data || []).length} title="No lines" />
                    <ul className="mt-2 space-y-1">
                      {(entryLines.data || []).map((line) => (
                        <li key={line.id}>{line.direction} · {line.accounts?.code} {line.accounts?.name} · {inr(line.amount)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {show("reconciliation") && canSeeRecon && <Reconciliation communityId={communityId} banks={accountsOf(ledger.data, "bank")} canPost={canPost} />}
      {show("reviews") && <Reviews communityId={communityId} roles={roles} />}
      {show("statements") && <Statements communityId={communityId} canPost={canPost} canReview={canReview} />}
    </section>
  );
}

function Collections({ communityId, canPost, periods, ledger, onPosted }) {
  const [periodId, setPeriodId] = useState("");
  const [proofBusy, setProofBusy] = useState(false);
  const [proofMessage, setProofMessage] = useState("");
  const summary = useLoad(
    () => periodId ? rpc("collection_summary", { p_community: communityId, p_period: periodId }).then((result) => Array.isArray(result) ? (result[0] || null) : result) : Promise.resolve(null),
    [communityId, periodId],
  );
  const demands = useLoad(
    () => periodId && canPost
      ? rows(supabase.from("maintenance_demands").select("id,expected_amount,additional_amount,units(number)").eq("period_id", periodId))
      : Promise.resolve([]),
    [periodId, canPost],
  );
  const myDues = useLoad(() => rpc("my_unit_demands", { p_community: communityId }), [communityId]);
  const proofs = useLoad(
    () => rows(supabase.from("payment_proofs").select("id,demand_id,amount,paid_on,payment_mode,bank_reference,status,rejection_reason,storage_path,created_at").eq("community_id", communityId).order("created_at", { ascending: false }).limit(50)),
    [communityId],
  );
  const outstanding = asList(myDues.data).filter((row) => Number(row?.outstanding_amount) > 0);
  const pendingProofs = asList(proofs.data).filter((row) => row.status === "pending");

  const submitProof = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const file = form.querySelector('input[type="file"]')?.files?.[0];
    if (!file) {
      setProofMessage("Choose a payment proof image or PDF.");
      return;
    }
    setProofBusy(true);
    setProofMessage("");
    try {
      const path = `${communityId}/payment-proofs/${data.demand}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const upload = await supabase.storage.from("community-originals").upload(path, file, { upsert: false });
      if (upload.error) throw upload.error;
      await rpc("submit_payment_proof", {
        p_demand: data.demand,
        p_amount: data.amount,
        p_paid_on: data.paid,
        p_mode: data.mode,
        p_bank_reference: data.reference || null,
        p_storage_path: path,
        p_notes: data.notes || null,
      });
      form.reset();
      setProofMessage("Proof submitted. The treasurer must verify before the ledger updates.");
      myDues.reload();
      proofs.reload();
    } catch (cause) {
      setProofMessage(cause?.message || "Could not submit proof.");
    } finally {
      setProofBusy(false);
    }
  };

  return (
    <div className="dash">
      <header className="dash-welcome">
        <h1>Collections &amp; payments</h1>
        <p>Uploading a UPI or bank transfer screenshot does not mark dues paid. The treasurer verifies the proof, then the ledger posts.</p>
      </header>

      <article className="card">
      <h2>Your unit dues</h2>
      <PageStatus loading={myDues.loading} error={myDues.error} onRetry={myDues.reload} empty={!myDues.loading && !myDues.error && !asList(myDues.data).length} title="No demands on your units" body="When the treasurer opens a collection period for your flat, it appears here." />
      {!!asList(myDues.data).length && (
        <ul className="live-list">
          {asList(myDues.data).map((row) => (
            <li key={row.demand_id} className="row">
              <span>
                Unit {row.unit_number} · {row.financial_year} · due {row.due_on}
                <br />
                <span className="demo-secondary">Expected {inr(row.expected_amount)} · Collected {inr(row.collected_amount)}</span>
              </span>
              <strong className="tabular">{inr(row.outstanding_amount)} due</strong>
            </li>
          ))}
        </ul>
      )}
      </article>

      {!!outstanding.length && (
        <form className="live-panel grid gap-3" onSubmit={submitProof}>
          <h3 className="font-semibold">Submit payment proof</h3>
          <Field label="Demand">
            <select className={control} name="demand" required>
              {outstanding.map((row) => (
                <option key={row.demand_id} value={row.demand_id}>
                  Unit {row.unit_number} · outstanding {inr(row.outstanding_amount)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount paid"><input className={control} name="amount" inputMode="decimal" required /></Field>
          <Field label="Payment date"><input className={control} type="date" name="paid" required /></Field>
          <Field label="Mode">
            <select className={control} name="mode" defaultValue="upi">
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Cash (offline)</option>
            </select>
          </Field>
          <Field label="UPI / bank reference"><input className={control} name="reference" /></Field>
          <Field label="Proof file (image or PDF)"><input className={control} type="file" accept="image/*,application/pdf" required /></Field>
          <Field label="Notes"><input className={control} name="notes" /></Field>
          {proofMessage && <p role="status" className="text-sm text-slate-600">{proofMessage}</p>}
          <button disabled={proofBusy} type="submit" className="min-h-12 bg-[#0878E8] px-3 font-semibold text-white">{proofBusy ? "Uploading…" : "Submit proof for verification"}</button>
        </form>
      )}

      {canPost && (
        <div className="mb-6">
          <h3 className="mb-2 font-semibold">Pending proofs to verify</h3>
          <PageStatus loading={proofs.loading} error={proofs.error} onRetry={proofs.reload} empty={!proofs.loading && !pendingProofs.length} title="No pending proofs" body="Resident submissions awaiting verification appear here." />
          <ul className="space-y-3">
            {pendingProofs.map((proof) => (
              <li key={proof.id} className="border border-slate-800 bg-white p-3 text-sm">
                <p className="font-semibold">{inr(proof.amount)} · {proof.payment_mode} · {proof.paid_on}</p>
                <p className="text-slate-400">{proof.bank_reference || "No reference"} · {proof.storage_path}</p>
                <SaveForm
                  confirmMessage="Verify this proof and post the collection to the ledger?"
                  submitLabel="Verify and post ledger"
                  onSubmit={(data) => rpc("review_payment_proof", {
                    p_proof: proof.id,
                    p_decision: "verified",
                    p_receipt_number: data.receipt,
                    p_bank_account: data.bank,
                    p_fund_account: data.fund,
                    p_key: data.key || `proof:${proof.id}`,
                  }).then(() => { proofs.reload(); summary.reload(); onPosted(); myDues.reload(); })}
                >
                  <Field label="Receipt number"><input className={control} name="receipt" required /></Field>
                  <AccountSelect label="Bank ledger" name="bank" accounts={accountsOf(ledger, "bank")} />
                  <AccountSelect label="Fund" name="fund" accounts={accountsOf(ledger, "fund")} />
                  <Field label="Idempotency key"><input className={control} name="key" placeholder="Leave blank" /></Field>
                </SaveForm>
                <SaveForm
                  confirmMessage="Reject this payment proof?"
                  submitLabel="Reject proof"
                  onSubmit={(data) => rpc("review_payment_proof", {
                    p_proof: proof.id,
                    p_decision: "rejected",
                    p_rejection_reason: data.reason,
                  }).then(() => { proofs.reload(); myDues.reload(); })}
                >
                  <Field label="Rejection reason"><input className={control} name="reason" required /></Field>
                </SaveForm>
              </li>
            ))}
          </ul>
        </div>
      )}

      <PageStatus loading={periods.loading} error={periods.error} onRetry={periods.reload} empty={!periods.loading && !periods.error && !(periods.data || []).length} title="No collection period" body="A treasurer opens a month before payments can be recorded." />
      {(periods.data || []).length > 0 && (
        <Field label="Period summary">
          <select className={control} value={periodId} onChange={(event) => setPeriodId(event.target.value)}>
            <option value="">Select a month</option>
            {periods.data.map((period) => <option key={period.id} value={period.id}>{period.financial_year} · {period.period_month}</option>)}
          </select>
        </Field>
      )}
      {summary.data && (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Card label="Expected" value={inr(summary.data.expected)} />
          <Card label="Collected" value={inr(summary.data.collected)} />
          <Card label="Outstanding" value={inr(summary.data.outstanding)} />
          <Card label="Paid units" value={String(summary.data.paid_units ?? 0)} />
          <Card label="Partial units" value={String(summary.data.partial_units ?? 0)} />
          <Card label="Unpaid units" value={String(summary.data.unpaid_units ?? 0)} />
        </div>
      )}
      {canPost && periodId && <CollectionRegister communityId={communityId} periodId={periodId} />}
      {canPost && (
        <div className="mt-4 space-y-4">
          <SaveForm submitLabel="Open collection period" onSubmit={(data) => rpc("open_collection_period", {
            p_community: communityId,
            p_financial_year: data.year,
            p_month: data.month,
            p_due_on: data.due,
            p_amount: data.amount,
          }).then(() => periods.reload())}>
            <Field label="Financial year"><input className={control} name="year" placeholder="2026-27" required /></Field>
            <Field label="Month"><input className={control} type="date" name="month" required /></Field>
            <Field label="Due date"><input className={control} type="date" name="due" required /></Field>
            <Field label="Amount per unit"><input className={control} name="amount" inputMode="decimal" required /></Field>
          </SaveForm>
          {!!(demands.data || []).length && (
            <SaveForm submitLabel="Record offline payment" onSubmit={(data) => rpc("record_collection", {
              p_demand: data.demand,
              p_amount: data.amount,
              p_paid_on: data.paid,
              p_mode: data.mode,
              p_bank_reference: data.reference,
              p_receipt_number: data.receipt,
              p_key: data.key || crypto.randomUUID(),
              p_bank_account: data.bank,
              p_fund_account: data.fund,
            }).then(() => { summary.reload(); onPosted(); myDues.reload(); })}>
              <Field label="Unit demand">
                <select className={control} name="demand" required>
                  {(demands.data || []).map((demand) => <option key={demand.id} value={demand.id}>{demand.units?.number} · {inr(Number(demand.expected_amount) + Number(demand.additional_amount))}</option>)}
                </select>
              </Field>
              <Field label="Amount received"><input className={control} name="amount" inputMode="decimal" required /></Field>
              <Field label="Payment date"><input className={control} type="date" name="paid" required /></Field>
              <Field label="Mode"><input className={control} name="mode" required /></Field>
              <Field label="Bank reference"><input className={control} name="reference" /></Field>
              <Field label="Receipt number"><input className={control} name="receipt" required /></Field>
              <Field label="Idempotency key"><input className={control} name="key" placeholder="Leave blank to generate one" /></Field>
              <AccountSelect label="Bank ledger" name="bank" accounts={accountsOf(ledger, "bank")} />
              <AccountSelect label="Fund" name="fund" accounts={accountsOf(ledger, "fund")} />
            </SaveForm>
          )}
        </div>
      )}
    </div>
  );
}

function AccountSelect({ label, name, accounts }) {
  return (
    <Field label={label}>
      <select className={control} name={name} required>
        {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
      </select>
    </Field>
  );
}

function CollectionRegister({ communityId, periodId }) {
  const [status, setStatus] = useState("all");
  const [queryText, setQueryText] = useState("");
  const register = useLoad(
    () => rpc("period_collection_register", { p_community: communityId, p_period: periodId }),
    [communityId, periodId],
  );
  const rowsList = asList(register.data).filter((row) => {
    const matchesStatus = status === "all" || row.payment_status === status;
    const haystack = `${row.unit_number} ${row.last_receipt_number || ""} ${row.last_bank_reference || ""}`.toLowerCase();
    return matchesStatus && haystack.includes(queryText.trim().toLowerCase());
  });
  return (
    <div className="mt-6">
      <h3 className="mb-2 font-semibold">Collection register</h3>
      <p className="mb-3 text-sm text-slate-400">Unit-level dues for authorized finance roles. Residents only see their own units above.</p>
      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <Field label="Search"><input className={control} value={queryText} onChange={(event) => setQueryText(event.target.value)} placeholder="Unit, receipt, reference" /></Field>
        <Field label="Status">
          <select className={control} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="outstanding">Outstanding</option>
          </select>
        </Field>
      </div>
      <PageStatus loading={register.loading} error={register.error} onRetry={register.reload} empty={!register.loading && !rowsList.length} title="No demands in this period" body="Open the period for occupied units first." />
      <ul className="space-y-2 text-sm">
        {rowsList.map((row) => (
          <li key={row.demand_id} className="border border-slate-800 bg-white p-3">
            <div className="flex flex-wrap justify-between gap-2">
              <strong>Unit {row.unit_number}</strong>
              <span className="uppercase tracking-wide text-xs">{row.payment_status}</span>
            </div>
            <p>Billed {inr(row.billed_amount)} · Received {inr(row.collected_amount)} · Outstanding {inr(row.outstanding_amount)}</p>
            <p className="text-slate-400">Due {row.due_on} · {row.days_overdue > 0 ? `${row.days_overdue} days overdue` : "not overdue"}</p>
            <p className="text-slate-400">Last payment {row.last_paid_on || "—"} · {row.last_payment_mode || "—"} · receipt {row.last_receipt_number || "—"}</p>
            <p className="font-mono text-xs text-slate-500">Demand {row.demand_id}</p>
          </li>
        ))}
      </ul>
      {!!rowsList.length && (
        <button
          type="button"
          className="mt-3 min-h-12 border border-slate-600 px-3"
          onClick={() => downloadText("collection-register.csv", toCsv(rowsList.map((row) => ({
            unit: row.unit_number,
            billed: row.billed_amount,
            collected: row.collected_amount,
            outstanding: row.outstanding_amount,
            due_on: row.due_on,
            status: row.payment_status,
            receipt: row.last_receipt_number,
            reference: row.last_bank_reference,
          }))))}
        >
          Export register CSV
        </button>
      )}
    </div>
  );
}

function Expenses({ communityId, canPost, canReview, expenses, funds, banks, onPosted }) {
  const [queryText, setQueryText] = useState("");
  const [status, setStatus] = useState("all");
  const visible = (expenses.data || []).filter((expense) => {
    const haystack = `${expense.description} ${expense.payee} ${expense.expense_number}`.toLowerCase();
    const matchesText = haystack.includes(queryText.trim().toLowerCase());
    const matchesStatus = status === "all" || expense.approval_status === status || expense.payment_status === status;
    return matchesText && matchesStatus;
  });
  return (
    <div>
      <h2 className="mb-3 font-display text-xl font-semibold">Expenses</h2>
      <div className="mb-3 grid gap-3">
        <Field label="Search">
          <input className={control} value={queryText} onChange={(event) => setQueryText(event.target.value)} placeholder="Description, payee, or number" />
        </Field>
        <FilterSheet label={status === "all" ? "Filter by status" : `Status: ${status}`}>
          <Field label="Status">
            <select className={control} value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">All</option>
              {["pending", "approved", "rejected", "paid", "unpaid"].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </Field>
        </FilterSheet>
      </div>
      <PageStatus loading={expenses.loading} error={expenses.error} onRetry={expenses.reload} empty={!expenses.loading && !expenses.error && !(expenses.data || []).length} title="No expenses recorded" body="Published expenses appear here with their approval and auditor status." />
      {!!(expenses.data || []).length && !visible.length && <p className="text-sm text-slate-400">No expenses match this search.</p>}
      <ul className="border border-slate-800 bg-white">
        {visible.map((expense) => (
          <li key={expense.id} className="border-b border-slate-800 p-3 text-sm last:border-b-0">
            <div className="flex flex-wrap justify-between gap-2">
              <strong>{expense.expense_number}</strong>
              <span className="tabular">{inr(expense.amount)}</span>
            </div>
            <p>{expense.description} · {expense.payee}</p>
            <p className="text-slate-400">{expense.occurred_on} · {expense.expense_categories?.name}</p>
            <p className="mt-1 text-sm">Approval {expense.approval_status} · Auditor {expense.auditor_status} · Payment {expense.payment_status}</p>
            {canPost && expense.approval_status === "pending" && (
              <SaveForm confirmMessage="Record this expense decision?" submitLabel="Record decision" onSubmit={(data) => rpc("decide_expense", { p_expense: expense.id, p_decision: data.decision, p_comments: data.comments }).then(expenses.reload)}>
                <Field label="Decision"><select className={control} name="decision"><option value="approved">approved</option><option value="rejected">rejected</option></select></Field>
                <Field label="Comments"><input className={control} name="comments" /></Field>
              </SaveForm>
            )}
            {canPost && expense.approval_status === "approved" && expense.payment_status !== "paid" && (
              <SaveForm confirmMessage="Pay this expense from the selected bank ledger?" submitLabel="Pay expense" onSubmit={(data) => rpc("pay_expense", { p_expense: expense.id, p_bank_account: data.bank, p_mode: data.mode, p_reference: data.reference, p_key: data.key || crypto.randomUUID() }).then(() => { expenses.reload(); onPosted(); })}>
                <AccountSelect label="Bank ledger" name="bank" accounts={banks} />
                <Field label="Mode"><input className={control} name="mode" required /></Field>
                <Field label="Reference"><input className={control} name="reference" /></Field>
                <Field label="Idempotency key"><input className={control} name="key" /></Field>
              </SaveForm>
            )}
            {canReview && (
              <SaveForm submitLabel="Record auditor review" onSubmit={(data) => rpc("review_subject", { p_community: communityId, p_subject_type: "expense", p_subject_id: expense.id, p_status: data.status, p_comments: data.comments }).then(expenses.reload)}>
                <Field label="Outcome">
                  <select className={control} name="status">
                    {["verified", "clarification_required", "disputed", "resolved"].map((status) => <option key={status}>{status}</option>)}
                  </select>
                </Field>
                <Field label="Comments"><input className={control} name="comments" /></Field>
              </SaveForm>
            )}
          </li>
        ))}
      </ul>
      {canPost && (
        <SaveForm submitLabel="Submit expense" onSubmit={(data) => rpc("create_expense", {
          p_community: communityId,
          p_date: data.date,
          p_fund: data.fund,
          p_category: data.category,
          p_description: data.description,
          p_payee: data.payee,
          p_amount: data.amount,
          p_emergency: data.emergency === "on",
          p_justification: data.justification,
        }).then(expenses.reload)}>
          <Field label="Date"><input className={control} type="date" name="date" required /></Field>
          <AccountSelect label="Fund" name="fund" accounts={funds} />
          <Field label="Category"><select className={control} name="category">{EXPENSE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></Field>
          <Field label="Description"><input className={control} name="description" required /></Field>
          <Field label="Vendor or payee"><input className={control} name="payee" required /></Field>
          <Field label="Amount"><input className={control} name="amount" inputMode="decimal" required /></Field>
          <label className="text-sm"><input type="checkbox" name="emergency" /> Emergency expense</label>
          <Field label="Emergency justification"><input className={control} name="justification" /></Field>
        </SaveForm>
      )}
    </div>
  );
}

function Reconciliation({ communityId, banks, canPost }) {
  const [preview, setPreview] = useState([]);
  const [previewError, setPreviewError] = useState("");
  const existing = useLoad(() => rows(supabase.from("bank_reconciliations").select("id,period_start,period_end,status,difference").eq("community_id", communityId).order("period_end", { ascending: false })), [communityId]);
  return (
    <div>
      <h2 className="mb-3 text-xl font-semibold">Bank reconciliation</h2>
      <p className="mb-3 text-sm text-slate-400">A reconciliation stays open until every statement line is matched and the difference is zero. Book balance and statement balance are both kept.</p>
      <PageStatus loading={existing.loading} error={existing.error} onRetry={existing.reload} empty={!existing.loading && !existing.error && !(existing.data || []).length} title="No reconciliation started" body="The treasurer imports a statement and matches each line before the period can be called reconciled." />
      <ul className="mb-3 space-y-2 text-sm">{(existing.data || []).map((row) => (
        <li key={row.id} className="rounded-lg border border-slate-800 p-3">
          <p>{row.period_start} to {row.period_end} · {row.status} · difference {row.difference == null ? "not completed" : inr(row.difference)}</p>
          {canPost && row.status !== "reconciled" && (
            <>
              <SaveForm submitLabel="Match a statement line" onSubmit={(data) => rpc("match_statement_line", { p_line: data.line, p_entry: data.entry })}>
                <Field label="Statement line id"><input className={control} name="line" required /></Field>
                <Field label="Journal entry id"><input className={control} name="entry" required /></Field>
              </SaveForm>
              <SaveForm submitLabel="Complete reconciliation" onSubmit={async () => {
                const difference = await rpc("complete_reconciliation", { p_reconciliation: row.id });
                existing.reload();
                if (difference == null) throw new Error("Unmatched statement lines remain. The reconciliation stays open.");
                if (Number(difference) !== 0) throw new Error(`The bank statement does not match the books (${difference}). The reconciliation stays open.`);
              }}>
                <p className="text-sm text-slate-400">Completion is refused while any line is unmatched or the statement and book balances differ.</p>
              </SaveForm>
            </>
          )}
        </li>
      ))}</ul>
      {canPost && <SaveForm submitLabel="Start reconciliation" onSubmit={async (data) => {
        if (previewError || !preview.length) throw new Error(previewError || "Add a CSV with date, description, direction, amount.");
        const id = await rpc("start_reconciliation", {
          p_community: communityId,
          p_bank_account: data.bank,
          p_start: data.start,
          p_end: data.end,
          p_opening: data.opening,
          p_closing: data.closing,
        });
        await rpc("import_statement_lines", { p_reconciliation: id, p_lines: preview });
        setPreview([]);
        existing.reload();
      }}>
        <AccountSelect label="Bank ledger" name="bank" accounts={banks} />
        <Field label="Period start"><input className={control} type="date" name="start" required /></Field>
        <Field label="Period end"><input className={control} type="date" name="end" required /></Field>
        <Field label="Statement opening"><input className={control} name="opening" inputMode="decimal" required /></Field>
        <Field label="Statement closing"><input className={control} name="closing" inputMode="decimal" required /></Field>
        <Field label="Statement CSV">
          <textarea className={control} rows={5} placeholder={"date,description,direction,amount\n2026-04-02,Maintenance,credit,1000"} onChange={(event) => {
            const parsed = parseStatement(event.target.value);
            setPreview(parsed.lines);
            setPreviewError(parsed.error);
          }} />
        </Field>
        {previewError && <p role="alert" className="text-sm text-red-700">{previewError}</p>}
        {!!preview.length && <p className="text-sm text-slate-400">{preview.length} lines ready to import. Nothing is saved until you start the reconciliation.</p>}
      </SaveForm>}
    </div>
  );
}

function parseStatement(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return { lines: [], error: "" };
  const header = lines[0].toLowerCase().split(",").map((part) => part.trim());
  const index = (name) => header.indexOf(name);
  if (["date", "description", "direction", "amount"].some((name) => index(name) < 0)) {
    return { lines: [], error: "CSV needs the columns date, description, direction, amount." };
  }
  const parsed = [];
  for (const line of lines.slice(1)) {
    const parts = line.split(",");
    const direction = parts[index("direction")]?.trim();
    const amount = parts[index("amount")]?.trim();
    if (!["credit", "debit"].includes(direction)) return { lines: [], error: `Direction must be credit or debit: ${line}` };
    if (!amount || Number.isNaN(Number(amount))) return { lines: [], error: `Amount is not a number: ${line}` };
    parsed.push({ date: parts[index("date")].trim(), description: parts[index("description")].trim(), direction, amount });
  }
  return { lines: parsed, error: "" };
}

function Reviews({ communityId, roles = [] }) {
  const canRaise = roles.includes("resident_auditor");
  const canRespond = roles.some((role) => ["treasurer", "committee_admin", "platform_admin"].includes(role));
  const reviews = useLoad(() => rows(supabase.from("audit_reviews").select("id,subject_type,status,comments,created_at").eq("community_id", communityId).order("created_at", { ascending: false })), [communityId]);
  const observations = useLoad(() => rows(supabase.from("audit_observations").select("id,title,body,status,subject_type,response_body,resolution_note,created_at,responded_at").eq("community_id", communityId).order("created_at", { ascending: false })), [communityId]);
  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-3 text-xl font-semibold">Audit observations</h2>
        <p className="mb-3 text-sm text-slate-400">Independent findings. Auditors raise them; treasurers respond; auditors close them. Ledger rows are never edited from here.</p>
        <PageStatus loading={observations.loading} error={observations.error} onRetry={observations.reload} empty={!observations.loading && !observations.error && !(observations.data || []).length} title="No observations yet" body="Raise a finding when a statement, expense, or bank line needs clarification." />
        <ul className="space-y-2 text-sm">
          {(observations.data || []).map((row) => (
            <li key={row.id} className="border border-slate-800 bg-white p-3">
              <p className="font-semibold">{row.title}</p>
              <p className="text-slate-400">{row.subject_type} · {row.status}</p>
              <p className="mt-2">{row.body}</p>
              {row.response_body && <p className="mt-2 border-t border-slate-800 pt-2"><span className="text-slate-400">Response: </span>{row.response_body}</p>}
              {row.resolution_note && <p className="mt-1 text-slate-400">Closure note: {row.resolution_note}</p>}
              {canRespond && ["open", "awaiting_response"].includes(row.status) && (
                <SaveForm submitLabel="Send response" onSubmit={(data) => rpc("respond_audit_observation", { p_observation: row.id, p_response: data.response }).then(observations.reload)}>
                  <Field label="Response"><textarea className={control} name="response" rows={3} required /></Field>
                </SaveForm>
              )}
              {canRaise && row.status === "responded" && (
                <SaveForm submitLabel="Close observation" onSubmit={(data) => rpc("resolve_audit_observation", { p_observation: row.id, p_status: data.status, p_note: data.note || null }).then(observations.reload)}>
                  <Field label="Outcome">
                    <select className={control} name="status" defaultValue="resolved">
                      <option value="resolved">Resolved</option>
                      <option value="unresolved">Unresolved</option>
                    </select>
                  </Field>
                  <Field label="Note"><input className={control} name="note" /></Field>
                </SaveForm>
              )}
            </li>
          ))}
        </ul>
        {canRaise && (
          <SaveForm submitLabel="Raise observation" onSubmit={(data) => rpc("raise_audit_observation", {
            p_community: communityId,
            p_title: data.title,
            p_body: data.body,
            p_subject_type: data.subject_type,
          }).then(observations.reload)}>
            <Field label="Title"><input className={control} name="title" required /></Field>
            <Field label="Subject type">
              <select className={control} name="subject_type" defaultValue="general">
                {["general", "expense", "statement", "collection", "journal", "bank"].map((value) => <option key={value}>{value}</option>)}
              </select>
            </Field>
            <Field label="Finding"><textarea className={control} name="body" rows={4} required /></Field>
          </SaveForm>
        )}
      </div>
      <div>
        <h2 className="mb-3 text-xl font-semibold">Subject reviews</h2>
        <PageStatus loading={reviews.loading} error={reviews.error} onRetry={reviews.reload} empty={!reviews.loading && !reviews.error && !(reviews.data || []).length} title="No auditor reviews yet" body="An elected resident auditor records verification, clarification, or a dispute here." />
        <ul className="space-y-2 text-sm">{(reviews.data || []).map((review) => <li key={review.id} className="rounded-lg border border-slate-800 p-3">{review.subject_type} · {review.status} · {review.comments || "No comment"}</li>)}</ul>
      </div>
    </div>
  );
}

function Statements({ communityId, canPost, canReview }) {
  const query = useLoad(() => rows(supabase.from("financial_statements").select("id,period_start,period_end,status,due_on").eq("community_id", communityId).order("period_end", { ascending: false })), [communityId]);
  return (
    <div>
      <h2 className="mb-3 text-xl font-semibold">Financial statements</h2>
      <PageStatus loading={query.loading} error={query.error} onRetry={query.reload} empty={!query.loading && !query.error && !(query.data || []).length} title="No statement opened" body="Overdue statements stay visible. A statement is never marked reviewed on its own." />
      <ul className="space-y-2 text-sm">
        {(query.data || []).map((statement) => (
          <li key={statement.id} className="border border-slate-800 bg-white p-3">
            <p className="font-semibold">{statement.status}</p>
            <p className="text-sm text-slate-400">{statement.period_start} to {statement.period_end} · due {statement.due_on}</p>
            <div className="mt-3 grid gap-2">
              <button type="button" className="min-h-12 border border-slate-800 bg-white px-3" onClick={() => window.print()}>Print this view</button>
              {canPost && statement.status === "draft" && <button type="button" className="min-h-12 bg-[#252525] px-3 font-semibold text-white" onClick={() => { if (window.confirm("Submit this statement for auditor review?")) rpc("submit_statement", { p_statement: statement.id }).then(query.reload); }}>Submit for review</button>}
              {canReview && <button type="button" className="min-h-12 border border-slate-800 bg-white px-3" onClick={() => { if (window.confirm("Record this statement as verified?")) rpc("review_statement", { p_statement: statement.id, p_status: "verified", p_comments: "Reviewed in the app" }).then(query.reload); }}>Record review</button>}
              {canPost && statement.status === "reconciled_and_reviewed" && <button type="button" className="min-h-12 bg-[#0878E8] px-3 font-semibold text-white" onClick={() => { if (window.confirm("Publish this statement? Residents will be able to read it.")) rpc("publish_statement", { p_statement: statement.id, p_with_exceptions: false }).then(query.reload); }}>Publish</button>}
              {canPost && (statement.status === "published" || statement.status === "published_with_exceptions") && <button type="button" className="min-h-12 border border-slate-800 bg-white px-3" onClick={() => { if (window.confirm("Publish a corrected version? Older versions stay on record.")) rpc("append_statement_version", { p_statement: statement.id, p_with_exceptions: false }).then(query.reload); }}>Publish a corrected version</button>}
            </div>
          </li>
        ))}
      </ul>
      {canPost && (
        <SaveForm submitLabel="Close month" onSubmit={(data) => rpc("close_month", { p_community: communityId, p_start: data.start, p_end: data.end }).then(query.reload)}>
          <Field label="Period start"><input className={control} type="date" name="start" required /></Field>
          <Field label="Period end"><input className={control} type="date" name="end" required /></Field>
        </SaveForm>
      )}
    </div>
  );
}

export function ConcernsScreen({ communityId, roles }) {
  const committee = roles.includes("committee_admin") || roles.includes("platform_admin");
  const [raising, setRaising] = useState(false);
  const [openId, setOpenId] = useState("");
  const query = useLoad(() => rows(supabase.from("tickets").select("id,ticket_number,subject,category,visibility,status,priority,created_at,updated_at").eq("community_id", communityId).order("created_at", { ascending: false })), [communityId]);
  const updates = useLoad(
    () => openId ? rows(supabase.from("ticket_updates").select("id,body,created_at").eq("ticket_id", openId).order("created_at")) : Promise.resolve([]),
    [openId],
  );
  return (
    <section className="dash">
      <header className="dash-welcome">
        <h1>Concerns</h1>
        <p>A public concern can be read by residents. A private concern stays with you and the committee.</p>
      </header>
      <div className="demo-actions">
        <button type="button" className="demo-primary" onClick={() => setRaising((open) => !open)}>{raising ? "Close the form" : "Raise concern"}</button>
      </div>
      {raising && (
      <SaveForm submitLabel="Submit concern" onSubmit={(data) => rpc("create_ticket", {
        p_community: communityId,
        p_subject: data.subject,
        p_category: data.category,
        p_description: data.description,
        p_visibility: data.visibility,
        p_unit_number: data.unit || null,
        p_priority: data.priority,
      }).then(() => { setRaising(false); query.reload(); })}>
        <Field label="Subject"><input className={control} name="subject" required /></Field>
        <Field label="Category"><select className={control} name="category">{TICKET_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></Field>
        <Field label="Who can read it">
          <select className={control} name="visibility" defaultValue="public">
            <option value="public">Public — every resident can read this</option>
            <option value="private">Private — only you and the committee</option>
          </select>
        </Field>
        <Field label="Unit number, if it applies"><input className={control} name="unit" inputMode="text" /></Field>
        <Field label="Priority"><select className={control} name="priority" defaultValue="medium"><option>low</option><option>medium</option><option>high</option></select></Field>
        <Field label="Description"><textarea className={control} name="description" rows={4} required /></Field>
      </SaveForm>
      )}
      <article className="card" style={{ marginTop: 12 }}>
      <PageStatus loading={query.loading} error={query.error} onRetry={query.reload} empty={!query.loading && !query.error && !(query.data || []).length} title="No concerns yet" body="Raise a public or private concern and it receives a SOC-YYYY-XXXXX number." />
      <ul className="live-list">
        {(query.data || []).map((ticket) => (
          <li key={ticket.id} style={{ paddingTop: 12, paddingBottom: 12 }}>
            <div className="row">
              <span>
                <strong>{ticket.ticket_number}</strong>
                <br />
                {ticket.subject}
                <br />
                <span className="demo-secondary">{ticket.visibility === "private" ? "Private" : "Public"} · {ticket.category} · {ticket.priority}</span>
              </span>
              <span className="demo-status">{ticket.status}</span>
            </div>
            <button type="button" className="demo-text-button" style={{ marginTop: 8 }} onClick={() => setOpenId(openId === ticket.id ? "" : ticket.id)}>{openId === ticket.id ? "Hide updates" : "Show updates"}</button>
            {openId === ticket.id && (
              <div className="mt-2">
                <PageStatus loading={updates.loading} error={updates.error} onRetry={updates.reload} empty={!updates.loading && !updates.error && !(updates.data || []).length} title="No written updates yet" body="Status changes from the committee appear as notes on the concern." />
                <ul className="space-y-2">{(updates.data || []).map((update) => <li key={update.id} className="border-t border-slate-800 pt-2">{update.body}<p className="text-slate-400">{new Date(update.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p></li>)}</ul>
              </div>
            )}
            {committee && (
              <SaveForm submitLabel="Update status" onSubmit={(data) => rpc("transition_ticket", { p_ticket: ticket.id, p_status: data.status, p_note: data.note }).then(query.reload)}>
                <Field label="Status">
                  <select className={control} name="status">
                    {["assigned", "in_progress", "awaiting_resident", "resolved", "on_hold", "rejected", "closed"].map((status) => <option key={status}>{status}</option>)}
                  </select>
                </Field>
                <Field label="Note"><input className={control} name="note" /></Field>
              </SaveForm>
            )}
            {ticket.status === "resolved" && (
              <div className="demo-actions" style={{ marginTop: 8 }}>
                <button type="button" onClick={() => rpc("transition_ticket", { p_ticket: ticket.id, p_status: "closed", p_note: "Resident confirmed" }).then(query.reload)}>Confirm</button>
                <button type="button" onClick={() => rpc("transition_ticket", { p_ticket: ticket.id, p_status: "reopened", p_note: "Resident reopened" }).then(query.reload)}>Reopen</button>
              </div>
            )}
          </li>
        ))}
      </ul>
      </article>
    </section>
  );
}

export function DecisionsScreen({ communityId, roles }) {
  const committee = roles.includes("committee_admin") || roles.includes("platform_admin");
  const [openMeeting, setOpenMeeting] = useState("");
  const meetings = useLoad(() => rows(supabase.from("meetings").select("id,title,meeting_type,held_on,venue,minutes").eq("community_id", communityId).order("held_on", { ascending: false })), [communityId]);
  const resolutions = useLoad(() => rows(supabase.from("resolutions").select("id,title,description,status,voting_starts_at,voting_ends_at,meeting_id").eq("community_id", communityId).order("created_at", { ascending: false })), [communityId]);
  return (
    <section className="dash">
      <header className="dash-welcome">
        <h1>Meetings &amp; votes</h1>
        <p>Scheduled meetings and formal resolutions for this community.</p>
      </header>
      <article className="card">
        <h2>Meetings</h2>
        <PageStatus loading={meetings.loading} error={meetings.error} onRetry={meetings.reload} empty={!meetings.loading && !meetings.error && !(meetings.data || []).length} title="No meetings recorded" body="Committee, general body, emergency, and special meetings are listed after they are scheduled." />
        <ul className="live-list">{(meetings.data || []).map((meeting) => {
          const upcoming = new Date(meeting.held_on).getTime() >= Date.now();
          const linked = (resolutions.data || []).filter((row) => row.meeting_id === meeting.id);
          return (
            <li key={meeting.id} style={{ paddingTop: 12, paddingBottom: 12 }}>
              <button type="button" className="row" onClick={() => setOpenMeeting(openMeeting === meeting.id ? "" : meeting.id)}>
                <span>
                  <span className="demo-status">{upcoming ? "Upcoming" : "Past"}</span>{" "}
                  <span className="demo-secondary">{meeting.meeting_type}</span>
                  <br />
                  <strong>{meeting.title}</strong>
                  <br />
                  <span className="demo-secondary">{new Date(meeting.held_on).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} · {meeting.venue || "Venue not recorded"}</span>
                </span>
              </button>
              {openMeeting === meeting.id && (
                <div className="demo-detail">
                  <p><span className="demo-secondary">Minutes / agenda: </span>{meeting.minutes || "Not published yet"}</p>
                  <p className="demo-secondary">Linked resolutions: {linked.length ? linked.map((row) => row.title).join("; ") : "None yet"}</p>
                </div>
              )}
            </li>
          );
        })}</ul>
        {committee && (
          <SaveForm submitLabel="Schedule meeting" onSubmit={(data) => rpc("create_meeting", { p_community: communityId, p_type: data.type, p_title: data.title, p_held_on: new Date(data.when).toISOString(), p_venue: data.venue }).then(meetings.reload)}>
            <Field label="Type"><select className={control} name="type">{["committee", "general_body", "emergency", "special"].map((type) => <option key={type}>{type}</option>)}</select></Field>
            <Field label="Title"><input className={control} name="title" required /></Field>
            <Field label="When"><input className={control} type="datetime-local" name="when" required /></Field>
            <Field label="Venue or link"><input className={control} name="venue" /></Field>
          </SaveForm>
        )}
      </article>
      <article className="card">
        <h2>Resolutions</h2>
        <PageStatus loading={resolutions.loading} error={resolutions.error} onRetry={resolutions.reload} empty={!resolutions.loading && !resolutions.error && !(resolutions.data || []).length} title="No resolutions" body="A resolution is a formal decision. A chat poll is not recorded as approved." />
        <ul className="live-list">
          {(resolutions.data || []).map((resolution) => (
            <li key={resolution.id} style={{ paddingTop: 12, paddingBottom: 12 }}>
              <div className="row">
                <span>
                  <strong>{resolution.title}</strong>
                  <br />
                  <span className="demo-secondary">{resolution.description}</span>
                </span>
                <span className="demo-status">{resolution.status}</span>
              </div>
              <div className="demo-actions" style={{ marginTop: 8 }}>
                {["yes", "no", "abstain"].map((vote) => <button key={vote} type="button" onClick={() => rpc("cast_vote", { p_resolution: resolution.id, p_vote: vote }).then(resolutions.reload)}>{vote}</button>)}
                {committee && <button type="button" onClick={() => { if (window.confirm("Close this vote?")) rpc("close_vote", { p_resolution: resolution.id }).then(resolutions.reload); }}>Close vote</button>}
              </div>
            </li>
          ))}
        </ul>
        {committee && (
          <SaveForm submitLabel="Propose resolution" onSubmit={(data) => rpc("propose_resolution", {
            p_community: communityId,
            p_meeting: data.meeting || null,
            p_title: data.title,
            p_description: data.description,
            p_voting_starts: new Date(data.starts).toISOString(),
            p_voting_ends: new Date(data.ends).toISOString(),
          }).then(resolutions.reload)}>
            <Field label="Meeting">
              <select className={control} name="meeting">
                <option value="">None</option>
                {(meetings.data || []).map((meeting) => <option key={meeting.id} value={meeting.id}>{meeting.title}</option>)}
              </select>
            </Field>
            <Field label="Title"><input className={control} name="title" required /></Field>
            <Field label="Description"><textarea className={control} name="description" required /></Field>
            <Field label="Voting starts"><input className={control} type="datetime-local" name="starts" required /></Field>
            <Field label="Voting ends"><input className={control} type="datetime-local" name="ends" required /></Field>
          </SaveForm>
        )}
      </article>
    </section>
  );
}

export function DocumentsScreen({ communityId, roles }) {
  const canUpload = roles.some((role) => ["treasurer", "committee_admin", "platform_admin"].includes(role));
  const query = useLoad(() => rows(supabase.from("documents").select("id,name,category,description,access_class,storage_bucket,redacted,storage_path,created_at").eq("community_id", communityId).order("created_at", { ascending: false })), [communityId]);
  return (
    <section>
      <h2 className="mb-1 text-xl font-semibold">Documents</h2>
      <p className="mb-4 text-sm text-slate-400">A public invoice has to be a separate redacted file. The original stays in the committee bucket.</p>
      <PageStatus loading={query.loading} error={query.error} onRetry={query.reload} empty={!query.loading && !query.error && !(query.data || []).length} title="No documents published" body="Financial statements, minutes, and redacted invoices show up here." />
      <ul className="mb-4 space-y-2 text-sm">
        {(query.data || []).map((document) => (
          <li key={document.id} className="rounded-lg border border-slate-800 p-3">
            <strong>{document.name}</strong>
            <p className="text-slate-400">{document.category} · {document.access_class === "public" ? (document.redacted ? "Resident copy, sensitive details removed" : "Resident visible") : "Restricted original"}</p>
            <p className="text-slate-400">{document.description}</p>
            <button type="button" className="mt-2 min-h-12 w-full border border-slate-800" onClick={() => openDocument(document).catch((error) => window.alert(error.message))}>Open</button>
          </li>
        ))}
      </ul>
      {canUpload && <DocumentForm communityId={communityId} onSaved={query.reload} />}
    </section>
  );
}

async function openDocument(document) {
  const bucket = document.storage_bucket || (document.access_class === "public" ? "community-published" : "community-originals");
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(document.storage_path, 60);
  if (error || !data?.signedUrl) throw new Error(error?.message || "Could not open the file.");
  window.open(data.signedUrl, "_blank", "noopener");
}

function DocumentForm({ communityId, onSaved }) {
  const [file, setFile] = useState(null);
  return (
    <SaveForm submitLabel="Register document" onSubmit={async (data) => {
      if (!file) throw new Error("Choose a file.");
      if (data.category === "invoice" && data.access === "public" && data.redacted !== "on") {
        throw new Error("A public invoice must be a file that already has sensitive details removed.");
      }
      const bucket = data.access === "public" ? "community-published" : "community-originals";
      const path = `${communityId}/${crypto.randomUUID()}-${file.name}`;
      const uploaded = await supabase.storage.from(bucket).upload(path, file);
      if (uploaded.error) throw new Error(uploaded.error.message);
      await rpc("register_document", {
        p_community: communityId,
        p_name: data.name,
        p_category: data.category,
        p_description: data.description,
        p_access_class: data.access,
        p_redacted: data.redacted === "on",
        p_storage_bucket: bucket,
        p_storage_path: path,
      });
      onSaved();
    }}>
      <Field label="Name"><input className={control} name="name" required /></Field>
      <Field label="Category"><select className={control} name="category">{["financial_statement", "bank_statement", "invoice", "quotation", "corpus", "minutes", "resolution", "vendor_agreement", "amc", "policy", "other"].map((category) => <option key={category}>{category}</option>)}</select></Field>
      <Field label="Description"><input className={control} name="description" /></Field>
      <Field label="Access"><select className={control} name="access"><option value="public">Public to residents</option><option value="committee">Committee and auditors</option><option value="private_unit">One unit and the committee</option></select></Field>
      <label className="text-sm"><input type="checkbox" name="redacted" /> This file already has sensitive details removed</label>
      <Field label="File"><input className={control} type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} /></Field>
    </SaveForm>
  );
}

export function UnitsScreen({ communityId }) {
  const units = useLoad(() => rows(supabase.from("units").select("id,block,number").eq("community_id", communityId).order("number")), [communityId]);
  const [preview, setPreview] = useState({ rows: [], errors: [] });
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Residents and units</h2>
      <PageStatus loading={units.loading} error={units.error} onRetry={units.reload} empty={!units.loading && !units.error && !(units.data || []).length} title="No units yet" body="Add units before opening a collection period. Occupancy links a registered resident to a unit." />
      <ul className="text-sm">{(units.data || []).map((unit) => <li key={unit.id}>{unit.block ? `${unit.block}-` : ""}{unit.number}</li>)}</ul>
      <SaveForm submitLabel="Add unit" onSubmit={(data) => rpc("add_unit", { p_community: communityId, p_block: data.block, p_number: data.number }).then(units.reload)}>
        <Field label="Block"><input className={control} name="block" /></Field>
        <Field label="Number"><input className={control} name="number" required /></Field>
      </SaveForm>
      <SaveForm submitLabel="Link resident" onSubmit={(data) => rpc("add_occupancy", { p_community: communityId, p_unit_number: data.number, p_email: data.email, p_relationship: data.relationship }).then(units.reload)}>
        <Field label="Unit number"><input className={control} name="number" required /></Field>
        <Field label="Resident email"><input className={control} type="email" name="email" required /></Field>
        <Field label="Relationship"><select className={control} name="relationship"><option>owner</option><option>tenant</option></select></Field>
      </SaveForm>
      <div className="rounded-xl border border-slate-800 p-4">
        <h3 className="font-semibold">Import units</h3>
        <p className="mb-2 text-sm text-slate-400">CSV columns: block, number. The preview does not write anything.</p>
        <textarea className={control} rows={5} onChange={(event) => setPreview(parseUnits(event.target.value, units.data || []))} />
        {!!preview.errors.length && <ul className="mt-2 text-sm text-red-700">{preview.errors.map((error) => <li key={error}>{error}</li>)}</ul>}
        {!!preview.rows.length && <p className="mt-2 text-sm text-slate-400">{preview.rows.length} units ready.</p>}
        <button
          type="button"
          className="mt-3 min-h-12 w-full bg-amber-500 px-3 py-2 font-semibold text-white disabled:opacity-60"
          disabled={!preview.rows.length || preview.errors.length > 0}
          onClick={async () => {
            for (const row of preview.rows) await rpc("add_unit", { p_community: communityId, p_block: row.block, p_number: row.number });
            setPreview({ rows: [], errors: [] });
            units.reload();
          }}
        >Import listed units</button>
      </div>
    </section>
  );
}

function parseUnits(text, existing) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return { rows: [], errors: [] };
  const rows = [];
  const errors = [];
  const seen = new Set(existing.map((unit) => unit.number));
  lines.forEach((line, index) => {
    if (index === 0 && line.toLowerCase().startsWith("block")) return;
    const [block, number] = line.split(",").map((part) => part?.trim() || "");
    if (!number) errors.push(`Line ${index + 1} needs a unit number.`);
    else if (seen.has(number)) errors.push(`Unit ${number} is duplicated.`);
    else { seen.add(number); rows.push({ block, number }); }
  });
  return { rows, errors };
}

export function NotificationsScreen({ communityId }) {
  const query = useLoad(() => rows(supabase.from("notifications").select("id,title,body,event_type,read_at,created_at").eq("community_id", communityId).order("created_at", { ascending: false })), [communityId]);
  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold">Notifications</h2>
      <PageStatus loading={query.loading} error={query.error} onRetry={query.reload} empty={!query.loading && !query.error && !(query.data || []).length} title="No notifications" body="Statement publication, meetings, and concern updates appear here. Email and WhatsApp are not sent yet." />
      <ul className="space-y-2 text-sm">
        {(query.data || []).map((note) => (
          <li key={note.id} className="border border-slate-800 bg-white p-3">
            <p className="text-sm text-slate-400">{["statement_published", "meeting_scheduled", "resolution_proposed", "ticket_updated"].includes(note.event_type) ? "Governance" : "Notice"} · {new Date(note.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
            <strong>{note.title}</strong>
            <p>{note.body}</p>
            {!note.read_at && <button type="button" className="mt-2 text-amber-300" onClick={() => supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", note.id).then(query.reload)}>Mark read</button>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SettingsScreen({ communityId, roles = [] }) {
  const canEdit = roles.some((role) => ["committee_admin", "platform_admin"].includes(role));
  const query = useLoad(() => rows(supabase.from("community_settings").select("*").eq("community_id", communityId)), [communityId]);
  const gateway = useLoad(() => rows(supabase.from("payment_gateway_settings").select("enabled,key_id,mode,webhook_configured,provider").eq("community_id", communityId)), [communityId]);
  const settings = query.data?.[0];
  const pay = gateway.data?.[0];
  return (
    <section className="space-y-8">
      <div>
        <h2 className="mb-3 text-xl font-semibold">Community settings</h2>
        <PageStatus loading={query.loading} error={query.error} onRetry={query.reload} empty={!query.loading && !query.error && !settings} title="Settings are not available" />
        {settings && (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <Item term="Treasurer approval limit" value={inr(settings.treasurer_approval_limit)} />
            <Item term="Committee approval limit" value={inr(settings.committee_approval_limit)} />
            <Item term="Statement due day" value={String(settings.statement_due_day)} />
            <Item term="Committee quorum" value={String(settings.committee_quorum)} />
            <Item term="Auditor seats" value={String(settings.auditor_seats)} />
            <Item term="Election quorum" value={`${settings.election_quorum_percent}%`} />
            <Item term="Voting basis" value={settings.voting_unit} />
            <Item term="Timezone" value={settings.timezone} />
          </dl>
        )}
        {canEdit && settings && (
          <SaveForm submitLabel="Save settings" onSubmit={(data) => rpc("update_community_settings", {
            p_community: communityId,
            p_treasurer_limit: Number(data.treasurer),
            p_committee_limit: Number(data.committee),
            p_statement_due_day: Number(data.due),
            p_committee_quorum: Number(data.quorum),
            p_auditor_seats: Number(data.seats),
            p_election_quorum_percent: Number(data.election),
            p_voting_unit: data.voting,
          }).then(query.reload)}>
            <Field label="Treasurer approval limit"><input className={control} name="treasurer" inputMode="decimal" defaultValue={settings.treasurer_approval_limit} required /></Field>
            <Field label="Committee approval limit"><input className={control} name="committee" inputMode="decimal" defaultValue={settings.committee_approval_limit} required /></Field>
            <Field label="Statement due day"><input className={control} name="due" type="number" min="1" max="28" defaultValue={settings.statement_due_day} required /></Field>
            <Field label="Committee quorum"><input className={control} name="quorum" type="number" min="1" defaultValue={settings.committee_quorum} required /></Field>
            <Field label="Auditor seats"><input className={control} name="seats" type="number" min="1" defaultValue={settings.auditor_seats} required /></Field>
            <Field label="Election quorum %"><input className={control} name="election" inputMode="decimal" defaultValue={settings.election_quorum_percent} required /></Field>
            <Field label="Voting basis">
              <select className={control} name="voting" defaultValue={settings.voting_unit}>
                <option value="unit">Per unit</option>
                <option value="member">Per member</option>
              </select>
            </Field>
          </SaveForm>
        )}
        <p className="mt-3 text-sm text-slate-400">Every settings change is written to the audit log.</p>
      </div>
      <div>
        <h2 className="mb-3 text-xl font-semibold">Payment gateway</h2>
        <p className="mb-3 text-sm text-slate-400">Razorpay boundary only. Secret keys stay in server secrets — never in this form. Offline payment proof remains available when the gateway is off.</p>
        <PageStatus loading={gateway.loading} error={gateway.error} onRetry={gateway.reload} empty={!gateway.loading && !gateway.error && !pay} title="Gateway not configured" body="Enable Razorpay when key_id and webhook secrets are ready in the project." />
        {pay && (
          <dl className="mb-3 grid gap-2 text-sm sm:grid-cols-2">
            <Item term="Provider" value={pay.provider} />
            <Item term="Status" value={pay.enabled ? `Enabled · ${pay.mode}` : `Disabled · ${pay.mode}`} />
            <Item term="Key id" value={pay.key_id || "—"} />
            <Item term="Webhook" value={pay.webhook_configured ? "Configured" : "Not configured"} />
          </dl>
        )}
        {canEdit && (
          <SaveForm submitLabel="Save gateway settings" onSubmit={(data) => rpc("configure_payment_gateway", {
            p_community: communityId,
            p_enabled: data.enabled === "true",
            p_key_id: data.key_id || null,
            p_mode: data.mode,
            p_webhook_configured: data.webhook === "true",
          }).then(gateway.reload)}>
            <Field label="Enabled">
              <select className={control} name="enabled" defaultValue={pay?.enabled ? "true" : "false"}>
                <option value="false">Disabled</option>
                <option value="true">Enabled</option>
              </select>
            </Field>
            <Field label="Mode">
              <select className={control} name="mode" defaultValue={pay?.mode || "unconfigured"}>
                <option value="unconfigured">Unconfigured</option>
                <option value="test">Test</option>
                <option value="live">Live</option>
              </select>
            </Field>
            <Field label="Razorpay key id (public)"><input className={control} name="key_id" defaultValue={pay?.key_id || ""} placeholder="rzp_test_…" /></Field>
            <Field label="Webhook configured on server">
              <select className={control} name="webhook" defaultValue={pay?.webhook_configured ? "true" : "false"}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </Field>
          </SaveForm>
        )}
      </div>
      <InviteResident communityId={communityId} roles={roles} />
    </section>
  );
}

function Item({ term, value }) {
  return <div className="rounded-lg border border-slate-800 p-3"><dt className="text-slate-400">{term}</dt><dd className="text-lg">{value}</dd></div>;
}

export function HistoryScreen({ communityId }) {
  const query = useLoad(() => rows(supabase.from("audit_logs").select("id,action,entity,created_at").eq("community_id", communityId).order("created_at", { ascending: false }).limit(50)), [communityId]);
  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold">Audit history</h2>
      <PageStatus loading={query.loading} error={query.error} onRetry={query.reload} empty={!query.loading && !query.error && !(query.data || []).length} title="No audit events yet" body="Sensitive financial actions are written here and are not deleted from the app." />
      <ul className="space-y-2 text-sm">{(query.data || []).map((entry) => <li key={entry.id}>{entry.created_at} · {entry.action} · {entry.entity}</li>)}</ul>
    </section>
  );
}

export function ProfileScreen({ email, roles, onSignOut }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold">Profile</h2>
      <p>{email}</p>
      <p className="mt-2 text-sm text-slate-400">Roles in this community: {roles.join(", ") || "none"}</p>
      <p className="mt-4 text-sm text-slate-400">{brand.name}. {brand.descriptor}. {brand.promise}</p>
      <button type="button" className="mt-4 min-h-12 rounded-lg border border-slate-700 bg-white px-3 py-2" onClick={onSignOut}>Sign out</button>
    </section>
  );
}

export function NoticesScreen({ communityId, roles }) {
  const committee = roles.includes("committee_admin") || roles.includes("platform_admin");
  const query = useLoad(
    () => rows(supabase.from("community_notices").select("id,title,body,audience,pinned,published_at,created_at").eq("community_id", communityId).order("pinned", { ascending: false }).order("published_at", { ascending: false })),
    [communityId],
  );
  return (
    <section>
      <h2 className="mb-1 font-display text-xl font-semibold">Notices</h2>
      <p className="mb-4 text-sm text-slate-400">Official society notices live here. WhatsApp is only a delivery channel.</p>
      {committee && (
        <SaveForm submitLabel="Publish notice" onSubmit={(data) => rpc("publish_community_notice", {
          p_community: communityId,
          p_title: data.title,
          p_body: data.body,
          p_audience: data.audience,
          p_pinned: data.pinned === "true",
        }).then(query.reload)}>
          <Field label="Title"><input className={control} name="title" required /></Field>
          <Field label="Audience">
            <select className={control} name="audience" defaultValue="all">
              <option value="all">All residents</option>
              <option value="owners">Owners</option>
              <option value="tenants">Tenants</option>
              <option value="committee">Committee</option>
            </select>
          </Field>
          <Field label="Pin">
            <select className={control} name="pinned" defaultValue="false">
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </Field>
          <Field label="Body"><textarea className={control} name="body" rows={5} required /></Field>
        </SaveForm>
      )}
      <div className="mt-4">
        <PageStatus loading={query.loading} error={query.error} onRetry={query.reload} empty={!query.loading && !query.error && !(query.data || []).length} title="No notices yet" body="When the secretary publishes a notice, it appears here for every member." />
        <ul className="space-y-3">
          {(query.data || []).map((notice) => (
            <li key={notice.id} className="border border-slate-800 bg-white p-3">
              <div className="flex justify-between gap-3">
                <strong>{notice.title}</strong>
                {notice.pinned && <span className="text-xs font-semibold text-[#0878E8]">Pinned</span>}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{notice.body}</p>
              <p className="mt-2 text-xs text-slate-400">{notice.audience} · {notice.published_at ? new Date(notice.published_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "draft"}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function VisitorsScreen({ communityId, roles }) {
  const committee = roles.includes("committee_admin") || roles.includes("platform_admin");
  const query = useLoad(
    () => rows(supabase.from("visitor_passes").select("id,visitor_name,visitor_phone,purpose,pass_code,status,expected_at,checked_in_at,checked_out_at,created_at").eq("community_id", communityId).order("created_at", { ascending: false }).limit(40)),
    [communityId],
  );
  return (
    <section>
      <h2 className="mb-1 font-display text-xl font-semibold">Visitors</h2>
      <p className="mb-4 text-sm text-slate-400">Pre-approve guests with a pass code. Gate staff check visitors in and out. No financial data is shown here.</p>
      <SaveForm submitLabel="Create visitor pass" onSubmit={async (data) => {
        const result = await rpc("create_visitor_pass", {
          p_community: communityId,
          p_visitor_name: data.name,
          p_visitor_phone: data.phone || null,
          p_purpose: data.purpose || null,
          p_unit_number: data.unit || null,
          p_vehicle_number: data.vehicle || null,
          p_expected_at: data.expected || null,
        });
        window.alert(`Pass created. Code: ${result?.pass_code || result}`);
        query.reload();
      }}>
        <Field label="Visitor name"><input className={control} name="name" required /></Field>
        <Field label="Phone"><input className={control} name="phone" inputMode="tel" /></Field>
        <Field label="Unit number"><input className={control} name="unit" /></Field>
        <Field label="Purpose"><input className={control} name="purpose" /></Field>
        <Field label="Vehicle"><input className={control} name="vehicle" /></Field>
        <Field label="Expected at"><input className={control} type="datetime-local" name="expected" /></Field>
      </SaveForm>
      <div className="mt-4">
        <PageStatus loading={query.loading} error={query.error} onRetry={query.reload} empty={!query.loading && !query.error && !(query.data || []).length} title="No visitor passes" body="Create a pass for an expected guest. The gate uses the pass code at entry." />
        <ul className="space-y-2 text-sm">
          {(query.data || []).map((pass) => (
            <li key={pass.id} className="border border-slate-800 bg-white p-3">
              <div className="flex flex-wrap justify-between gap-2">
                <strong>{pass.visitor_name}</strong>
                <span className="font-mono">{pass.pass_code}</span>
              </div>
              <p className="text-slate-400">{pass.status} · {pass.purpose || "Visit"} · {pass.visitor_phone || "no phone"}</p>
              {committee && pass.status === "expected" && (
                <button type="button" className="mt-2 min-h-10 border border-slate-600 px-3" onClick={() => rpc("check_in_visitor", { p_pass: pass.id }).then(query.reload)}>Check in</button>
              )}
              {committee && pass.status === "checked_in" && (
                <button type="button" className="mt-2 min-h-10 border border-slate-600 px-3" onClick={() => rpc("check_out_visitor", { p_pass: pass.id }).then(query.reload)}>Check out</button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function AmenitiesScreen({ communityId, roles }) {
  const committee = roles.includes("committee_admin") || roles.includes("platform_admin");
  const amenities = useLoad(
    () => rows(supabase.from("amenities").select("id,name,description,requires_approval,slot_minutes,is_active").eq("community_id", communityId).eq("is_active", true).order("name")),
    [communityId],
  );
  const bookings = useLoad(
    () => rows(supabase.from("amenity_bookings").select("id,amenity_id,starts_at,ends_at,purpose,status,amenities(name)").eq("community_id", communityId).order("starts_at", { ascending: false }).limit(30)),
    [communityId],
  );
  return (
    <section>
      <h2 className="mb-1 font-display text-xl font-semibold">Amenities</h2>
      <p className="mb-4 text-sm text-slate-400">Book community spaces. Overlapping confirmed bookings are rejected.</p>
      {committee && (
        <SaveForm submitLabel="Add amenity" onSubmit={async (data) => {
          const { error } = await supabase.from("amenities").insert({
            community_id: communityId,
            name: data.name,
            description: data.description || null,
            requires_approval: data.approval === "true",
            slot_minutes: Number(data.minutes) || 60,
          });
          if (error) throw new Error(error.message);
          amenities.reload();
        }}>
          <Field label="Name"><input className={control} name="name" required /></Field>
          <Field label="Description"><input className={control} name="description" /></Field>
          <Field label="Slot minutes"><input className={control} name="minutes" type="number" defaultValue="60" min="15" /></Field>
          <Field label="Needs approval">
            <select className={control} name="approval" defaultValue="false">
              <option value="false">No — confirm immediately</option>
              <option value="true">Yes — pending until committee approves</option>
            </select>
          </Field>
        </SaveForm>
      )}
      <PageStatus loading={amenities.loading} error={amenities.error} onRetry={amenities.reload} empty={!amenities.loading && !amenities.error && !(amenities.data || []).length} title="No amenities configured" body="Committee can add clubhouse, courts, guest rooms and other bookable spaces." />
      {!!(amenities.data || []).length && (
        <SaveForm submitLabel="Request booking" onSubmit={(data) => rpc("book_amenity", {
          p_amenity: data.amenity,
          p_starts_at: new Date(data.start).toISOString(),
          p_ends_at: new Date(data.end).toISOString(),
          p_purpose: data.purpose || null,
          p_unit_number: data.unit || null,
        }).then(bookings.reload)}>
          <Field label="Amenity">
            <select className={control} name="amenity" required>
              {(amenities.data || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>
          <Field label="Starts"><input className={control} type="datetime-local" name="start" required /></Field>
          <Field label="Ends"><input className={control} type="datetime-local" name="end" required /></Field>
          <Field label="Unit number"><input className={control} name="unit" /></Field>
          <Field label="Purpose"><input className={control} name="purpose" /></Field>
        </SaveForm>
      )}
      <h3 className="mb-2 mt-6 font-semibold">Recent bookings</h3>
      <PageStatus loading={bookings.loading} error={bookings.error} onRetry={bookings.reload} empty={!bookings.loading && !bookings.error && !(bookings.data || []).length} title="No bookings yet" body="Your confirmed and pending amenity bookings appear here." />
      <ul className="space-y-2 text-sm">
        {(bookings.data || []).map((booking) => (
          <li key={booking.id} className="border border-slate-800 bg-white p-3">
            <strong>{booking.amenities?.name || "Amenity"}</strong>
            <p>{new Date(booking.starts_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} → {new Date(booking.ends_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
            <p className="text-slate-400">{booking.status} · {booking.purpose || "No purpose noted"}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function StaffScreen({ communityId, roles }) {
  const canManage = roles.some((role) => ["committee_admin", "platform_admin"].includes(role));
  const staff = useLoad(
    () => rows(supabase.from("community_staff").select("id,full_name,role_title,phone,status").eq("community_id", communityId).order("full_name")),
    [communityId],
  );
  const attendance = useLoad(
    () => rows(supabase.from("staff_attendance").select("id,staff_id,attended_on,status,notes,community_staff(full_name)").eq("community_id", communityId).order("attended_on", { ascending: false }).limit(40)),
    [communityId],
  );
  if (!canManage && !roles.includes("treasurer")) {
    return <section><h2 className="mb-2 font-display text-xl font-semibold">Staff</h2><p className="text-sm text-slate-400">Staff records are restricted to committee and treasurer roles.</p></section>;
  }
  return (
    <section>
      <h2 className="mb-1 font-display text-xl font-semibold">Staff</h2>
      <p className="mb-4 text-sm text-slate-400">Directory and daily attendance. Compensation details are not stored on this screen.</p>
      {canManage && (
        <SaveForm submitLabel="Add staff member" onSubmit={async (data) => {
          const { error } = await supabase.from("community_staff").insert({
            community_id: communityId,
            full_name: data.name,
            role_title: data.role,
            phone: data.phone || null,
          });
          if (error) throw new Error(error.message);
          staff.reload();
        }}>
          <Field label="Name"><input className={control} name="name" required /></Field>
          <Field label="Role / title"><input className={control} name="role" required /></Field>
          <Field label="Phone"><input className={control} name="phone" inputMode="tel" /></Field>
        </SaveForm>
      )}
      <PageStatus loading={staff.loading} error={staff.error} onRetry={staff.reload} empty={!staff.loading && !staff.error && !(staff.data || []).length} title="No staff listed" body="Add security, housekeeping and facility staff to mark attendance." />
      <ul className="mb-6 space-y-2 text-sm">
        {(staff.data || []).map((member) => (
          <li key={member.id} className="border border-slate-800 bg-white p-3">
            <strong>{member.full_name}</strong>
            <p className="text-slate-400">{member.role_title} · {member.status} · {member.phone || "no phone"}</p>
            {canManage && (
              <SaveForm submitLabel="Mark attendance" onSubmit={(data) => rpc("mark_staff_attendance", {
                p_staff: member.id,
                p_date: data.date,
                p_status: data.status,
                p_notes: data.notes || null,
              }).then(attendance.reload)}>
                <Field label="Date"><input className={control} type="date" name="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
                <Field label="Status">
                  <select className={control} name="status" defaultValue="present">
                    {["present", "absent", "leave", "half_day"].map((value) => <option key={value}>{value}</option>)}
                  </select>
                </Field>
                <Field label="Notes"><input className={control} name="notes" /></Field>
              </SaveForm>
            )}
          </li>
        ))}
      </ul>
      <h3 className="mb-2 font-semibold">Recent attendance</h3>
      <ul className="space-y-2 text-sm">
        {(attendance.data || []).map((row) => (
          <li key={row.id} className="border border-slate-800 bg-white px-3 py-2">
            {row.attended_on} · {row.community_staff?.full_name || "Staff"} · {row.status}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AssetsScreen({ communityId, roles }) {
  const canEdit = roles.some((role) => ["committee_admin", "platform_admin", "treasurer"].includes(role));
  const query = useLoad(
    () => rows(supabase.from("community_assets").select("id,name,category,location,vendor_name,warranty_ends_on,amc_ends_on,status,notes").eq("community_id", communityId).order("name")),
    [communityId],
  );
  return (
    <section>
      <h2 className="mb-1 font-display text-xl font-semibold">Assets</h2>
      <p className="mb-4 text-sm text-slate-400">Common-area equipment register. Preventive schedules and AMC dates stay visible to members.</p>
      {canEdit && (
        <SaveForm submitLabel="Add asset" onSubmit={async (data) => {
          const { error } = await supabase.from("community_assets").insert({
            community_id: communityId,
            name: data.name,
            category: data.category,
            location: data.location || null,
            vendor_name: data.vendor || null,
            warranty_ends_on: data.warranty || null,
            amc_ends_on: data.amc || null,
            status: data.status,
            notes: data.notes || null,
          });
          if (error) throw new Error(error.message);
          query.reload();
        }}>
          <Field label="Name"><input className={control} name="name" required /></Field>
          <Field label="Category">
            <select className={control} name="category" defaultValue="lift">
              {["lift", "pump", "dg", "stp", "wtp", "fire", "cctv", "solar", "other"].map((value) => <option key={value}>{value}</option>)}
            </select>
          </Field>
          <Field label="Location"><input className={control} name="location" /></Field>
          <Field label="Vendor"><input className={control} name="vendor" /></Field>
          <Field label="Warranty ends"><input className={control} type="date" name="warranty" /></Field>
          <Field label="AMC ends"><input className={control} type="date" name="amc" /></Field>
          <Field label="Status">
            <select className={control} name="status" defaultValue="operational">
              {["operational", "under_maintenance", "down", "retired"].map((value) => <option key={value}>{value}</option>)}
            </select>
          </Field>
          <Field label="Notes"><input className={control} name="notes" /></Field>
        </SaveForm>
      )}
      <PageStatus loading={query.loading} error={query.error} onRetry={query.reload} empty={!query.loading && !query.error && !(query.data || []).length} title="No assets registered" body="Register lifts, pumps, DG sets and other common equipment." />
      <ul className="mt-4 space-y-2 text-sm">
        {(query.data || []).map((asset) => (
          <li key={asset.id} className="border border-slate-800 bg-white p-3">
            <strong>{asset.name}</strong>
            <p className="text-slate-400">{asset.category} · {asset.status} · {asset.location || "location unset"}</p>
            <p className="text-slate-400">Vendor {asset.vendor_name || "—"} · Warranty {asset.warranty_ends_on || "—"} · AMC {asset.amc_ends_on || "—"}</p>
            {asset.notes && <p className="mt-1">{asset.notes}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AssistantScreen({ communityId }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const facts = useLoad(() => rpc("society_assistant_facts", { p_community: communityId }), [communityId]);

  const answerFromFacts = (q, data) => {
    const text = q.toLowerCase();
    const lines = [];
    lines.push("Verified society records (not generated advice):");
    if (text.includes("complaint") || text.includes("concern")) {
      lines.push(`Open public concerns: ${data.open_public_concerns ?? 0}`);
      lines.push(`Your open concerns: ${data.my_open_concerns ?? 0}`);
    }
    if (text.includes("meeting") || text.includes("agm")) {
      const meetings = data.upcoming_meetings || [];
      lines.push(meetings.length ? `Upcoming meetings: ${meetings.map((m) => `${m.title} on ${m.held_on}`).join("; ")}` : "No upcoming meetings on record.");
    }
    if (text.includes("notice")) {
      lines.push(`Published notices: ${data.published_notices ?? 0}`);
    }
    if (text.includes("expense") || text.includes("approval") || text.includes("outstanding") || text.includes("fund") || text.includes("statement") || text.includes("audit") || text.includes("payment")) {
      if (data.financial_detail === "restricted") {
        lines.push(data.note || "Financial detail is restricted for your role.");
      } else {
        if (data.pending_expenses != null) lines.push(`Expenses awaiting approval: ${data.pending_expenses}`);
        if (data.pending_payment_proofs != null) lines.push(`Payment proofs awaiting verification: ${data.pending_payment_proofs}`);
        if (data.open_audit_observations != null) lines.push(`Open audit observations: ${data.open_audit_observations}`);
        if (data.latest_statement) lines.push(`Latest statement: ${data.latest_statement.status} · period ending ${data.latest_statement.period_end} · due ${data.latest_statement.due_on}`);
        const funds = data.fund_balances || [];
        if (funds.length) lines.push(`Fund closings: ${funds.map((f) => `${f.name} ${inr(f.closing)}`).join("; ")}`);
      }
    }
    if (lines.length === 1) {
      lines.push(`Open public concerns: ${data.open_public_concerns ?? 0}`);
      lines.push(`Your open concerns: ${data.my_open_concerns ?? 0}`);
      lines.push(`Published notices: ${data.published_notices ?? 0}`);
      lines.push("Ask about concerns, meetings, notices, expenses, payments, funds, statements, or audit observations.");
    }
    lines.push("The assistant cannot approve expenses, post ledger entries, change roles, or close concerns.");
    return lines.join("\n");
  };

  const ask = async (event) => {
    event?.preventDefault?.();
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    try {
      const data = facts.data || await rpc("society_assistant_facts", { p_community: communityId });
      setAnswer(answerFromFacts(q, data));
      facts.reload();
    } catch (error) {
      setAnswer(error.message || "Could not load society facts.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h2 className="mb-1 font-display text-xl font-semibold">Society assistant</h2>
      <p className="mb-4 text-sm text-slate-400">Answers from permission-scoped SABHA records. Financial claims cite verified counts and balances only.</p>
      <PageStatus loading={facts.loading} error={facts.error} onRetry={facts.reload} empty={false} />
      <form className="grid gap-3" onSubmit={ask}>
        <Field label="Question">
          <textarea className={control} rows={3} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="e.g. Which invoices are awaiting approval?" required />
        </Field>
        <button type="submit" disabled={busy} className="min-h-12 bg-[#0878E8] px-3 font-semibold text-white">{busy ? "Looking up…" : "Ask from records"}</button>
      </form>
      {answer && <pre className="mt-4 whitespace-pre-wrap border border-slate-800 bg-white p-3 text-sm">{answer}</pre>}
    </section>
  );
}

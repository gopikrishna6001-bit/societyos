import { useEffect, useState } from "react";
import { rpc, rows, supabase } from "./api.js";
import { downloadText, inr, toCsv } from "./money.js";
import { Field, FilterSheet, PageStatus, SaveForm, control, useLoad } from "./ui.jsx";
import { brand } from "../brand.js";

const TICKET_CATEGORIES = ["Maintenance", "Water", "Electricity", "Security", "Housekeeping", "Lift and facilities", "Finance", "Governance", "General", "Other"];
const EXPENSE_CATEGORIES = ["Security", "Housekeeping", "Electricity", "Water", "Lift maintenance", "Plumbing", "Civil repairs", "Gardening", "Administration", "Insurance", "Emergency repairs", "Other"];

function accountsOf(list, type) {
  return (list || []).filter((account) => account.account_type === type);
}

export function HomeScreen({ communityId, roles = [], onOpen }) {
  const query = useLoad(() => rpc("resident_dashboard", { p_community: communityId }), [communityId]);
  const dash = query.data;
  const funds = dash?.funds || [];
  const balance = funds.reduce((sum, fund) => sum + Number(fund.closing || 0), 0);
  const receipts = funds.reduce((sum, fund) => sum + Number(fund.receipts || 0), 0);
  const payments = funds.reduce((sum, fund) => sum + Number(fund.payments || 0), 0);
  const nextMeeting = dash?.upcoming_meetings?.[0];
  const statement = dash?.latest_statement;
  const financial = roles.some((role) => ["treasurer", "resident_auditor", "committee_admin", "platform_admin"].includes(role));
  return (
    <section>
      <h2 className="mb-1 font-display text-2xl font-semibold">Home</h2>
      <p className="mb-4 text-sm text-slate-400">Balances come from posted ledger entries. Transfers between funds are not counted as income or spending. Receipts and payments are the full posted totals, not a separate calendar month.</p>
      <PageStatus loading={query.loading} error={query.error} onRetry={query.reload} empty={!query.loading && !query.error && funds.length === 0} title="No fund balances yet" body="The treasurer posts an opening balance before these rows show an amount." />
      {!!funds.length && (
        <dl className="border border-slate-800 bg-white">
          <Row term="Available balance" value={inr(balance)} />
          <Row term="Receipts posted" value={inr(receipts)} />
          <Row term="Payments posted" value={inr(payments)} />
        </dl>
      )}
      {dash && (
        <div className="mt-4 border border-slate-800 bg-white">
          <div className="border-b border-slate-800 px-3 py-3">
            <p className="text-sm text-slate-400">Latest statement</p>
            <p className="font-semibold">{statement ? `${statement.status} · due ${statement.due_on}` : "None published"}</p>
          </div>
          <div className="border-b border-slate-800 px-3 py-3">
            <p className="text-sm text-slate-400">Open public concerns</p>
            <p className="tabular font-semibold">{dash.open_public_concerns ?? 0}</p>
          </div>
          <div className="px-3 py-3">
            <p className="text-sm text-slate-400">Next meeting</p>
            <p className="font-semibold">{nextMeeting ? `${nextMeeting.title} · ${new Date(nextMeeting.held_on).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}` : "No upcoming meeting."}</p>
          </div>
        </div>
      )}
      {dash && financial && statement && !["published", "published_with_exceptions"].includes(statement.status) && (
        <button type="button" className="mt-4 min-h-12 w-full bg-[#252525] px-3 font-semibold text-white" onClick={() => onOpen?.("finance")}>Review the latest statement</button>
      )}
      {dash && (
        <div className="mt-6 grid gap-6">
          <List title="Recent updates" items={dash.announcements} render={(item) => item.title} empty="No notifications yet." />
          <List title="Recently resolved concerns" items={dash.recently_resolved} render={(item) => `${item.number}: ${item.subject}`} empty="No resolved public concerns yet." />
          <List title="Bank book balances" items={dash.banks} render={(item) => `${item.name}: ${inr(item.book_balance)}`} empty="No bank ledger has been opened." />
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
    <article className="border border-slate-800 bg-white p-3">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="tabular mt-1 text-xl font-semibold">{value}</p>
    </article>
  );
}

function List({ title, items, render, empty }) {
  return (
    <div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      {items?.length ? <ul className="border border-slate-800 bg-white text-sm">{items.map((item, index) => <li key={index} className="border-b border-slate-800 px-3 py-3 last:border-b-0">{render(item)}</li>)}</ul> : <p className="text-sm text-slate-400">{empty}</p>}
    </div>
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
  const sections = [
    ["funds", "Funds"],
    ["collections", "Collections"],
    ["expenses", "Expenses"],
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
    <section className="space-y-8">
      <Field label="Section">
        <select className={control} value={sections.some(([id]) => id === section) ? section : "funds"} onChange={(event) => setSection(event.target.value)} aria-label="Finance section">
          {sections.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </Field>
      {show("funds") && (
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Funds</h2>
            <button type="button" className="rounded-lg border border-slate-600 px-3 py-2 text-sm" onClick={exportBalances}>Export CSV</button>
          </div>
          <PageStatus loading={funds.loading} error={funds.error} onRetry={funds.reload} empty={!funds.loading && !funds.error && !(funds.data || []).length} title="No funds opened" body="Open a maintenance, corpus, special, emergency, or other fund before posting money." />
          <ul className="border border-slate-800 bg-white">
            {(funds.data || []).map((row) => (
              <li key={row.account_id} className="border-b border-slate-800 px-3 py-3 last:border-b-0">
                <div className="flex items-baseline justify-between gap-3">
                  <strong>{row.name}</strong>
                  <span className="tabular">{inr(row.closing)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-400">Opening {inr(row.opening)} · Receipts {inr(row.receipts)} · Payments {inr(row.payments)}</p>
                <p className="text-sm text-slate-400">Transfers in {inr(row.transfers_in)} · out {inr(row.transfers_out)}</p>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">Closing = opening + receipts − payments + transfers in − transfers out + adjustments. Individual flat dues are not shown here.</p>
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
        </div>
      )}

      {show("collections") && (
        <Collections communityId={communityId} canPost={canPost} periods={periods} ledger={ledger.data || []} onPosted={funds.reload} />
      )}

      {show("expenses") && (
        <Expenses communityId={communityId} canPost={canPost} canReview={canReview} expenses={expenses} funds={accountsOf(ledger.data, "fund")} banks={accountsOf(ledger.data, "bank")} onPosted={funds.reload} />
      )}

      {show("reconciliation") && canSeeRecon && <Reconciliation communityId={communityId} banks={accountsOf(ledger.data, "bank")} canPost={canPost} />}
      {show("reviews") && <Reviews communityId={communityId} />}
      {show("statements") && <Statements communityId={communityId} canPost={canPost} canReview={canReview} />}
    </section>
  );
}

function Collections({ communityId, canPost, periods, ledger, onPosted }) {
  const [periodId, setPeriodId] = useState("");
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
  return (
    <div>
      <h2 className="mb-3 text-xl font-semibold">Collections</h2>
      <PageStatus loading={periods.loading} error={periods.error} onRetry={periods.reload} empty={!periods.loading && !periods.error && !(periods.data || []).length} title="No collection period" body="A treasurer opens a month before payments can be recorded." />
      {(periods.data || []).length > 0 && (
        <Field label="Period">
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
      <p className="mt-2 text-xs text-slate-500">This summary is aggregated. A resident can see their own demand, and the committee can see each unit.</p>
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
            <SaveForm submitLabel="Record payment" onSubmit={(data) => rpc("record_collection", {
              p_demand: data.demand,
              p_amount: data.amount,
              p_paid_on: data.paid,
              p_mode: data.mode,
              p_bank_reference: data.reference,
              p_receipt_number: data.receipt,
              p_key: data.key || crypto.randomUUID(),
              p_bank_account: data.bank,
              p_fund_account: data.fund,
            }).then(() => { summary.reload(); onPosted(); })}>
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
        {previewError && <p role="alert" className="text-sm text-red-300">{previewError}</p>}
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

function Reviews({ communityId }) {
  const query = useLoad(() => rows(supabase.from("audit_reviews").select("id,subject_type,status,comments,created_at").eq("community_id", communityId).order("created_at", { ascending: false })), [communityId]);
  return (
    <div>
      <h2 className="mb-3 text-xl font-semibold">Audit reviews</h2>
      <PageStatus loading={query.loading} error={query.error} onRetry={query.reload} empty={!query.loading && !query.error && !(query.data || []).length} title="No auditor reviews yet" body="An elected resident auditor records verification, clarification, or a dispute here." />
      <ul className="space-y-2 text-sm">{(query.data || []).map((review) => <li key={review.id} className="rounded-lg border border-slate-800 p-3">{review.subject_type} · {review.status} · {review.comments || "No comment"}</li>)}</ul>
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
              {canPost && statement.status === "reconciled_and_reviewed" && <button type="button" className="min-h-12 bg-[#A65F49] px-3 font-semibold text-white" onClick={() => { if (window.confirm("Publish this statement? Residents will be able to read it.")) rpc("publish_statement", { p_statement: statement.id, p_with_exceptions: false }).then(query.reload); }}>Publish</button>}
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
    <section>
      <h2 className="mb-1 font-display text-xl font-semibold">Concerns</h2>
      <p className="mb-4 text-sm text-slate-400">A public concern can be read by residents. A private concern stays with you and the committee.</p>
      <button type="button" className="min-h-12 w-full bg-[#A65F49] px-3 font-semibold text-white" onClick={() => setRaising((open) => !open)}>{raising ? "Close the form" : "Raise concern"}</button>
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
      <div className="mt-4">
      <PageStatus loading={query.loading} error={query.error} onRetry={query.reload} empty={!query.loading && !query.error && !(query.data || []).length} title="No concerns yet" body="Raise a public or private concern and it receives a SOC-YYYY-XXXXX number." />
      <ul className="space-y-2 text-sm">
        {(query.data || []).map((ticket) => (
          <li key={ticket.id} className="border border-slate-800 bg-white p-3">
            <div className="flex items-baseline justify-between gap-3">
              <strong>{ticket.ticket_number}</strong>
              <span>{ticket.status}</span>
            </div>
            <p className="mt-1">{ticket.subject}</p>
            <p className="text-slate-400">{ticket.visibility === "private" ? "Private" : "Public"} · {ticket.category} · {ticket.priority}</p>
            <p className="text-sm text-slate-400">Updated {ticket.updated_at ? new Date(ticket.updated_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "when recorded"}</p>
            <button type="button" className="mt-2 min-h-12 w-full border border-slate-800" onClick={() => setOpenId(openId === ticket.id ? "" : ticket.id)}>{openId === ticket.id ? "Hide updates" : "Show updates"}</button>
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
              <div className="mt-2 grid gap-2">
                <button type="button" className="min-h-12 border border-slate-800" onClick={() => rpc("transition_ticket", { p_ticket: ticket.id, p_status: "closed", p_note: "Resident confirmed" }).then(query.reload)}>Confirm</button>
                <button type="button" className="min-h-12 border border-slate-800" onClick={() => rpc("transition_ticket", { p_ticket: ticket.id, p_status: "reopened", p_note: "Resident reopened" }).then(query.reload)}>Reopen</button>
              </div>
            )}
          </li>
        ))}
      </ul>
      </div>
    </section>
  );
}

export function DecisionsScreen({ communityId, roles }) {
  const committee = roles.includes("committee_admin") || roles.includes("platform_admin");
  const meetings = useLoad(() => rows(supabase.from("meetings").select("id,title,meeting_type,held_on,venue,minutes").eq("community_id", communityId).order("held_on", { ascending: false })), [communityId]);
  const resolutions = useLoad(() => rows(supabase.from("resolutions").select("id,title,description,status,voting_starts_at,voting_ends_at").eq("community_id", communityId).order("created_at", { ascending: false })), [communityId]);
  return (
    <section className="space-y-6">
      <div>
        <h2 className="mb-3 text-xl font-semibold">Meetings</h2>
        <PageStatus loading={meetings.loading} error={meetings.error} onRetry={meetings.reload} empty={!meetings.loading && !meetings.error && !(meetings.data || []).length} title="No meetings recorded" body="Committee, general body, emergency, and special meetings are listed after they are scheduled." />
        <ul className="space-y-2 text-sm">{(meetings.data || []).map((meeting) => {
          const upcoming = new Date(meeting.held_on).getTime() >= Date.now();
          return <li key={meeting.id} className="border border-slate-800 bg-white p-3"><p className="text-sm text-slate-400">{upcoming ? "Upcoming" : "Past"} · {meeting.meeting_type}</p><strong>{meeting.title}</strong><p className="text-slate-400">{new Date(meeting.held_on).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} · {meeting.venue || "Venue not recorded"}</p>{meeting.minutes && <p className="mt-2">{meeting.minutes}</p>}</li>;
        })}</ul>
        {committee && (
          <SaveForm submitLabel="Schedule meeting" onSubmit={(data) => rpc("create_meeting", { p_community: communityId, p_type: data.type, p_title: data.title, p_held_on: new Date(data.when).toISOString(), p_venue: data.venue }).then(meetings.reload)}>
            <Field label="Type"><select className={control} name="type">{["committee", "general_body", "emergency", "special"].map((type) => <option key={type}>{type}</option>)}</select></Field>
            <Field label="Title"><input className={control} name="title" required /></Field>
            <Field label="When"><input className={control} type="datetime-local" name="when" required /></Field>
            <Field label="Venue or link"><input className={control} name="venue" /></Field>
          </SaveForm>
        )}
      </div>
      <div>
        <h2 className="mb-3 text-xl font-semibold">Resolutions</h2>
        <PageStatus loading={resolutions.loading} error={resolutions.error} onRetry={resolutions.reload} empty={!resolutions.loading && !resolutions.error && !(resolutions.data || []).length} title="No resolutions" body="A resolution is a formal decision. A chat poll is not recorded as approved." />
        <ul className="space-y-2 text-sm">
          {(resolutions.data || []).map((resolution) => (
            <li key={resolution.id} className="rounded-lg border border-slate-800 p-3">
              <strong>{resolution.title}</strong> · {resolution.status}
              <p>{resolution.description}</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {["yes", "no", "abstain"].map((vote) => <button key={vote} type="button" className="min-h-12 border border-slate-800 bg-white" onClick={() => rpc("cast_vote", { p_resolution: resolution.id, p_vote: vote }).then(resolutions.reload)}>{vote}</button>)}
                {committee && <button type="button" className="col-span-3 min-h-12 border border-slate-800" onClick={() => { if (window.confirm("Close this vote?")) rpc("close_vote", { p_resolution: resolution.id }).then(resolutions.reload); }}>Close vote</button>}
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
      </div>
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
        {!!preview.errors.length && <ul className="mt-2 text-sm text-red-300">{preview.errors.map((error) => <li key={error}>{error}</li>)}</ul>}
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

export function SettingsScreen({ communityId }) {
  const query = useLoad(() => rows(supabase.from("community_settings").select("*").eq("community_id", communityId)), [communityId]);
  const settings = query.data?.[0];
  return (
    <section>
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
      <p className="mt-3 text-sm text-slate-400">These values were set for this community. Changing them is a governed action and is not a silent edit from this screen.</p>
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

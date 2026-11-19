const wholeRupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function rupee(value) {
  return wholeRupees.format(Number(value));
}

export function Meter({ value, max, label }) {
  const ratio = max === 0 ? 0 : Math.min(1, value / max);
  return (
    <div>
      <div className="demo-meter" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
        <span style={{ "--demo-scale": ratio }} />
      </div>
    </div>
  );
}

export function MonthChart({ months, activeId }) {
  const peak = Math.max(...months.flatMap((month) => [month.billed, month.collected, month.expenses]));
  return (
    <figure className="demo-chart">
      <svg viewBox={`0 0 ${months.length * 72} 160`} role="img" aria-label="Monthly bills, collections and expenses">
        {months.map((month, index) => {
          const x = index * 72 + 16;
          const height = (amount) => (amount / peak) * 112;
          return (
            <g key={month.id} opacity={activeId && activeId !== month.id ? 0.45 : 1}>
              <rect x={x} y={128 - height(month.billed)} width="12" height={height(month.billed)} fill="#031D27" rx="2" />
              <rect x={x + 16} y={128 - height(month.collected)} width="12" height={height(month.collected)} fill="#00D4E8" rx="2" />
              <rect x={x + 32} y={128 - height(month.expenses)} width="12" height={height(month.expenses)} fill="#0878E8" rx="2" />
              <text x={x + 22} y="150" textAnchor="middle" fill="#1F3D48" fontSize="11">{month.label.slice(0, 3)}</text>
            </g>
          );
        })}
      </svg>
      <figcaption>
        <i style={{ background: "#031D27" }} /> Billed
        <i style={{ background: "#00D4E8" }} /> Collected
        <i style={{ background: "#0878E8" }} /> Expenses
      </figcaption>
    </figure>
  );
}

export function MoneyTable({ rows }) {
  return (
    <table className="demo-table">
      <tbody>
        {rows.map((row) => (
          <tr key={row.term}>
            <th scope="row">{row.term}</th>
            <td>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Rupee({ value }) {
  return rupee(value);
}

export function Empty({ title, body, action }) {
  return (
    <div className="demo-empty" role="status">
      <p>{title}</p>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function Notice({ children }) {
  if (!children) return null;
  return <p className="demo-toast" role="status">{children}</p>;
}

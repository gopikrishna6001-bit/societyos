export default function QueryStatus({ loading, error, onRetry, empty, title, body, label = "Loading…" }) {
  if (loading) {
    return <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>{label}</div>;
  }
  if (error) {
    return (
      <div role="alert" style={{ background: "#2d1b1b", border: "1px solid #f8717133", borderRadius: 12, padding: 16 }}>
        <div style={{ color: "#f87171", fontWeight: 700, marginBottom: 6 }}>Could not load this page</div>
        <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 12 }}>{error}</div>
        {onRetry && (
          <button type="button" onClick={onRetry} style={{ background: "#1e2535", border: "1px solid #2a2f45", borderRadius: 8, padding: "8px 14px", color: "#e2e8f0", cursor: "pointer" }}>
            Retry
          </button>
        )}
      </div>
    );
  }
  if (empty) {
    return (
      <div style={{ background: "#161b27", border: "1px solid #2a2f45", borderRadius: 12, padding: 20 }}>
        <div style={{ color: "#e2e8f0", fontWeight: 700 }}>{title || "Nothing here yet"}</div>
        {body && <div style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}>{body}</div>}
      </div>
    );
  }
  return null;
}

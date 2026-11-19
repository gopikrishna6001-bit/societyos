import { useEffect, useState } from "react";
import { explain } from "./api.js";

export function PageStatus({ loading, error, onRetry, empty, title, body }) {
  if (loading) return <p className="text-slate-400">Loading…</p>;
  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-red-900 bg-red-950 p-4">
        <p className="font-semibold text-red-300">Could not load this page</p>
        <p className="mt-1 text-sm text-slate-400">{error}</p>
        {onRetry && <button type="button" className="mt-3 min-h-11 rounded-lg border border-slate-700 bg-white px-3 py-2 text-sm" onClick={onRetry}>Retry</button>}
      </div>
    );
  }
  if (empty) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="font-semibold">{title || "Nothing here yet"}</p>
        {body && <p className="mt-1 text-sm text-slate-400">{body}</p>}
      </div>
    );
  }
  return null;
}

export function useLoad(loader, deps) {
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setState((current) => ({ ...current, loading: true, error: "" }));
    loader()
      .then((data) => { if (live) setState({ loading: false, error: "", data }); })
      .catch((error) => { if (live) setState({ loading: false, error: explain(error), data: null }); });
    return () => { live = false; };
  }, [...deps, attempt]);
  return { ...state, reload: () => setAttempt((value) => value + 1) };
}

export function Field({ label, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export const control = "w-full min-h-12 rounded-lg border border-slate-800 bg-white px-3 py-3 text-base text-slate-100";

export function SaveForm({ onSubmit, submitLabel = "Save", children }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <form
      className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-card"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget));
        setPending(true);
        setError("");
        try {
          await onSubmit(data);
          event.currentTarget.reset();
        } catch (cause) {
          setError(explain(cause));
        } finally {
          setPending(false);
        }
      }}
    >
      {children}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <button type="submit" disabled={pending} className="min-h-12 rounded-lg bg-amber-500 px-3 py-3 font-semibold text-white disabled:opacity-60">
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

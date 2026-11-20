import { useEffect, useState } from "react";
import { explain } from "./api.js";

export function PageStatus({ loading, error, onRetry, empty, title, body }) {
  if (loading) return <p className="text-[#5C5852]">Loading…</p>;
  if (error) {
    return (
      <div role="alert" className="border border-red-300 bg-red-50 p-4 text-[#252525]">
        <p className="font-semibold text-red-800">Could not load this page</p>
        <p className="mt-1 text-sm text-[#5C5852]">{error}</p>
        {onRetry && <button type="button" className="mt-3 min-h-12 border border-[#031D27]/30 bg-white px-3 py-2 text-sm" onClick={onRetry}>Retry</button>}
      </div>
    );
  }
  if (empty) {
    return (
      <div className="border border-[#031D27]/20 bg-white p-4 text-[#252525]">
        <p className="font-semibold">{title || "Nothing here yet"}</p>
        {body && <p className="mt-1 text-sm text-[#5C5852]">{body}</p>}
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

export const control = "w-full min-h-12 rounded-sm border border-[#031D27]/30 bg-white px-3 py-3 text-base text-[#252525]";

export function SaveForm({ onSubmit, submitLabel = "Save", confirmMessage, children }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <form
      className="mt-4 grid gap-3 border border-slate-800 bg-white p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (confirmMessage && !window.confirm(confirmMessage)) return;
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
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={pending} className="min-h-12 w-full bg-[#0878E8] px-3 py-3 font-semibold text-white disabled:opacity-60">
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

export function FilterSheet({ label, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" className="min-h-12 w-full border border-slate-800 bg-white px-3 text-left text-sm" aria-expanded={open} onClick={() => setOpen(true)}>{label}</button>
      {open && (
        <div className="fixed inset-0 z-30 flex items-end" role="dialog" aria-label={label}>
          <button type="button" className="absolute inset-0 bg-[#252525]/40" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="relative max-h-[80vh] w-full overflow-auto border-t border-slate-800 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {children}
            <button type="button" className="mt-4 min-h-12 w-full bg-[#252525] px-3 font-semibold text-white" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

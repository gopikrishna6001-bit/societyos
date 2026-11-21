import { useEffect, useMemo, useState } from "react";
import { explain, rows, supabase } from "./api.js";
import { isFinanceOps, isCommittee } from "./roleCopy.js";

export function PageStatus({ loading, error, onRetry, empty, title, body }) {
  if (loading) return <p className="demo-secondary">Loading…</p>;
  if (error) {
    return (
      <div role="alert" className="live-panel" style={{ borderColor: "#f1c4c4", background: "#fff7f7" }}>
        <p className="font-semibold" style={{ color: "#9f1239" }}>Could not load this</p>
        <p className="mt-1 text-sm demo-secondary">{error}</p>
        {onRetry && <button type="button" className="demo-text-button" style={{ marginTop: 12 }} onClick={onRetry}>Retry</button>}
      </div>
    );
  }
  if (empty) {
    return (
      <div className="demo-empty" role="status">
        <p>{title || "Nothing here yet"}</p>
        {body && <p>{body}</p>}
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
      <span className="mb-1 block demo-secondary">{label}</span>
      {children}
    </label>
  );
}

export const control = "w-full min-h-12 rounded-[12px] border border-[#d5e2e6] bg-white px-3 py-3 text-base text-[#031D27]";

export function SaveForm({ onSubmit, submitLabel = "Save", confirmMessage, children }) {
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <form
      className="mt-4 grid gap-3 live-panel"
      onSubmit={async (event) => {
        event.preventDefault();
        if (confirmMessage && !window.confirm(confirmMessage)) return;
        const form = event.currentTarget;
        const data = Object.fromEntries(new FormData(form));
        setPending(true);
        setError("");
        setOk("");
        try {
          await onSubmit(data);
          // Capture form before await; reload() re-renders and nulls event.currentTarget.
          if (form.isConnected) form.reset();
          setOk("Saved.");
        } catch (cause) {
          setError(explain(cause));
        } finally {
          setPending(false);
        }
      }}
    >
      {children}
      {error && <p role="alert" className="text-sm" style={{ color: "#9f1239" }}>{error}</p>}
      {ok && !error && <p role="status" className="text-sm" style={{ color: "#0f766e" }}>{ok}</p>}
      <button type="submit" disabled={pending} className="demo-primary disabled:opacity-60">
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

function flatLabel(unit) {
  if (!unit) return "";
  return unit.block ? `${unit.block}-${unit.number}` : String(unit.number);
}

/** Flat picker: residents get their flats only; ops get searchable society flats (no free typing). */
export function FlatPicker({
  communityId,
  roles = [],
  name = "unit",
  label = "Flat",
  required = false,
  allowEmpty = !required,
}) {
  const canSearch = isFinanceOps(roles) || isCommittee(roles) || roles.includes("resident_auditor");
  const [mine, setMine] = useState([]);
  const [all, setAll] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id;
        const own = userId
          ? await rows(
            supabase
              .from("unit_occupancies")
              .select("unit_id, relationship, units(id, number, block)")
              .eq("community_id", communityId)
              .eq("profile_id", userId)
              .is("ended_on", null),
          )
          : [];
        const ownUnits = own.map((row) => row.units).filter(Boolean);
        if (!live) return;
        setMine(ownUnits);
        if (!canSearch && ownUnits.length === 1) setSelected(ownUnits[0].number);
        if (canSearch) {
          const units = await rows(
            supabase.from("units").select("id, number, block").eq("community_id", communityId).order("number"),
          );
          if (!live) return;
          setAll(units);
        }
      } catch (cause) {
        if (live) setError(explain(cause));
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [communityId, canSearch]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all.slice(0, 40);
    return all.filter((unit) => flatLabel(unit).toLowerCase().includes(q) || String(unit.number).toLowerCase().includes(q)).slice(0, 40);
  }, [all, query]);

  if (loading) {
    return (
      <Field label={label}>
        <p className="demo-secondary">Loading flats…</p>
        <input type="hidden" name={name} value="" />
      </Field>
    );
  }

  if (error) {
    return (
      <Field label={label}>
        <p role="alert" className="text-sm" style={{ color: "#9f1239" }}>{error}</p>
        <input type="hidden" name={name} value="" />
      </Field>
    );
  }

  if (!canSearch) {
    if (!mine.length) {
      return (
        <Field label={label}>
          <p className="demo-secondary">No flat linked to your login. Ask the committee to link your flat.</p>
          <input type="hidden" name={name} value="" />
        </Field>
      );
    }
    return (
      <Field label={label}>
        <select className={control} name={name} required={required} value={selected} onChange={(event) => setSelected(event.target.value)}>
          {allowEmpty && !required && <option value="">Select flat</option>}
          {mine.map((unit) => (
            <option key={unit.id} value={unit.number}>{flatLabel(unit)}</option>
          ))}
        </select>
      </Field>
    );
  }

  const selectedUnit = all.find((unit) => unit.number === selected);
  const options = selectedUnit && !filtered.some((unit) => unit.id === selectedUnit.id)
    ? [selectedUnit, ...filtered]
    : filtered;

  return (
    <Field label={label}>
      <input
        className={control}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search flat (e.g. A-101)"
        autoComplete="off"
        aria-label={`Search ${label}`}
      />
      <select
        className={control}
        style={{ marginTop: 8 }}
        name={name}
        required={required}
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
      >
        {(allowEmpty || !required) && <option value="">Select flat</option>}
        {options.map((unit) => (
          <option key={unit.id} value={unit.number}>{flatLabel(unit)}</option>
        ))}
      </select>
      {!options.length && <p className="mt-2 demo-secondary text-sm">No flat matches “{query}”.</p>}
    </Field>
  );
}

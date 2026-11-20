import { Link, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../api.js";
import { DemoApp } from "./DemoApp.jsx";
import { brand } from "../../brand.js";

/** Isolated Palm Court fixture. Never the live product surface. */
export default function DemoEntry() {
  const enabled = import.meta.env.VITE_ENABLE_DEMO_LOGIN === "true";
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    if (!enabled) return undefined;
    let live = true;
    supabase.auth.getSession().then(({ data }) => {
      if (live) setSession(data.session ?? null);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (live) setSession(next);
    });
    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, [enabled]);

  if (!enabled) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-slate-100">
        <h1 className="font-display text-2xl font-semibold">{brand.name} demo is off</h1>
        <p className="mt-3 text-slate-400">
          The Palm Court fixture is only available when <code>VITE_ENABLE_DEMO_LOGIN=true</code>.
          The live product is at the home route and uses authenticated society ledgers.
        </p>
        <Link className="mt-6 inline-block font-semibold text-[#0878E8]" to="/">Go to SABHA</Link>
      </main>
    );
  }

  if (session === undefined) return <p className="p-6 text-slate-400">Checking session…</p>;
  if (!session) return <Navigate to="/" replace />;

  return <DemoApp email={session.user.email} onSignOut={() => supabase.auth.signOut()} />;
}

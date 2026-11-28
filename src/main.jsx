import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { documentTitle } from "./brand.js";
import "./index.css";

document.title = documentTitle;

const Platform = lazy(() => import("./platform/Platform.jsx"));
const SocietyOS = lazy(() => import("./SocietyOS.jsx"));
const ResetPassword = lazy(() => import("./components/AccountRecovery.jsx").then((mod) => ({ default: mod.ResetPassword })));
const JoinCommunity = lazy(() => import("./components/AccountRecovery.jsx").then((mod) => ({ default: mod.JoinCommunity })));

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<p className="p-6 text-slate-400">Loading…</p>}>
        <Routes>
          <Route path="/reset" element={<ResetPassword />} />
          <Route path="/join" element={<JoinCommunity />} />
          <Route path="/legacy/*" element={<SocietyOS />} />
          <Route path="/*" element={<Platform />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>
);

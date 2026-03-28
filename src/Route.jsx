// ============================================================
//  MEALKART — Route.jsx
//  This is your app entry point / router.
//  Your main.jsx should import and render this file.
//
//  Check your main.jsx — it should look like:
//    import Route from "./Route";
//    ReactDOM.createRoot(...).render(<Route />);
//
//  Run once if not done: npm install react-router-dom
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Mealkart       from "./App";             // ← your App.jsx has all Mealkart code
import AdminDashboard from "./AdminDashboard";   // ← admin panel
// App.css is already imported inside App.jsx so no need to import here

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Main parent ordering site ── */}
        <Route path="/" element={<Mealkart />} />

        {/* ── Admin dashboard (password protected) ── */}
        <Route path="/admin" element={<AdminDashboard />} />

        {/* ── Any unknown URL → redirect home ── */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

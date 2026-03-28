import { useState, useEffect } from "react";

// ── All styles in App.css (add admin CSS block below to App.css) ──

const API = "https://mealkart1-project-production.up.railway.app";

const PLAN_COLORS = {
  one_meal:    "#FF6D00",
  weekly:      "#FF8F00",
  fortnightly: "#F4511E",
  monthly:     "#BF360C",
};

export default function AdminDashboard() {
  const [authed,    setAuthed]    = useState(false);
  const [password,  setPassword]  = useState("");
  const [token,     setToken]     = useState(localStorage.getItem("mk_admin_token") || "");
  const [loginErr,  setLoginErr]  = useState("");
  const [logging,   setLogging]   = useState(false);

  const [tab,       setTab]       = useState("today"); // "today" | "all" | "summary"
  const [orders,    setOrders]    = useState([]);
  const [summary,   setSummary]   = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [search,    setSearch]    = useState("");
  const [downloading, setDownloading] = useState(false);

  // ── Auto-login if token saved ──
  useEffect(() => {
    if (token) verifyAndLoad(token);
  }, []);

  async function login() {
    setLogging(true); setLoginErr("");
    try {
      const res  = await fetch(`${API}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("mk_admin_token", data.token);
        setToken(data.token);
        setAuthed(true);
        loadData(data.token, tab);
      } else {
        setLoginErr("Wrong password. Try again.");
      }
    } catch {
      setLoginErr("Cannot reach server. Is backend running?");
    }
    setLogging(false);
  }

  async function verifyAndLoad(t) {
    try {
      const res = await fetch(`${API}/api/admin/summary`, {
        headers: { "x-admin-token": t },
      });
      if (res.ok) { setAuthed(true); loadData(t, "today"); }
      else logout();
    } catch { logout(); }
  }

  function logout() {
    localStorage.removeItem("mk_admin_token");
    setToken(""); setAuthed(false); setOrders([]); setSummary(null);
  }

  async function loadData(t = token, currentTab = tab) {
    setLoading(true);
    try {
      const [ordRes, sumRes] = await Promise.all([
        fetch(`${API}/api/admin/orders${currentTab === "today" ? "/today" : ""}`, {
          headers: { "x-admin-token": t },
        }),
        fetch(`${API}/api/admin/summary`, { headers: { "x-admin-token": t } }),
      ]);
      const [ordData, sumData] = await Promise.all([ordRes.json(), sumRes.json()]);
      setOrders(ordData.orders || []);
      setSummary(sumData);
    } catch { setOrders([]); }
    setLoading(false);
  }

  async function downloadExcel() {
    setDownloading(true);
    try {
      const res  = await fetch(`${API}/api/admin/download`, {
        headers: { "x-admin-token": token },
      });
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = "mealkart_orders.xlsx"; a.click();
    } catch { alert("Download failed."); }
    setDownloading(false);
  }

  function switchTab(t) {
    setTab(t);
    if (t !== "summary") loadData(token, t);
  }

  const filtered = orders.filter(o =>
    !search ||
    o.child_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.school?.toLowerCase().includes(search.toLowerCase()) ||
    o.parent_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.parent_phone?.includes(search)
  );

  // ── LOGIN SCREEN ──────────────────────────────────────────
  if (!authed) return (
    <div className="adm-login-wrap">
      <div className="adm-login-card">
        <div className="adm-login-logo">🍱 Mealkart</div>
        <div className="adm-login-title">Admin Dashboard</div>
        <div className="adm-login-sub">Enter your admin password to continue</div>
        <input
          className="adm-input"
          type="password"
          placeholder="Admin password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && login()}
        />
        {loginErr && <div className="adm-error">{loginErr}</div>}
        <button className="adm-btn adm-btn-primary" onClick={login} disabled={logging || !password}>
          {logging ? "Logging in..." : "Login →"}
        </button>
      </div>
    </div>
  );

  // ── DASHBOARD ─────────────────────────────────────────────
  return (
    <div className="adm-root">

      {/* NAV */}
      <div className="adm-nav">
        <div className="adm-nav-logo">🍱 Mealkart <span>Admin</span></div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <button className="adm-refresh-btn" onClick={() => loadData()}>↻ Refresh</button>
          <button className="adm-logout-btn" onClick={logout}>Logout</button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      {summary && (
        <div className="adm-summary-row">
          {[
            { label:"Total Orders",   value: summary.total_orders,  icon:"📦", color:"#FF5722" },
            { label:"Total Revenue",  value: "₹"+summary.total_revenue, icon:"💰", color:"#FF8F00" },
            { label:"Today's Orders", value: summary.today_orders,  icon:"📅", color:"#43A047" },
            { label:"Today Revenue",  value: "₹"+summary.today_revenue, icon:"🏦", color:"#1E88E5" },
          ].map(c => (
            <div className="adm-summary-card" key={c.label}>
              <div className="adm-summary-icon" style={{background:c.color}}>{c.icon}</div>
              <div className="adm-summary-value">{c.value}</div>
              <div className="adm-summary-label">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* PLAN BREAKDOWN */}
      {summary?.by_plan && (
        <div className="adm-plan-row">
          {Object.entries(summary.by_plan).map(([plan, count]) => (
            <div className="adm-plan-chip" key={plan}
              style={{borderColor: PLAN_COLORS[plan]||"#FF5722", color: PLAN_COLORS[plan]||"#FF5722"}}>
              {plan.replace("_"," ")} · <strong>{count}</strong>
            </div>
          ))}
        </div>
      )}

      {/* TABS + ACTIONS */}
      <div className="adm-toolbar">
        <div className="adm-tabs">
          {[["today","Today's Orders"],["all","All Orders"]].map(([id,label]) => (
            <button key={id}
              className={`adm-tab ${tab===id?"active":""}`}
              onClick={() => switchTab(id)}
            >{label}</button>
          ))}
        </div>
        <div style={{display:"flex",gap:8}}>
          <input
            className="adm-search"
            placeholder="🔍 Search name, school, phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="adm-btn adm-btn-download" onClick={downloadExcel} disabled={downloading}>
            {downloading ? "..." : "⬇ Excel"}
          </button>
        </div>
      </div>

      {/* ORDERS TABLE */}
      <div className="adm-table-wrap">
        {loading ? (
          <div className="adm-loading">Loading orders...</div>
        ) : filtered.length === 0 ? (
          <div className="adm-empty">No orders found.</div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                {["Order ID","Date","School","Plan","Child","Class","Dietary","Parent","Phone","Amount","Status"].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o,i) => (
                <tr key={i} className={i%2===0?"adm-row-even":""}>
                  <td><code style={{fontSize:"0.75rem"}}>{o.order_id}</code></td>
                  <td style={{whiteSpace:"nowrap",fontSize:"0.78rem"}}>
                    {new Date(o.created_at).toLocaleString("en-IN",{timeZone:"Asia/Kolkata",
                      day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}
                  </td>
                  <td style={{maxWidth:160,fontSize:"0.8rem"}}>{o.school}</td>
                  <td>
                    <span className="adm-plan-badge"
                      style={{background:PLAN_COLORS[o.plan]||"#FF5722"}}>
                      {o.plan?.replace("_"," ")}
                    </span>
                  </td>
                  <td style={{fontWeight:600}}>{o.child_name}</td>
                  <td>{o.child_class}-{o.child_section}</td>
                  <td style={{fontSize:"0.78rem",color: o.dietary_notes ? "#C62828":"#9A7060"}}>
                    {o.dietary_notes || "—"}
                  </td>
                  <td>{o.parent_name}</td>
                  <td style={{whiteSpace:"nowrap"}}>+91{o.parent_phone}</td>
                  <td style={{fontWeight:700,color:"#FF5722"}}>₹{o.amount}</td>
                  <td>
                    <span className={`adm-status ${o.status}`}>{o.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="adm-footer">
        Mealkart Admin · {filtered.length} orders shown · © {new Date().getFullYear()}
      </div>
    </div>
  );
}

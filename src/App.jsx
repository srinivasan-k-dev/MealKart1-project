import { useState, useEffect } from "react";
import "./App.css";
// ── All styles live in App.css ──

// ── Constants ──────────────────────────────────────────────────────────

// Schools are fetched from Supabase via backend — no hardcoded list needed

const PLANS = [
  { id: "one_meal",    label: "One Meal",    icon: "🍱", price: "₹120",   desc: "Single meal, no commitment" },
  { id: "weekly",      label: "Weekly",      icon: "📅", price: "₹540",   desc: "5 meals over the week",    badge: "Popular" },
  { id: "fortnightly", label: "Fortnightly", icon: "🗓️", price: "₹1,020", desc: "10 meals every 2 weeks" },
  { id: "monthly",     label: "Monthly",     icon: "🏆", price: "₹1,980", desc: "20 meals every month",    badge: "Best Value" },
];

const PLAN_LABELS = {
  one_meal: "One Meal", weekly: "Weekly",
  fortnightly: "Fortnightly", monthly: "Monthly",
};

const CLASSES  = ["Nursery","LKG","UKG",...Array.from({length:12},(_,i)=>`Class ${i+1}`)];
const SECTIONS = ["A","B","C","D","E","F"];
const steps    = ["School","Plan","Child","Parent","Payment","Confirm"];

// ── Weekly Menu Data ────────────────────────────────────────────────────
const WEEKLY_MENU = [
  { day:"Monday",    emoji:"🍛", main:"Dal Tadka Rice",    side:"Aloo Sabzi + Roti",      sweet:"Banana" },
  { day:"Tuesday",   emoji:"🥘", main:"Rajma Chawal",      side:"Cucumber Raita",          sweet:"Jaggery Chikki" },
  { day:"Wednesday", emoji:"🍚", main:"Vegetable Pulao",   side:"Dal + Papad",             sweet:"Seasonal Fruit" },
  { day:"Thursday",  emoji:"🫓", main:"Chapati + Dal Fry", side:"Dry Aloo Gobi",           sweet:"Sweet Pongal" },
  { day:"Friday",    emoji:"🍲", main:"Sambar Rice",       side:"Coconut Chutney + Papad", sweet:"Ladoo" },
];

// ── Testimonials ────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    name: "Priya Ramakrishnan",
    child: "Mother of Aarav, Class 4 – Greenwood High",
    avatar: "👩",
    text: "My son used to skip lunch at school. Since we started Mealkart's weekly plan, he finishes every bite and comes home happy. The food actually tastes home-made!",
    stars: 5,
  },
  {
    name: "Suresh Venkataraman",
    child: "Father of Diya, Class 7 – NPS Koramangala",
    avatar: "👨",
    text: "Ordering was so simple — done in under 2 minutes. I got a WhatsApp confirmation instantly. No more worrying about tiffin boxes every morning!",
    stars: 5,
  },
  {
    name: "Anitha Krishnamurthy",
    child: "Mother of Rohan & Kavya – DPS Bangalore East",
    avatar: "👩‍👧‍👦",
    text: "I subscribed the monthly plan for both my kids. The savings compared to ordering daily are great and the quality has been consistent every single day.",
    stars: 5,
  },
];

// ── Backend URL — change this one line to switch between local and live ──
const BACKEND = "https://mealkart-project.onrender.com";
// const BACKEND = "http://localhost:5000"; // ← uncomment for local dev

// ── Razorpay key ────────────────────────────────────────────────────────
const RAZORPAY_KEY_ID = "rzp_live_SX2Exq3BAxFpDf";

const PLAN_AMOUNTS = {
  one_meal: 12000, weekly: 54000, fortnightly: 102000, monthly: 198000,
};

// ═══════════════════════════════════════════════════════════════════════
export default function Mealkart() {

  // ── State ──────────────────────────────────────────────────────────

  // Save-progress: restore form from sessionStorage if browser was closed mid-form
  const savedForm = (() => {
    try { return JSON.parse(sessionStorage.getItem("mk_form") || "{}"); } catch { return {}; }
  })();
  const savedStep = (() => {
    try { const s = sessionStorage.getItem("mk_step"); return s ? parseInt(s) : 0; } catch { return 0; }
  })();

  const [step,        setStep]        = useState(savedStep);
  const [schoolSearch,setSchoolSearch]= useState("");
  const [form,        setForm]        = useState({
    school:"", plan:"", childName:"", childClass:"", childSection:"",
    parentName:"", parentPhone:"", dietaryNotes:"",
    ...savedForm, // restore saved progress
  });
  const [errors,      setErrors]      = useState({});
  const [paying,      setPaying]      = useState(false);
  const [payError,    setPayError]    = useState(null);
  const [showTrack,   setShowTrack]   = useState(false);
  const [trackPhone,  setTrackPhone]  = useState("");
  const [trackResult, setTrackResult] = useState(null);
  const [tracking,    setTracking]    = useState(false);
  const [termsOk,     setTermsOk]     = useState(false);
  const [showTerms,   setShowTerms]   = useState(false);
  const [openFaq,     setOpenFaq]     = useState(null);

  // ── Schools state (fetched from Supabase via backend) ─────────────
  const [schools,        setSchools]        = useState([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);

  // ── OTP state ──────────────────────────────────────────────────────
  // NOTE: OTP details at bottom of file
  const [otpSent,     setOtpSent]     = useState(false);
  const [otpValue,    setOtpValue]    = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError,    setOtpError]    = useState("");
  const [otpSending,  setOtpSending]  = useState(false);
  const [generatedOtp,setGeneratedOtp]= useState(null); // dev-only fallback

  // ── orderId — persisted in sessionStorage ──────────────────────────
  const [orderId] = useState(() => {
    const existing = sessionStorage.getItem("mk_order_id");
    if (existing) return existing;
    const fresh = "MK" + Date.now().toString().slice(-8) +
                  Math.random().toString(36).slice(-4).toUpperCase();
    sessionStorage.setItem("mk_order_id", fresh);
    return fresh;
  });

  // ── Load all schools on mount ─────────────────────────────────────
  useEffect(() => {
    fetch(`${BACKEND}/api/schools`)
      .then(r => r.json())
      .then(d => setSchools(d.schools || []))
      .catch(() => {});
  }, []);

  // ── Search schools with 300ms debounce ────────────────────────────
  useEffect(() => {
    const timer = setTimeout(async () => {
      setSchoolsLoading(true);
      try {
        const res  = await fetch(`${BACKEND}/api/schools?search=${encodeURIComponent(schoolSearch)}`);
        const data = await res.json();
        setSchools(data.schools || []);
      } catch { setSchools([]); }
      setSchoolsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [schoolSearch]);

  // ── Helpers ────────────────────────────────────────────────────────
  const set = (k, v) => setForm(f => {
    const updated = { ...f, [k]: v };
    // Save progress to sessionStorage so browser close doesn't lose data
    sessionStorage.setItem("mk_form", JSON.stringify(updated));
    return updated;
  });
  const goStep = (s) => {
    setStep(s);
    if (typeof s === "number") sessionStorage.setItem("mk_step", s);
  };
  const filteredSchools = schools;
  const selectedPlan = PLANS.find(p => p.id === form.plan);

  // ── Validation ─────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (step === 0 && !form.school)  e.school = "Please select a school";
    if (step === 1 && !form.plan)    e.plan   = "Please select a subscription plan";
    if (step === 2) {
      if (!form.childName.trim())    e.childName    = "Child name is required";
      if (!form.childClass)          e.childClass   = "Select class";
      if (!form.childSection)        e.childSection = "Select section";
    }
    if (step === 3) {
      if (!form.parentName.trim())   e.parentName  = "Parent name is required";
      if (!/^[6-9]\d{9}$/.test(form.parentPhone))
                                     e.parentPhone = "Enter valid 10-digit mobile number";
      if (!otpVerified)              e.otp         = "Please verify your mobile number with OTP";
      if (!termsOk)                  e.terms       = "Please accept the terms & conditions";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) goStep(s => typeof s === "number" ? s + 1 : s); };
  const back = () => { goStep(s => typeof s === "number" ? s - 1 : 0); setErrors({}); };

  // ── OTP: Send ──────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(form.parentPhone)) {
      setErrors(e => ({ ...e, parentPhone: "Enter valid 10-digit mobile number first" }));
      return;
    }
    setOtpSending(true);
    setOtpError("");
    try {
      const res  = await fetch(`${BACKEND}/api/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.parentPhone }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
        // DEV ONLY: backend returns otp in dev mode so you can test without SMS
        if (data.otp) setGeneratedOtp(data.otp);
      } else {
        setOtpError("Failed to send OTP. Please try again.");
      }
    } catch {
      setOtpError("Could not reach server. Please try again.");
    }
    setOtpSending(false);
  };

  // ── OTP: Verify ────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    setOtpError("");
    try {
      const res  = await fetch(`${BACKEND}/api/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.parentPhone, otp: otpValue }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpVerified(true);
        setErrors(e => { const n={...e}; delete n.otp; return n; });
      } else {
        setOtpError(data.error || "Incorrect OTP. Please check and try again.");
      }
    } catch {
      setOtpError("Could not reach server. Please try again.");
    }
  };

  // ── Payment ────────────────────────────────────────────────────────
  const handlePayment = () => {
    setPaying(true);
    setPayError(null);

    fetch(`${BACKEND}/api/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: PLAN_AMOUNTS[form.plan], plan: form.plan,
        childName: form.childName, childClass: form.childClass,
        childSection: form.childSection, parentName: form.parentName,
        parentPhone: form.parentPhone, school: form.school, orderId,
      }),
    })
    .then(r => r.json())
    .then(order => {
      const options = {
        key: RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Mealkart",
        description: `${selectedPlan?.label} Plan – ${form.childName}`,
        order_id: order.id,
        prefill: {
          name: form.parentName,
          contact: "+91" + form.parentPhone,
          // No email/vpa prefill — avoids "Invalid UPI ID" error on live key
        },
        method: {
          upi:        true,
          card:       true,
          netbanking: true,
          wallet:     true,
          emi:        false,
        },
        notes: { school: form.school, child: form.childName,
                 class: form.childClass+" "+form.childSection, plan: form.plan },
        theme: { color: "#FF5722" },
        handler: function(response) {
          fetch(`${BACKEND}/api/verify-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              formData: form, orderId,
            }),
          })
          .then(r => r.json())
          .then(result => {
            setPaying(false);
            if (result.success) {
              goStep(5);
            } else {
              setPayError("Payment received but verification failed. Contact support with Order ID: " + orderId);
              goStep("error");
            }
          })
          .catch(() => {
            setPaying(false);
            setPayError("Server unreachable after payment. Do NOT pay again. Contact support with Order ID: " + orderId);
            goStep("error");
          });
        },
        modal: { ondismiss: () => setPaying(false) },
      };

      if (!window.Razorpay) {
        const s = document.createElement("script");
        s.src = "https://checkout.razorpay.com/v1/checkout.js";
        s.onload = () => new window.Razorpay(options).open();
        document.body.appendChild(s);
      } else {
        new window.Razorpay(options).open();
      }
    })
    .catch(() => {
      setPaying(false);
      setPayError("Could not connect to server. Check your internet and try again.");
      goStep("error");
    });
  };

  // ── Track Order ────────────────────────────────────────────────────
  const handleTrackOrder = async () => {
    if (!/^[6-9]\d{9}$/.test(trackPhone)) return;
    setTracking(true);
    setTrackResult(null);
    try {
      const res  = await fetch(`${BACKEND}/api/orders/track?phone=${trackPhone}`);
      const data = await res.json();
      setTrackResult(data.orders || []);
    } catch {
      setTrackResult([]);
    }
    setTracking(false);
  };

  // ── Reset ──────────────────────────────────────────────────────────
  const resetAll = () => {
    sessionStorage.removeItem("mk_order_id");
    sessionStorage.removeItem("mk_form");
    sessionStorage.removeItem("mk_step");
    setStep(0);
    setForm({ school:"",plan:"",childName:"",childClass:"",childSection:"",parentName:"",parentPhone:"",dietaryNotes:"" });
    setSchoolSearch("");
    setOtpSent(false); setOtpValue(""); setOtpVerified(false);
    setOtpError(""); setTermsOk(false);
    window.location.reload();
  };

  // ═════════════════════════════════════════════════════════════════
  // JSX
  // ═════════════════════════════════════════════════════════════════
  return (
    <>
      <div className="mk-root">

        {/* ── NAV ── */}
        <nav className="mk-nav">
          <div className="mk-logo">Meal<span>kart</span></div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <button className="mk-nav-track-btn" onClick={() => setShowTrack(t => !t)}>
              📦 {showTrack ? "Close" : "Track Order"}
            </button>
            <div className="mk-nav-tag">🎒 Bengaluru</div>
          </div>
        </nav>

        {/* ── TRACK ORDER PANEL ── */}
        {showTrack && (
          <div className="mk-track-panel">
            <div className="mk-track-title">📦 Track My Order</div>
            <div className="mk-track-sub">Enter your WhatsApp number to see your active meal plan</div>
            <div className="mk-track-row">
              <div style={{position:"relative",flex:1}}>
                <span className="mk-track-prefix">+91</span>
                <input
                  className="mk-input mk-track-input"
                  placeholder="10-digit mobile number"
                  value={trackPhone}
                  maxLength={10}
                  inputMode="numeric"
                  onChange={e => { setTrackPhone(e.target.value.replace(/\D/g,"")); setTrackResult(null); }}
                />
              </div>
              <button
                className="mk-btn mk-btn-primary mk-track-btn"
                onClick={handleTrackOrder}
                disabled={tracking || trackPhone.length !== 10}
              >
                {tracking ? <span className="mk-spinner" /> : "Search"}
              </button>
            </div>

            {trackResult !== null && trackResult.length === 0 && (
              <div className="mk-track-empty">
                No active orders found for this number. Double-check or place a new order.
              </div>
            )}
            {trackResult && trackResult.map((o, i) => (
              <div className="mk-track-order" key={i}>
                <div className="mk-track-order-header">
                  <span className="mk-track-status-dot" />
                  <strong>Active Subscription</strong>
                  <span className="mk-track-order-id">#{o.order_id}</span>
                </div>
                <div className="mk-track-order-body">
                  {[
                    ["Child",   o.child_name],
                    ["Class",   `${o.child_class} – ${o.child_section}`],
                    ["School",  o.school],
                    ["Plan",    PLAN_LABELS[o.plan] || o.plan],
                    ["Amount",  `₹${o.amount}`],
                    ["Since",   new Date(o.created_at).toLocaleDateString("en-IN")],
                  ].map(([k,v]) => (
                    <div className="mk-track-row-item" key={k}>
                      <span>{k}</span><strong>{v}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── HERO (step 0 only) ── */}
        {step === 0 && !showTrack && (
          <div className="mk-hero">
            <div className="mk-hero-badge">🍛 Freshly Cooked · Delivered Daily</div>
            <h1>Healthy School Meals,<br /><span>Every Single Day</span></h1>
            <p>Subscribe to nutritious, freshly prepared lunch for your child.<br />Delivered directly to their school in Bengaluru.</p>
          </div>
        )}

        {/* ── TESTIMONIALS (step 0 only) ── */}
        {step === 0 && !showTrack && (
          <div className="mk-testimonials">
            <div className="mk-section-title">What Parents Say</div>
            <div className="mk-section-sub">Trusted by 200+ families across Bengaluru schools</div>
            <div className="mk-testi-cards">
              {TESTIMONIALS.map((t,i) => (
                <div className="mk-testi-card" key={i}>
                  <div className="mk-testi-stars">{"⭐".repeat(t.stars)}</div>
                  <p className="mk-testi-text">"{t.text}"</p>
                  <div className="mk-testi-author">
                    <span className="mk-testi-avatar">{t.avatar}</span>
                    <div>
                      <div className="mk-testi-name">{t.name}</div>
                      <div className="mk-testi-child">{t.child}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SAMPLE WEEKLY MENU (step 0 only) ── */}
        {step === 0 && !showTrack && (
          <div className="mk-menu-section">
            <div className="mk-section-title">Sample Weekly Menu</div>
            <div className="mk-section-sub">Fresh, balanced meals — every school day</div>
            <div className="mk-menu-cards">
              {WEEKLY_MENU.map((m,i) => (
                <div className="mk-menu-card" key={i}>
                  <div className="mk-menu-emoji">{m.emoji}</div>
                  <div className="mk-menu-day">{m.day}</div>
                  <div className="mk-menu-main">{m.main}</div>
                  <div className="mk-menu-side">{m.side}</div>
                  <div className="mk-menu-sweet">🍬 {m.sweet}</div>
                </div>
              ))}
            </div>
            <div className="mk-menu-note">
              🥗 Menu rotates weekly · No repeats · Nutritionist approved · No preservatives
            </div>
          </div>
        )}

        {/* ── PHOTO GALLERY (step 0 only) ── */}
        {step === 0 && !showTrack && (
          <div className="mk-gallery-section">
            <div className="mk-section-title">Our Meals</div>
            <div className="mk-section-sub">Freshly cooked, every single school day</div>
            <div className="mk-gallery-grid">
              {[
                { emoji:"🍛", label:"Dal Tadka Rice",      bg:"linear-gradient(135deg,#FF5722,#FF8F00)" },
                { emoji:"🥘", label:"Rajma Chawal",         bg:"linear-gradient(135deg,#FF8F00,#FFC107)" },
                { emoji:"🍲", label:"Sambar Rice",          bg:"linear-gradient(135deg,#F4511E,#FF5722)" },
                { emoji:"🫓", label:"Chapati + Sabzi",      bg:"linear-gradient(135deg,#FF6D00,#FF8F00)" },
                { emoji:"🍚", label:"Vegetable Pulao",      bg:"linear-gradient(135deg,#BF360C,#F4511E)" },
              ].map((item,i) => (
                <div className="mk-gallery-item" key={i} style={{background:item.bg}}>
                  {item.emoji}
                  <div className="mk-gallery-label">{item.label}</div>
                </div>
              ))}
            </div>
            <div className="mk-menu-note" style={{marginTop:14}}>
              📸 Replace these with real food photos once your kitchen is ready
            </div>
          </div>
        )}

        {/* ── FAQ (step 0 only) ── */}
        {step === 0 && !showTrack && (
          <div className="mk-faq-section">
            <div className="mk-section-title">Frequently Asked Questions</div>
            <div className="mk-section-sub">Everything parents want to know before subscribing</div>
            {[
              { q:"What if my child is absent from school?",
                a:"No refund for individual absent days. However if your child is absent for more than 3 consecutive days, WhatsApp us and we'll arrange a credit for those days." },
              { q:"Can I pause or cancel my subscription?",
                a:"Yes! WhatsApp us at +91 9566680245 at least 48 hours before your next billing date to pause or cancel. We'll process your request within 2 hours." },
              { q:"What time is lunch delivered?",
                a:"Meals reach the school by 11:30 AM and are handed over to the school canteen or reception. Your child can collect it during their lunch break." },
              { q:"Do you deliver on exam days or school holidays?",
                a:"No deliveries on public holidays. For internal exam days, we continue delivery unless the school is officially closed. We follow each school's calendar." },
              { q:"Can I change my plan after subscribing?",
                a:"Yes, you can upgrade or downgrade your plan. The change takes effect from the next billing cycle. WhatsApp us to request a change." },
              { q:"My child has a food allergy — is it safe?",
                a:"Absolutely important. Please mention all allergies in the 'Dietary Requirements' field when ordering. Our kitchen prepares allergen-aware meals and labels them accordingly." },
              { q:"Is the food vegetarian?",
                a:"Yes, all Mealkart meals are 100% vegetarian. No meat, no fish, no eggs. We also accommodate Jain food requirements — just mention it when ordering." },
              { q:"How do I receive my WhatsApp confirmation?",
                a:"After payment, a confirmation is automatically sent to your verified WhatsApp number within a few minutes. If you don't receive it, WhatsApp us and we'll resend." },
            ].map((item, i) => (
              <div className="mk-faq-item" key={i}>
                <div className="mk-faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{item.q}</span>
                  <span className={`mk-faq-arrow ${openFaq === i ? "open" : ""}`}>▼</span>
                </div>
                {openFaq === i && (
                  <div className="mk-faq-answer">{item.a}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── STEPPER (hidden when track panel is open) ── */}
        {!showTrack && (
          <div className="mk-stepper" style={{marginTop: step===0 ? 24 : 40}}>
            {steps.map((s, i) => (
              <div key={s} className={`mk-step-item ${i < step ? "done" : ""} ${i === step ? "active" : ""}`}>
                <div className="mk-step-dot">{i < step ? "✓" : i+1}</div>
                <div className="mk-step-label">{s}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── STEP 0: School ── */}
        {!showTrack && step === 0 && (
          <div className="mk-card">
            <div className="mk-card-title">Select Your Child's School</div>
            <div className="mk-card-sub">Choose from Bengaluru schools we currently serve</div>
            <div className="mk-school-search">
              <span className="mk-school-search-icon">🔍</span>
              <input
                className="mk-input"
                placeholder="Search school name..."
                value={schoolSearch}
                onChange={e => setSchoolSearch(e.target.value)}
              />
            </div>
            <div className="mk-school-list">
              {schoolsLoading && (
                <div style={{padding:"16px",textAlign:"center",color:"#9A7060",fontSize:"0.88rem"}}>
                  🔍 Searching schools...
                </div>
              )}
              {!schoolsLoading && filteredSchools.map(s => (
                <div key={s}
                  className={`mk-school-item ${form.school === s ? "selected" : ""}`}
                  onClick={() => { set("school", s); setErrors({}); }}
                >
                  🏫 {s}
                </div>
              ))}
              {!schoolsLoading && filteredSchools.length === 0 && (
                <div style={{padding:"20px",color:"#9A7060",textAlign:"center",fontSize:"0.88rem"}}>
                  {schoolSearch ? "No schools found. Try a different search." : "Loading schools..."}
                </div>
              )}
            </div>
            {form.school && (
              <div className="mk-school-selected-badge">✅ Selected: {form.school}</div>
            )}
            {errors.school && <div className="mk-error">⚠ {errors.school}</div>}
            <br />
            <button className="mk-btn mk-btn-primary" onClick={next}>Continue →</button>
          </div>
        )}

        {/* ── STEP 1: Plan ── */}
        {!showTrack && step === 1 && (
          <div className="mk-card">
            <div className="mk-card-title">Choose a Subscription Plan</div>
            <div className="mk-card-sub">Pick the meal plan that works best for your family</div>
            <div className="mk-plans">
              {PLANS.map(p => (
                <div key={p.id}
                  className={`mk-plan-card ${form.plan === p.id ? "selected" : ""}`}
                  onClick={() => { set("plan", p.id); setErrors({}); }}
                >
                  {form.plan === p.id && <div className="mk-plan-check">✓</div>}
                  {p.badge && <div className="mk-plan-badge">{p.badge}</div>}
                  <div className="mk-plan-icon">{p.icon}</div>
                  <div className="mk-plan-name">{p.label}</div>
                  <div className="mk-plan-price">{p.price}</div>
                  <div className="mk-plan-desc">{p.desc}</div>
                </div>
              ))}
            </div>
            {errors.plan && <div className="mk-error" style={{marginTop:12}}>⚠ {errors.plan}</div>}
            <br />
            <button className="mk-btn mk-btn-secondary" onClick={back}>← Back</button>
            <button className="mk-btn mk-btn-primary" onClick={next}>Continue →</button>
          </div>
        )}

        {/* ── STEP 2: Child Details ── */}
        {!showTrack && step === 2 && (
          <div className="mk-card">
            <div className="mk-card-title">Child's Details</div>
            <div className="mk-card-sub">Tell us about your child so we can personalise their meals</div>
            <div className="mk-field">
              <label className="mk-label">Child's Full Name</label>
              <input className="mk-input" placeholder="e.g. Ananya Sharma"
                value={form.childName} onChange={e => set("childName", e.target.value)} />
              {errors.childName && <div className="mk-error">⚠ {errors.childName}</div>}
            </div>
            <div className="mk-row">
              <div className="mk-field">
                <label className="mk-label">Class</label>
                <select className="mk-select" value={form.childClass} onChange={e => set("childClass", e.target.value)}>
                  <option value="">Select Class</option>
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.childClass && <div className="mk-error">⚠ {errors.childClass}</div>}
              </div>
              <div className="mk-field">
                <label className="mk-label">Section</label>
                <select className="mk-select" value={form.childSection} onChange={e => set("childSection", e.target.value)}>
                  <option value="">Section</option>
                  {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.childSection && <div className="mk-error">⚠ {errors.childSection}</div>}
              </div>
            </div>
            <div className="mk-field">
              <label className="mk-label">Dietary Requirements / Allergies <span style={{color:"#9A7060",fontWeight:400,textTransform:"none"}}>(optional)</span></label>
              <input
                className="mk-input"
                placeholder="e.g. Vegetarian, No nuts, Jain food, Diabetic-friendly..."
                value={form.dietaryNotes}
                onChange={e => set("dietaryNotes", e.target.value)}
              />
              <div className="mk-dietary-note">
                ⚠ Please mention any allergies or special dietary needs. This will be communicated to our kitchen and school.
              </div>
            </div>
            <button className="mk-btn mk-btn-secondary" onClick={back}>← Back</button>
            <button className="mk-btn mk-btn-primary" onClick={next}>Continue →</button>
          </div>
        )}

        {/* ── STEP 3: Parent Details + OTP ── */}
        {!showTrack && step === 3 && (
          <div className="mk-card">
            <div className="mk-card-title">Parent's Details</div>
            <div className="mk-card-sub">We'll verify your number and send order updates on WhatsApp</div>

            <div className="mk-field">
              <label className="mk-label">Parent / Guardian Name</label>
              <input className="mk-input" placeholder="e.g. Rahul Sharma"
                value={form.parentName} onChange={e => set("parentName", e.target.value)} />
              {errors.parentName && <div className="mk-error">⚠ {errors.parentName}</div>}
            </div>

            <div className="mk-field">
              <label className="mk-label">WhatsApp / Mobile Number</label>
              <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                <div style={{position:"relative",flex:1}}>
                  <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"#9A7060",fontSize:"0.88rem",fontWeight:600}}>+91</span>
                  <input
                    className="mk-input"
                    style={{paddingLeft:44}}
                    placeholder="10-digit mobile number"
                    value={form.parentPhone}
                    maxLength={10}
                    inputMode="numeric"
                    onChange={e => {
                      set("parentPhone", e.target.value.replace(/\D/g,""));
                      setOtpSent(false);
                      setOtpVerified(false);
                      setOtpValue("");
                      setOtpError("");
                    }}
                    disabled={otpVerified}
                  />
                </div>
                {!otpVerified && (
                  <button
                    className="mk-otp-send-btn"
                    onClick={handleSendOtp}
                    disabled={otpSending || form.parentPhone.length !== 10}
                  >
                    {otpSending ? <span className="mk-spinner" /> : otpSent ? "Resend" : "Send OTP"}
                  </button>
                )}
                {otpVerified && (
                  <div className="mk-otp-verified-badge">✅ Verified</div>
                )}
              </div>
              {errors.parentPhone && <div className="mk-error">⚠ {errors.parentPhone}</div>}
            </div>

            {/* OTP Input — shown after OTP is sent */}
            {otpSent && !otpVerified && (
              <div className="mk-field">
                <label className="mk-label">Enter OTP</label>
                <div style={{display:"flex",gap:8}}>
                  <input
                    className="mk-input"
                    placeholder="6-digit OTP"
                    value={otpValue}
                    maxLength={6}
                    inputMode="numeric"
                    onChange={e => { setOtpValue(e.target.value.replace(/\D/g,"")); setOtpError(""); }}
                    style={{letterSpacing:"0.3em",fontWeight:700,fontSize:"1.1rem"}}
                  />
                  <button
                    className="mk-otp-send-btn"
                    onClick={handleVerifyOtp}
                    disabled={otpValue.length !== 6}
                  >
                    Verify
                  </button>
                </div>
                {/* DEV ONLY: shows OTP in browser when backend returns it in dev mode */}
                {generatedOtp && (
                  <div style={{marginTop:6,fontSize:"0.78rem",color:"#FF5722",background:"#FFF3EE",
                    padding:"6px 12px",borderRadius:8,border:"1px solid #FFD0B3"}}>
                    🧪 Dev mode OTP: <strong>{generatedOtp}</strong>
                  </div>
                )}
                {otpError && <div className="mk-error">⚠ {otpError}</div>}
              </div>
            )}
            {errors.otp && <div className="mk-error" style={{marginBottom:12}}>⚠ {errors.otp}</div>}

            {/* Terms & Conditions checkbox */}
            <div className="mk-terms-box">
              <label className="mk-terms-label">
                <input
                  type="checkbox"
                  checked={termsOk}
                  onChange={e => setTermsOk(e.target.checked)}
                  className="mk-terms-checkbox"
                />
                <span>
                  I agree to the{" "}
                  <button className="mk-terms-link" onClick={() => setShowTerms(true)}>
                    Terms &amp; Conditions and Refund Policy
                  </button>
                </span>
              </label>
              {errors.terms && <div className="mk-error">⚠ {errors.terms}</div>}
            </div>

            <button className="mk-btn mk-btn-secondary" onClick={back}>← Back</button>
            <button className="mk-btn mk-btn-primary" onClick={next}>Review &amp; Pay →</button>
          </div>
        )}

        {/* ── STEP 4: Payment ── */}
        {!showTrack && step === 4 && (
          <div className="mk-card">
            <div className="mk-card-title">Review &amp; Payment</div>
            <div className="mk-card-sub">Confirm your order details before paying</div>
            <div className="mk-pay-box">
              <div className="mk-pay-box-label">Total Amount</div>
              <div className="mk-pay-box-amount">{selectedPlan?.price}</div>
              <div className="mk-pay-box-plan">{selectedPlan?.label} Plan · {selectedPlan?.desc}</div>
            </div>
            <div className="mk-summary">
              {[
                ["School",         form.school],
                ["Plan",           selectedPlan?.label],
                ["Child",          form.childName],
                ["Class & Section",`${form.childClass} – ${form.childSection}`],
                ["Parent",         form.parentName],
                ["Phone",          "+91 " + form.parentPhone],
              ].map(([k,v]) => (
                <div className="mk-summary-row" key={k}>
                  <span>{k}</span><strong>{v}</strong>
                </div>
              ))}
            </div>
            <button className="mk-razor-btn" onClick={handlePayment} disabled={paying}>
              {paying ? (
                <><span className="mk-spinner" /> Connecting to Razorpay...</>
              ) : (
                <><span className="mk-razor-logo">Razorpay</span> Pay {selectedPlan?.price} Securely</>
              )}
            </button>
            <button className="mk-btn mk-btn-secondary" onClick={back} disabled={paying}>← Back</button>
            <div style={{textAlign:"center",fontSize:"0.76rem",color:"#B0907A",marginTop:8}}>
              🔒 256-bit encrypted · PCI DSS compliant · UPI / Cards / NetBanking accepted
            </div>
          </div>
        )}

        {/* ── ERROR STEP ── */}
        {!showTrack && step === "error" && (
          <div className="mk-card">
            <div className="mk-confirm">
              <div className="mk-error-icon">⚠️</div>
              <h2 style={{color:"#C62828"}}>Payment Failed</h2>
              <p style={{marginBottom:20}}>{payError}</p>
              <div className="mk-error-ref">
                <span>Your Order ID</span>
                <strong>{orderId}</strong>
              </div>
              <div className="mk-error-help">
                💬 Need help? WhatsApp us at <strong>+91 9566680245</strong> with your Order ID and we'll sort it out within 1 hour.
              </div>
              <button className="mk-btn mk-btn-primary" style={{marginBottom:12}}
                onClick={() => { setStep(4); setPayError(null); setPaying(false); }}>
                🔄 Try Again
              </button>
              <button className="mk-btn mk-btn-secondary"
                onClick={() => { setStep(0); setPayError(null); setPaying(false); }}>
                ← Start Over
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5: Confirmation ── */}
        {!showTrack && step === 5 && (
          <div className="mk-card">
            <div className="mk-confirm">
              <div className="mk-confirm-icon">🎉</div>
              <h2>You're All Set!</h2>
              <p>Meals for <strong>{form.childName}</strong> start from the next school day. WhatsApp confirmation sent to <strong>+91 {form.parentPhone}</strong>.</p>
              <div className="mk-confirm-detail">
                <div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,color:"#FF5722",marginBottom:10,fontSize:"0.88rem"}}>
                  ORDER #{orderId}
                </div>
                {[
                  ["School", form.school],
                  ["Plan",   selectedPlan?.label + " – " + selectedPlan?.price],
                  ["Child",  form.childName + ` · ${form.childClass} – ${form.childSection}`],
                  ["Parent", form.parentName + " · +91 " + form.parentPhone],
                ].map(([k,v]) => (
                  <div className="mk-confirm-detail-row" key={k}>
                    <span>{k}</span><strong>{v}</strong>
                  </div>
                ))}
              </div>
              <button className="mk-btn mk-btn-primary" onClick={resetAll}>
                Order for Another Child →
              </button>
            </div>
          </div>
        )}

        {/* ── WHAT TO EXPECT (after confirmation) ── */}
        {!showTrack && step === 5 && (
          <div className="mk-workflow">
            <div className="mk-workflow-title">What to Expect</div>
            <div className="mk-workflow-sub">Everything you need to know about your meal subscription</div>
            <div className="mk-wf-cards">
              {[
                { icon:"📲", title:"Confirmation Sent",  items:["WhatsApp sent to your number","School has been notified too","Save this for your records"] },
                { icon:"🍱", title:"First Meal",         items:["Starts next school day","Delivered before lunch break","Fresh, hot, and nutritious"] },
                { icon:"📅", title:"Your Schedule",      items:["Meals delivered Mon – Fri","No delivery on school holidays","We follow your school calendar"] },
                { icon:"🔁", title:"Renewals",           items:["Auto-renews on your plan cycle","Reminder sent 2 days before","Cancel anytime via WhatsApp"] },
                { icon:"❓", title:"Need Help?",         items:["WhatsApp: +91 9566680245","Reply to your confirmation","We respond within 2 hours"] },
                { icon:"🏅", title:"Quality Promise",    items:["Hygienic, home-style cooking","No preservatives or junk","Nutritionist-approved menus"] },
              ].map(w => (
                <div className="mk-wf-card" key={w.title}>
                  <div className="mk-wf-card-head">
                    <div className="mk-wf-icon">{w.icon}</div>
                    <div className="mk-wf-card-title">{w.title}</div>
                  </div>
                  <ul className="mk-wf-list">
                    {w.items.map(i => <li key={i}>{i}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FOOTER ── */}
        <div className="mk-footer">
          © {new Date().getFullYear()} Mealkart · Healthy meals for Bengaluru school children<br />
          <span style={{color:"#FF8A65"}}>Made with ❤️ for parents who care</span>
        </div>

        {/* ── TERMS & CONDITIONS MODAL ── */}
        {showTerms && (
          <div className="mk-modal-overlay" onClick={() => setShowTerms(false)}>
            <div className="mk-modal" onClick={e => e.stopPropagation()}>
              <div className="mk-modal-header">
                <h3>Terms, Conditions &amp; Refund Policy</h3>
                <button className="mk-modal-close" onClick={() => setShowTerms(false)}>✕</button>
              </div>
              <div className="mk-modal-body">
                <h4>Subscription &amp; Payments</h4>
                <p>All payments are processed securely via Razorpay. By subscribing, you authorise Mealkart to charge your chosen plan amount at the applicable frequency (weekly / fortnightly / monthly).</p>

                <h4>Meal Delivery</h4>
                <p>Meals are delivered to your child's school Monday to Friday during school hours. No meals are delivered on public holidays or school holidays as declared by the school.</p>

                <h4>Cancellations</h4>
                <p>You may cancel your subscription at any time by sending a WhatsApp message to +91 9566680245. Cancellations must be requested at least 48 hours before the next billing date to avoid being charged for the next cycle.</p>

                <h4>Refund Policy</h4>
                <p>Refunds are issued under the following conditions only:</p>
                <ul>
                  <li>Meal not delivered due to Mealkart's fault — full day refund.</li>
                  <li>Cancellation before the plan start date — 100% refund.</li>
                  <li>Cancellation mid-cycle — prorated refund for unused days, processed within 5–7 business days.</li>
                  <li>No refund for meals not collected by the child at school.</li>
                </ul>

                <h4>Food Safety</h4>
                <p>Mealkart follows strict food hygiene standards. Meals are freshly prepared and delivered in sealed containers. We are not liable for any allergic reactions to undisclosed ingredients — please inform us of any food allergies before subscribing.</p>

                <h4>Contact</h4>
                <p>For any queries, WhatsApp us at +91 9566680245 or email mealkart@gmail.com</p>
              </div>
              <div className="mk-modal-footer">
                <button className="mk-btn mk-btn-primary" onClick={() => { setTermsOk(true); setShowTerms(false); }}>
                  ✓ I Accept These Terms
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

/*
════════════════════════════════════════════════════════════════
  OTP SETUP — What you need for production

  The OTP flow calls two backend endpoints:
    POST /api/send-otp   { phone: "9876543210" }
    POST /api/verify-otp { phone: "9876543210", otp: "123456" }

  To add these to server.js you have two options:

  OPTION A — Twilio Verify (recommended, you already have Twilio):
    1. Go to console.twilio.com → Verify → Create a new Service
    2. Name it "Mealkart", copy the Service SID (VAXXXXXXXXXXXXXXXX)
    3. Add to .env:  TWILIO_VERIFY_SID=VAXXXXXXXXXXXXXXXX
    4. In server.js:
         app.post("/api/send-otp", async (req, res) => {
           const { phone } = req.body;
           await client.verify.v2.services(process.env.TWILIO_VERIFY_SID)
             .verifications.create({ to: "+91" + phone, channel: "whatsapp" });
           res.json({ success: true });
         });
         app.post("/api/verify-otp", async (req, res) => {
           const { phone, otp } = req.body;
           const check = await client.verify.v2.services(process.env.TWILIO_VERIFY_SID)
             .verificationChecks.create({ to: "+91" + phone, code: otp });
           res.json({ success: check.status === "approved" });
         });
    Cost: $0.05 per verification (~₹4)

  OPTION B — Dev/testing only (no SMS, OTP shown on screen):
    In server.js, add these simple routes that skip real SMS:
         const otpStore = {};
         app.post("/api/send-otp", (req, res) => {
           const otp = Math.floor(100000 + Math.random() * 900000).toString();
           otpStore[req.body.phone] = { otp, expires: Date.now() + 5 * 60 * 1000 };
           console.log("OTP for", req.body.phone, ":", otp);
           res.json({ success: true, otp }); // remove otp from response in production!
         });
         app.post("/api/verify-otp", (req, res) => {
           const record = otpStore[req.body.phone];
           if (!record || Date.now() > record.expires)
             return res.json({ success: false });
           res.json({ success: record.otp === req.body.otp });
         });
════════════════════════════════════════════════════════════════
*/

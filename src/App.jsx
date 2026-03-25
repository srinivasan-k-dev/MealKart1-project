import { useState, useEffect } from "react";
import "./App.css";
const SCHOOLS = [
  "The International School Bangalore (TISB)",
  "Inventure Academy",
  "Greenwood High International School",
  "Whitefield Global School",
  "Stonehill International School",
  "Delhi Public School (DPS) – Bangalore East",
  "Ryan International School – Bannerghatta Road",
  "National Public School (NPS) – Koramangala",
  "Vibgyor High – Marathahalli",
  "Orchids The International School – HSR Layout",
  "Indus International School",
  "Oakridge International School",
  "Candor International School",
  "Canadian International School",
  "Gear Innovative International School",
  "Harvest International School",
  "Prakriya Green Wisdom School",
  "The Valley School",
  "Chrysalis High – Bellandur",
  "Presidency School – RT Nagar",
  "Bishop Cotton Boys' School",
  "Baldwin Boys' High School",
  "St. Joseph's Boys' High School",
  "Clarence High School",
  "Frank Anthony Public School",
  "St. Francis Xavier Girls' High School",
  "Sophia High School",
  "Holy Cross School – Chamrajpet",
  "CMR National Public School – ITPL",
  "Kendriya Vidyalaya – Sadashivanagar",
];

const PLANS = [
  {
    id: "one_meal",
    label: "One Meal",
    icon: "🍱",
    price: "₹120",
    desc: "Single meal, no commitment",
    color: "#FFF3E0",
    accent: "#FF6D00",
  },
  {
    id: "weekly",
    label: "Weekly",
    icon: "📅",
    price: "₹540",
    desc: "5 meals over the week",
    color: "#FFF8E1",
    accent: "#FF8F00",
    badge: "Popular",
  },
  {
    id: "fortnightly",
    label: "Fortnightly",
    icon: "🗓️",
    price: "₹1,020",
    desc: "10 meals every 2 weeks",
    color: "#FFF3E0",
    accent: "#F4511E",
  },
  {
    id: "monthly",
    label: "Monthly",
    icon: "🏆",
    price: "₹1,980",
    desc: "20 meals every month",
    color: "#FBE9E7",
    accent: "#BF360C",
    badge: "Best Value",
  },
];

const CLASSES = [
  "Nursery","LKG","UKG",
  ...Array.from({length:12}, (_,i) => `Class ${i+1}`)
];

const SECTIONS = ["A","B","C","D","E","F"];

const steps = ["School", "Plan", "Child", "Parent", "Payment", "Confirm"];

export default function Mealkart() {
  const [step, setStep] = useState(0);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [form, setForm] = useState({
    school: "",
    plan: "",
    childName: "",
    childClass: "",
    childSection: "",
    parentName: "",
    parentPhone: "",
  });
  const [errors, setErrors] = useState({});
  const [paying, setPaying] = useState(false);
  const [orderId] = useState("MK" + Date.now().toString().slice(-8));

  const filteredSchools = SCHOOLS.filter(s =>
    s.toLowerCase().includes(schoolSearch.toLowerCase())
  );

  const selectedPlan = PLANS.find(p => p.id === form.plan);

  const validate = () => {
    const e = {};
    if (step === 0 && !form.school) e.school = "Please select a school";
    if (step === 1 && !form.plan) e.plan = "Please select a subscription plan";
    if (step === 2) {
      if (!form.childName.trim()) e.childName = "Child name is required";
      if (!form.childClass) e.childClass = "Select class";
      if (!form.childSection) e.childSection = "Select section";
    }
    if (step === 3) {
      if (!form.parentName.trim()) e.parentName = "Parent name is required";
      if (!/^[6-9]\d{9}$/.test(form.parentPhone)) e.parentPhone = "Enter valid 10-digit mobile number";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep(s => s + 1); };
  const back = () => { setStep(s => s - 1); setErrors({}); };

  // ─── RAZORPAY TEST KEY ───────────────────────────────────────────
  // Replace with your actual Test Key ID from https://dashboard.razorpay.com
  const RAZORPAY_KEY_ID = "rzp_test_SV4dFeYMKqu3JH"; // 👈 PASTE YOUR KEY HERE
  // ─────────────────────────────────────────────────────────────────

  // Plan amount map in paise (₹1 = 100 paise)
  const PLAN_AMOUNTS = {
    one_meal:    12000,   // ₹120
    weekly:      54000,   // ₹540
    fortnightly: 102000,  // ₹1,020
    monthly:     198000,  // ₹1,980
  };

  const handlePayment = () => {
    setPaying(true);

    // Step 1: Call your backend to create a Razorpay order
    // Your backend endpoint (server.js below) creates the order and returns { id, amount, currency }
    fetch("http://localhost:5000/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: PLAN_AMOUNTS[form.plan],
        plan: form.plan,
        childName: form.childName,
        childClass: form.childClass,
        childSection: form.childSection,
        parentName: form.parentName,
        parentPhone: form.parentPhone,
        school: form.school,
        orderId: orderId,
      }),
    })
      .then((res) => res.json())
      .then((order) => {
        // Step 2: Open Razorpay Checkout popup
        const options = {
          key: RAZORPAY_KEY_ID,            // Your Test Key ID
          amount: order.amount,             // In paise, returned from backend
          currency: order.currency || "INR",
          name: "Mealkart",
          description: `${selectedPlan?.label} Plan – ${form.childName}`,
          order_id: order.id,              // Razorpay order ID from backend
          prefill: {
            name: form.parentName,
            contact: "+91" + form.parentPhone,
          },
          notes: {
            school: form.school,
            child: form.childName,
            class: form.childClass + " " + form.childSection,
            plan: form.plan,
          },
          theme: { color: "#FF5722" },     // Orange brand color in popup
          handler: function (response) {
            // Step 3: Payment success — verify on backend
            fetch("http://localhost:5000/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                formData: form,
                orderId: orderId,
              }),
            })
              .then((r) => r.json())
              .then((result) => {
                if (result.success) {
                  setPaying(false);
                  setStep(5); // Show confirmation screen
                } else {
                  setPaying(false);
                  alert("Payment verification failed. Please contact support.");
                }
              })
              .catch(() => {
                setPaying(false);
                alert("Server error during verification. Please contact support.");
              });
          },
          modal: {
            ondismiss: () => {
              setPaying(false); // Re-enable button if user closes popup
            },
          },
        };

        // Load Razorpay script dynamically if not already loaded
        if (!window.Razorpay) {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => {
            const rzp = new window.Razorpay(options);
            rzp.open();
          };
          document.body.appendChild(script);
        } else {
          const rzp = new window.Razorpay(options);
          rzp.open();
        }
      })
      .catch(() => {
        setPaying(false);
        alert("Could not connect to server. Make sure backend is running on port 5000.");
      });
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <>
      <div className="mk-root">
        {/* NAV */}
        <nav className="mk-nav">
          <div className="mk-logo">Meal<span>kart</span></div>
          <div className="mk-nav-tag">🎒 School Meal Subscriptions · Bengaluru</div>
        </nav>

        {/* HERO */}
        {step === 0 && (
          <div className="mk-hero">
            <div className="mk-hero-badge">🍛 Freshly Cooked · Delivered Daily</div>
            <h1>Healthy School Meals,<br /><span>Every Single Day</span></h1>
            <p>Subscribe to nutritious, freshly prepared lunch for your child. Delivered directly to their school in Bengaluru.</p>
          </div>
        )}

        {/* STEPPER */}
        <div className="mk-stepper" style={{marginTop: step === 0 ? 0 : 40}}>
          {steps.map((s, i) => (
            <div key={s} className={`mk-step-item ${i < step ? "done" : ""} ${i === step ? "active" : ""}`}>
              <div className="mk-step-dot">
                {i < step ? "✓" : i + 1}
              </div>
              <div className="mk-step-label">{s}</div>
            </div>
          ))}
        </div>

        {/* STEP 0: School */}
        {step === 0 && (
          <div className="mk-card" style={{maxWidth:680}}>
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
              {filteredSchools.map(s => (
                <div
                  key={s}
                  className={`mk-school-item ${form.school === s ? "selected" : ""}`}
                  onClick={() => { set("school", s); setErrors({}); }}
                >
                  🏫 {s}
                </div>
              ))}
              {filteredSchools.length === 0 && (
                <div style={{padding:"20px",color:"#9A7060",textAlign:"center",fontSize:"0.88rem"}}>
                  No schools found. Try a different search.
                </div>
              )}
            </div>
            {form.school && (
              <div className="mk-school-selected-badge">
                ✅ Selected: {form.school}
              </div>
            )}
            {errors.school && <div className="mk-error">⚠ {errors.school}</div>}
            <br />
            <button className="mk-btn mk-btn-primary" onClick={next}>
              Continue →
            </button>
          </div>
        )}

        {/* STEP 1: Plan */}
        {step === 1 && (
          <div className="mk-card">
            <div className="mk-card-title">Choose a Subscription Plan</div>
            <div className="mk-card-sub">Pick the meal plan that works best for your family</div>
            <div className="mk-plans">
              {PLANS.map(p => (
                <div
                  key={p.id}
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

        {/* STEP 2: Child Details */}
        {step === 2 && (
          <div className="mk-card">
            <div className="mk-card-title">Child's Details</div>
            <div className="mk-card-sub">Tell us about your child so we can personalise their meals</div>
            <div className="mk-field">
              <label className="mk-label">Child's Full Name</label>
              <input className="mk-input" placeholder="e.g. Ananya Sharma" value={form.childName}
                onChange={e => set("childName", e.target.value)} />
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
            <button className="mk-btn mk-btn-secondary" onClick={back}>← Back</button>
            <button className="mk-btn mk-btn-primary" onClick={next}>Continue →</button>
          </div>
        )}

        {/* STEP 3: Parent Details */}
        {step === 3 && (
          <div className="mk-card">
            <div className="mk-card-title">Parent's Details</div>
            <div className="mk-card-sub">We'll send order confirmations and reminders to this number</div>
            <div className="mk-field">
              <label className="mk-label">Parent / Guardian Name</label>
              <input className="mk-input" placeholder="e.g. Rahul Sharma" value={form.parentName}
                onChange={e => set("parentName", e.target.value)} />
              {errors.parentName && <div className="mk-error">⚠ {errors.parentName}</div>}
            </div>
            <div className="mk-field">
              <label className="mk-label">WhatsApp / Mobile Number</label>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"#9A7060",fontSize:"0.88rem",fontWeight:600}}>+91</span>
                <input className="mk-input" style={{paddingLeft:44}} placeholder="10-digit mobile number"
                  value={form.parentPhone} maxLength={10}
                  onChange={e => set("parentPhone", e.target.value.replace(/\D/g,""))} />
              </div>
              {errors.parentPhone && <div className="mk-error">⚠ {errors.parentPhone}</div>}
            </div>
            <div style={{background:"#FFF8F3",border:"1.5px solid #FFD0B3",borderRadius:12,padding:"12px 16px",fontSize:"0.82rem",color:"#7A5B4A",marginBottom:20}}>
              📲 You'll receive WhatsApp / SMS confirmation after payment. Your school will also be notified.
            </div>
            <button className="mk-btn mk-btn-secondary" onClick={back}>← Back</button>
            <button className="mk-btn mk-btn-primary" onClick={next}>Review & Pay →</button>
          </div>
        )}

        {/* STEP 4: Payment */}
        {step === 4 && (
          <div className="mk-card">
            <div className="mk-card-title">Review & Payment</div>
            <div className="mk-card-sub">Confirm your order details before paying</div>

            <div className="mk-pay-box">
              <div className="mk-pay-box-label">Total Amount</div>
              <div className="mk-pay-box-amount">{selectedPlan?.price}</div>
              <div className="mk-pay-box-plan">{selectedPlan?.label} Plan · {selectedPlan?.desc}</div>
            </div>

            <div className="mk-summary">
              {[
                ["School", form.school],
                ["Plan", selectedPlan?.label],
                ["Child", form.childName],
                ["Class & Section", `${form.childClass} – ${form.childSection}`],
                ["Parent", form.parentName],
                ["Phone", "+91 " + form.parentPhone],
              ].map(([k,v]) => (
                <div className="mk-summary-row" key={k}>
                  <span>{k}</span><strong>{v}</strong>
                </div>
              ))}
            </div>

            <button className="mk-razor-btn" onClick={handlePayment} disabled={paying}>
              {paying ? (
                <span>Processing...</span>
              ) : (
                <>
                  <span className="mk-razor-logo">Razorpay</span>
                  Pay {selectedPlan?.price} Securely
                </>
              )}
            </button>
            <button className="mk-btn mk-btn-secondary" onClick={back}>← Back</button>
            <div style={{textAlign:"center",fontSize:"0.76rem",color:"#B0907A",marginTop:8}}>
              🔒 256-bit encrypted · PCI DSS compliant · UPI / Cards / NetBanking accepted
            </div>
          </div>
        )}

        {/* STEP 5: Confirmation */}
        {step === 5 && (
          <div className="mk-card">
            <div className="mk-confirm">
              <div className="mk-confirm-icon">🎉</div>
              <h2>Order Confirmed!</h2>
              <p>Your meal subscription has been activated. A confirmation will be sent to <strong>+91 {form.parentPhone}</strong> shortly.</p>

              <div className="mk-notif-chips">
                <div className="mk-chip">📱 WhatsApp sent to parent</div>
                <div className="mk-chip">🏫 School notified</div>
                <div className="mk-chip">📊 Report generated</div>
                <div className="mk-chip">⏰ 9:45 AM reminders set</div>
              </div>

              <div className="mk-confirm-detail">
                <div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,color:"#FF5722",marginBottom:10,fontSize:"0.88rem"}}>
                  ORDER #{orderId}
                </div>
                {[
                  ["School", form.school],
                  ["Plan", selectedPlan?.label + " – " + selectedPlan?.price],
                  ["Child", form.childName + ` · ${form.childClass} – ${form.childSection}`],
                  ["Parent", form.parentName + " · +91 " + form.parentPhone],
                ].map(([k,v]) => (
                  <div className="mk-confirm-detail-row" key={k}>
                    <span>{k}</span><strong>{v}</strong>
                  </div>
                ))}
              </div>

              <button className="mk-btn mk-btn-primary" onClick={() => {
                setStep(0); setForm({school:"",plan:"",childName:"",childClass:"",childSection:"",parentName:"",parentPhone:""});
                setSchoolSearch("");
              }}>
                Order for Another Child →
              </button>
            </div>
          </div>
        )}

        {/* WORKFLOW INFO */}
        {step === 5 && (
          <div className="mk-workflow">
            <div className="mk-workflow-title">What Happens Next</div>
            <div className="mk-workflow-sub">Here's our automated backend process after your order</div>
            <div className="mk-wf-cards">
              {[
                { icon: "📲", title: "Parent Notification", items: ["WhatsApp confirmation sent instantly", "SMS fallback if WA unavailable", "Includes meal plan & schedule"] },
                { icon: "🏫", title: "School Notification", items: ["School's WhatsApp notified", "Child name, class & plan sent", "Ready for meal collection"] },
                { icon: "📊", title: "Report Generated", items: ["Excel/PDF auto-generated", "All order details captured", "Sent to Mealkart admin"] },
                { icon: "⏰", title: "Daily Reminders", items: ["9:45 AM cron job fires daily", "Delivery team WhatsApp alert", "Child & school details included"] },
                { icon: "💳", title: "Razorpay Billing", items: ["Subscription auto-charges recur", "Webhook verifies each payment", "Stored in secure database"] },
                { icon: "🍱", title: "Meal Delivery", items: ["Fresh meals prepared by 9 AM", "Delivered to school gates", "On-time, every school day"] },
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

        <div className="mk-footer">
          © 2025 Mealkart · Healthy meals for Bengaluru school children<br />
          <span style={{color:"#FF8A65"}}>Made with ❤️ for parents who care</span>
        </div>
      </div>
    </>
  );
}

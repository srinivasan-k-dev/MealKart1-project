import { useState, useEffect } from "react";

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

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body { font-family: 'DM Sans', sans-serif; background: #FFF8F3; }

  .mk-root {
    min-height: 100vh;
    background: linear-gradient(160deg, #fff8f3 0%, #ffe5cc 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0 0 60px;
  }

  /* NAV */
  .mk-nav {
    width: 100%;
    background: #FF5722;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 40px;
    height: 64px;
    box-shadow: 0 4px 24px rgba(255,87,34,0.25);
    position: sticky; top: 0; z-index: 100;
  }
  .mk-logo {
    font-family: 'Sora', sans-serif;
    font-size: 1.6rem;
    font-weight: 800;
    color: #fff;
    letter-spacing: -0.5px;
  }
  .mk-logo span { color: #FFD180; }
  .mk-nav-tag {
    font-size: 0.78rem;
    background: rgba(255,255,255,0.18);
    color: #fff;
    border-radius: 20px;
    padding: 4px 14px;
    font-weight: 500;
    border: 1px solid rgba(255,255,255,0.3);
  }

  /* HERO */
  .mk-hero {
    text-align: center;
    padding: 56px 24px 32px;
    max-width: 640px;
  }
  .mk-hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #FF5722;
    color: #fff;
    border-radius: 30px;
    padding: 6px 18px;
    font-size: 0.8rem;
    font-weight: 600;
    margin-bottom: 20px;
    letter-spacing: 0.5px;
    box-shadow: 0 4px 16px rgba(255,87,34,0.3);
  }
  .mk-hero h1 {
    font-family: 'Sora', sans-serif;
    font-size: 2.6rem;
    font-weight: 800;
    color: #1A0A00;
    line-height: 1.15;
    margin-bottom: 14px;
  }
  .mk-hero h1 span { color: #FF5722; }
  .mk-hero p {
    color: #7A5B4A;
    font-size: 1.05rem;
    line-height: 1.6;
  }

  /* STEPPER */
  .mk-stepper {
    display: flex;
    align-items: center;
    gap: 0;
    margin: 0 auto 36px;
    max-width: 700px;
    width: 100%;
    padding: 0 24px;
  }
  .mk-step-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    position: relative;
  }
  .mk-step-item:not(:last-child)::after {
    content: '';
    position: absolute;
    top: 16px;
    left: calc(50% + 16px);
    right: calc(-50% + 16px);
    height: 2px;
    background: #FFD0B3;
  }
  .mk-step-item.done:not(:last-child)::after { background: #FF5722; }
  .mk-step-dot {
    width: 32px; height: 32px;
    border-radius: 50%;
    border: 2.5px solid #FFD0B3;
    background: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.72rem;
    font-weight: 700;
    color: #C4A090;
    transition: all 0.3s;
  }
  .mk-step-item.done .mk-step-dot {
    background: #FF5722; border-color: #FF5722; color: #fff;
  }
  .mk-step-item.active .mk-step-dot {
    background: #fff; border-color: #FF5722; color: #FF5722;
    box-shadow: 0 0 0 4px rgba(255,87,34,0.15);
  }
  .mk-step-label {
    font-size: 0.68rem;
    color: #C4A090;
    margin-top: 6px;
    font-weight: 600;
    letter-spacing: 0.3px;
  }
  .mk-step-item.active .mk-step-label, .mk-step-item.done .mk-step-label {
    color: #FF5722;
  }

  /* CARD */
  .mk-card {
    background: #fff;
    border-radius: 24px;
    padding: 36px 40px;
    width: 100%;
    max-width: 680px;
    margin: 0 auto;
    box-shadow: 0 8px 48px rgba(255,87,34,0.1), 0 2px 12px rgba(0,0,0,0.06);
    border: 1px solid rgba(255,165,100,0.15);
  }

  .mk-card-title {
    font-family: 'Sora', sans-serif;
    font-size: 1.4rem;
    font-weight: 700;
    color: #1A0A00;
    margin-bottom: 6px;
  }
  .mk-card-sub {
    color: #9A7060;
    font-size: 0.9rem;
    margin-bottom: 28px;
  }

  /* FORM ELEMENTS */
  .mk-label {
    display: block;
    font-size: 0.82rem;
    font-weight: 600;
    color: #5A3020;
    margin-bottom: 8px;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }
  .mk-input, .mk-select {
    width: 100%;
    padding: 13px 16px;
    border: 2px solid #FFD0B3;
    border-radius: 12px;
    font-size: 0.95rem;
    font-family: 'DM Sans', sans-serif;
    color: #1A0A00;
    background: #FFFAF7;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    appearance: none;
  }
  .mk-input:focus, .mk-select:focus {
    border-color: #FF5722;
    box-shadow: 0 0 0 4px rgba(255,87,34,0.12);
    background: #fff;
  }
  .mk-field { margin-bottom: 20px; }
  .mk-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

  /* PLAN CARDS */
  .mk-plans {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .mk-plan-card {
    border: 2.5px solid #FFD0B3;
    border-radius: 16px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    background: #FFFAF7;
  }
  .mk-plan-card:hover { border-color: #FF8A65; transform: translateY(-2px); }
  .mk-plan-card.selected {
    border-color: #FF5722;
    background: #FFF3EE;
    box-shadow: 0 4px 20px rgba(255,87,34,0.18);
  }
  .mk-plan-icon { font-size: 1.8rem; margin-bottom: 8px; }
  .mk-plan-name {
    font-family: 'Sora', sans-serif;
    font-size: 1rem;
    font-weight: 700;
    color: #1A0A00;
    margin-bottom: 2px;
  }
  .mk-plan-price {
    font-size: 1.3rem;
    font-weight: 700;
    color: #FF5722;
    font-family: 'Sora', sans-serif;
  }
  .mk-plan-desc { font-size: 0.78rem; color: #9A7060; margin-top: 4px; }
  .mk-plan-badge {
    position: absolute; top: 10px; right: 10px;
    background: #FF5722; color: #fff;
    border-radius: 20px; padding: 2px 10px;
    font-size: 0.68rem; font-weight: 700;
    letter-spacing: 0.3px;
  }
  .mk-plan-check {
    position: absolute; top: 10px; left: 10px;
    width: 20px; height: 20px;
    background: #FF5722; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.7rem; color: #fff;
  }

  /* BUTTONS */
  .mk-btn {
    width: 100%;
    padding: 15px;
    border: none;
    border-radius: 14px;
    font-size: 1rem;
    font-weight: 700;
    font-family: 'Sora', sans-serif;
    cursor: pointer;
    transition: all 0.2s;
    letter-spacing: 0.3px;
  }
  .mk-btn-primary {
    background: linear-gradient(135deg, #FF5722, #FF8F00);
    color: #fff;
    box-shadow: 0 6px 24px rgba(255,87,34,0.3);
  }
  .mk-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(255,87,34,0.4); }
  .mk-btn-primary:active { transform: translateY(0); }
  .mk-btn-secondary {
    background: #FFF3EE; color: #FF5722; border: 2px solid #FFD0B3;
    margin-bottom: 12px;
  }
  .mk-btn-secondary:hover { background: #FFE8DC; }

  /* PAYMENT */
  .mk-pay-box {
    background: linear-gradient(135deg, #FF5722, #FF8F00);
    border-radius: 20px;
    padding: 28px;
    color: #fff;
    margin-bottom: 24px;
    position: relative;
    overflow: hidden;
  }
  .mk-pay-box::before {
    content: '₹';
    position: absolute; right: 24px; top: 50%;
    transform: translateY(-50%);
    font-size: 6rem; font-weight: 900;
    opacity: 0.1; font-family: 'Sora', sans-serif;
  }
  .mk-pay-box-label { font-size: 0.85rem; opacity: 0.85; margin-bottom: 6px; font-weight: 500; }
  .mk-pay-box-amount { font-family: 'Sora', sans-serif; font-size: 2.2rem; font-weight: 800; }
  .mk-pay-box-plan { font-size: 0.85rem; opacity: 0.85; margin-top: 4px; }

  .mk-summary {
    background: #FFFAF7;
    border: 1.5px solid #FFD0B3;
    border-radius: 14px;
    padding: 18px 20px;
    margin-bottom: 20px;
  }
  .mk-summary-row {
    display: flex; justify-content: space-between;
    font-size: 0.88rem; color: #5A3020;
    padding: 5px 0;
    border-bottom: 1px dashed #FFE0CC;
  }
  .mk-summary-row:last-child { border-bottom: none; }
  .mk-summary-row strong { color: #1A0A00; font-weight: 600; }

  .mk-razor-btn {
    width: 100%;
    padding: 16px;
    background: #072654;
    color: #fff;
    border: none; border-radius: 14px;
    font-size: 1rem; font-weight: 700;
    font-family: 'Sora', sans-serif;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    transition: all 0.2s;
    margin-bottom: 12px;
  }
  .mk-razor-btn:hover { background: #0a3875; transform: translateY(-1px); }
  .mk-razor-logo { font-size: 0.78rem; background: #528FF0; border-radius: 4px; padding: 2px 7px; font-weight: 800; }

  /* CONFIRM */
  .mk-confirm {
    text-align: center;
    padding: 20px 0;
  }
  .mk-confirm-icon {
    width: 88px; height: 88px;
    background: linear-gradient(135deg, #FF5722, #FF8F00);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 2.5rem;
    margin: 0 auto 24px;
    box-shadow: 0 8px 32px rgba(255,87,34,0.35);
    animation: popIn 0.5s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes popIn {
    from { transform: scale(0); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  .mk-confirm h2 {
    font-family: 'Sora', sans-serif;
    font-size: 1.7rem; font-weight: 800; color: #1A0A00;
    margin-bottom: 10px;
  }
  .mk-confirm p { color: #7A5B4A; font-size: 0.95rem; line-height: 1.6; margin-bottom: 28px; }

  .mk-notif-chips {
    display: flex; gap: 10px; justify-content: center;
    flex-wrap: wrap; margin-bottom: 28px;
  }
  .mk-chip {
    display: flex; align-items: center; gap: 6px;
    background: #FFF3EE; border: 1.5px solid #FFD0B3;
    border-radius: 30px; padding: 7px 16px;
    font-size: 0.82rem; font-weight: 600; color: #FF5722;
  }

  .mk-confirm-detail {
    background: #FFF8F3; border: 1.5px solid #FFD0B3; border-radius: 16px;
    padding: 20px; text-align: left; margin-bottom: 24px;
  }
  .mk-confirm-detail-row {
    display: flex; justify-content: space-between;
    font-size: 0.88rem; padding: 5px 0;
    border-bottom: 1px dashed #FFE0CC; color: #5A3020;
  }
  .mk-confirm-detail-row:last-child { border-bottom: none; }
  .mk-confirm-detail-row strong { color: #1A0A00; }

  /* WORKFLOW SECTION */
  .mk-workflow {
    max-width: 680px; width: 100%;
    margin: 40px auto 0;
    padding: 0 24px;
  }
  .mk-workflow-title {
    font-family: 'Sora', sans-serif;
    font-size: 1.5rem; font-weight: 800; color: #1A0A00;
    margin-bottom: 6px;
    text-align: center;
  }
  .mk-workflow-sub {
    color: #9A7060; font-size: 0.88rem; text-align: center; margin-bottom: 28px;
  }
  .mk-wf-cards {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .mk-wf-card {
    background: #fff;
    border-radius: 16px;
    padding: 20px;
    border: 1.5px solid #FFD0B3;
    box-shadow: 0 2px 12px rgba(255,87,34,0.07);
  }
  .mk-wf-card-head {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 10px;
  }
  .mk-wf-icon {
    width: 38px; height: 38px;
    background: linear-gradient(135deg, #FF5722, #FF8F00);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.1rem;
  }
  .mk-wf-card-title {
    font-family: 'Sora', sans-serif;
    font-size: 0.92rem; font-weight: 700; color: #1A0A00;
  }
  .mk-wf-list { list-style: none; }
  .mk-wf-list li {
    font-size: 0.8rem; color: #7A5B4A;
    padding: 3px 0;
    padding-left: 14px;
    position: relative;
  }
  .mk-wf-list li::before {
    content: '→';
    position: absolute; left: 0;
    color: #FF8A65; font-size: 0.75rem;
  }

  /* FOOTER */
  .mk-footer {
    margin-top: 60px;
    text-align: center;
    color: #C4A090;
    font-size: 0.8rem;
    padding-bottom: 20px;
  }

  /* SEARCH */
  .mk-school-search {
    position: relative; margin-bottom: 20px;
  }
  .mk-school-search-icon {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    color: #FF8A65; font-size: 1rem;
  }
  .mk-school-search .mk-input { padding-left: 40px; }
  .mk-school-list {
    max-height: 260px; overflow-y: auto;
    border: 2px solid #FFD0B3; border-radius: 12px;
    background: #fff;
  }
  .mk-school-item {
    padding: 12px 16px;
    cursor: pointer;
    font-size: 0.9rem;
    color: #1A0A00;
    border-bottom: 1px solid #FFF0E6;
    transition: background 0.15s;
  }
  .mk-school-item:last-child { border-bottom: none; }
  .mk-school-item:hover, .mk-school-item.selected { background: #FFF3EE; color: #FF5722; font-weight: 600; }
  .mk-school-selected-badge {
    display: flex; align-items: center; gap: 8px;
    background: #FFF3EE; border: 2px solid #FF5722;
    border-radius: 12px; padding: 12px 16px;
    font-size: 0.9rem; font-weight: 600; color: #FF5722;
    margin-top: 12px;
  }

  .mk-error { color: #D84315; font-size: 0.8rem; margin-top: 6px; font-weight: 500; }

  @media (max-width: 600px) {
    .mk-card { padding: 24px 18px; }
    .mk-plans { grid-template-columns: 1fr 1fr; gap: 10px; }
    .mk-wf-cards { grid-template-columns: 1fr; }
    .mk-row { grid-template-columns: 1fr; }
    .mk-hero h1 { font-size: 1.9rem; }
    .mk-nav { padding: 0 18px; }
    .mk-stepper { padding: 0 10px; }
    .mk-step-label { font-size: 0.6rem; }
  }
`;

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
      <style>{styles}</style>
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

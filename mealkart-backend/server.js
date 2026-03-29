// ============================================================
//  MEALKART BACKEND — server.js  (fully updated)
//  Install: npm install express razorpay crypto cors dotenv xlsx node-cron twilio @supabase/supabase-js
// ============================================================

require("dotenv").config();
const express      = require("express");
const Razorpay     = require("razorpay");
const crypto       = require("crypto");
const cors         = require("cors");
const xlsx         = require("xlsx");
const fs           = require("fs");
const path         = require("path");
const cron         = require("node-cron");
const { sendWhatsApp, sendSMS } = require("./whatsapp");
const { createClient } = require("@supabase/supabase-js");

const app = express();

// ============================================================
// ─── 1. CORS
// ============================================================
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "https://meal-kart1-project.vercel.app,http://localhost:3000,http://localhost:5173")
  .split(",")
  .map(o => o.trim().replace(/\/$/, "")); // remove trailing slashes

console.log("✅ CORS allowed origins:", ALLOWED_ORIGINS);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, curl, mobile apps)
    if (!origin) return callback(null, true);
    // Strip trailing slash from incoming origin before comparing
    const cleanOrigin = origin.replace(/\/$/, "");
    if (ALLOWED_ORIGINS.includes(cleanOrigin)) return callback(null, true);
    console.error(`❌ CORS blocked: ${origin}`);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "x-admin-token"],
  credentials: true,
}));

// Handle preflight OPTIONS requests for all routes
app.options("*", cors());

app.use(express.json());

// ============================================================
// ─── 2. KEYS & CONFIG
// ============================================================
const RAZORPAY_KEY_ID     = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const ADMIN_PHONE         = process.env.ADMIN_PHONE || "9566680245";
const ADMIN_PASSWORD      = process.env.ADMIN_PASSWORD || "mealkart@admin123";
const EXCEL_FILE_PATH     = path.join(__dirname, "mealkart_orders.xlsx");
const IS_DEV              = process.env.NODE_ENV !== "production";

// ============================================================
// ─── 3. SUPABASE
// ============================================================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ============================================================
// ─── 4. RAZORPAY
// ============================================================
const razorpay = new Razorpay({
  key_id:     RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

const PLAN_AMOUNTS = {
  one_meal: 12000, weekly: 54000, fortnightly: 102000, monthly: 198000,
};

// Razorpay subscription plan IDs — create these once in Razorpay Dashboard
// Dashboard → Subscriptions → Plans → Create Plan
// Then paste the plan_XXXX IDs here
const RAZORPAY_PLAN_IDS = {
  weekly:      process.env.RAZORPAY_PLAN_WEEKLY      || "",  // e.g. "plan_XXXXXXXXXX"
  fortnightly: process.env.RAZORPAY_PLAN_FORTNIGHTLY || "",
  monthly:     process.env.RAZORPAY_PLAN_MONTHLY     || "",
  // one_meal has no subscription plan — it's a single order
};

const PLAN_LABELS = {
  one_meal: "One Meal", weekly: "Weekly",
  fortnightly: "Fortnightly", monthly: "Monthly",
};

const SCHOOL_PHONES = {
  // "School Name": "10digitnumber"
  // "Greenwood High International School": "9876543210"
};

// ============================================================
// ─── 5. SCHOOL HOLIDAY CALENDAR
// ─── Add dates as "YYYY-MM-DD" per school
// ─── Cron skips delivery reminder if today is a holiday for ALL schools
// ============================================================
const SCHOOL_HOLIDAYS = {
  // Global holidays (applies to all schools)
  global: [
    "2026-01-26", // Republic Day
    "2026-08-15", // Independence Day
    "2026-10-02", // Gandhi Jayanti
    "2026-11-01", // Kannada Rajyotsava
    "2026-12-25", // Christmas
    "2026-01-14", // Sankranti
    "2026-03-25", // Holi
    "2026-04-14", // Dr Ambedkar Jayanti
    "2026-04-10", // Good Friday
    "2026-05-01", // May Day
    "2026-06-29", // Bakrid
    "2026-10-20", // Diwali
    "2026-10-21", // Diwali (2nd day)
  ],
  // School-specific (add per school if needed)
  "Greenwood High International School": ["2026-02-14"],
};

function isTodayHoliday() {
  const today = new Date().toISOString().split("T")[0]; // "2026-03-28"
  if (SCHOOL_HOLIDAYS.global.includes(today)) return true;
  return false;
}

// ============================================================
// ─── 6. OTP STORE
// ─── Dev:  OTP shown on screen (no SMS sent)
// ─── Prod: OTP sent via SMS — works on ALL numbers, no sandbox needed
// ============================================================
const otpStore = {};

app.post("/api/send-otp", async (req, res) => {
  const { phone } = req.body;
  if (!/^[6-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ success: false, error: "Invalid phone number" });
  }

  const otp     = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
  otpStore[phone] = { otp, expires };

  console.log(`🔐 OTP for ${phone}: ${otp}`); // always visible in Render logs

  if (IS_DEV) {
    // Dev — return OTP in response so it shows on screen
    return res.json({ success: true, otp });
  }

  // Production — send via SMS (works on ALL numbers, no sandbox needed)
  const smsResult = await sendSMS(phone,
    `Your Mealkart OTP is ${otp}. Valid for 10 minutes. Do not share with anyone.`
  );

  if (smsResult.success) {
    return res.json({ success: true });
  }

  // SMS failed — fall back to showing OTP on screen
  console.error("❌ SMS failed, returning OTP as fallback");
  return res.json({
    success: true,
    otp,
    warning: "SMS could not be sent. OTP shown on screen.",
  });
});

app.post("/api/verify-otp", (req, res) => {
  const { phone, otp } = req.body;
  const record = otpStore[phone];

  if (!record)                       return res.json({ success: false, error: "No OTP found. Click Resend OTP." });
  if (Date.now() > record.expires)   return res.json({ success: false, error: "OTP expired. Click Resend OTP." });
  if (record.otp !== otp)            return res.json({ success: false, error: "Incorrect OTP. Try again." });

  delete otpStore[phone];
  res.json({ success: true });
});

// ============================================================
// ─── 7. SUPABASE SAVE
// ============================================================
async function saveToDatabase(record) {
  const { error } = await supabase
    .from("orders")
    .insert([{
      order_id:            record.orderId,
      school:              record.school,
      plan:                record.plan,
      child_name:          record.childName,
      child_class:         record.childClass,
      child_section:       record.childSection,
      parent_name:         record.parentName,
      parent_phone:        record.parentPhone,
      dietary_notes:       record.dietaryNotes || "",
      razorpay_order_id:   record.razorpayOrderId,
      razorpay_payment_id: record.razorpayPaymentId,
      subscription_id:     record.subscriptionId || null,
      amount:              (PLAN_AMOUNTS[record.plan] || 0) / 100,
      status:              record.status,
      created_at:          record.createdAt,
    }]);

  if (error) { console.error("❌ Supabase:", error.message); return false; }
  console.log("✅ Saved to Supabase:", record.orderId);
  return true;
}

// ============================================================
// ─── 8. EXCEL SAVE
// ============================================================
function saveToExcel(record) {
  const HEADERS = [
    "Order ID","Date & Time (IST)","School","Plan",
    "Child Name","Class","Section","Dietary Notes",
    "Parent Name","Parent Phone",
    "Razorpay Payment ID","Subscription ID","Amount (₹)","Status",
  ];
  const newRow = [
    record.orderId,
    new Date(record.createdAt).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"}),
    record.school, PLAN_LABELS[record.plan]||record.plan,
    record.childName, record.childClass, record.childSection,
    record.dietaryNotes||"None",
    record.parentName, "+91"+record.parentPhone,
    record.razorpayPaymentId, record.subscriptionId||"",
    (PLAN_AMOUNTS[record.plan]||0)/100, record.status,
  ];

  let workbook, worksheet;
  if (fs.existsSync(EXCEL_FILE_PATH)) {
    workbook  = xlsx.readFile(EXCEL_FILE_PATH);
    worksheet = workbook.Sheets["Orders"];
    const range   = xlsx.utils.decode_range(worksheet["!ref"]);
    const nextRow = range.e.r + 1;
    newRow.forEach((value, col) => {
      const cell = xlsx.utils.encode_cell({ r: nextRow, c: col });
      worksheet[cell] = { v: value, t: typeof value === "number" ? "n" : "s" };
    });
    worksheet["!ref"] = xlsx.utils.encode_range({
      s: { r:0, c:0 }, e: { r: nextRow, c: HEADERS.length-1 },
    });
  } else {
    workbook  = xlsx.utils.book_new();
    worksheet = xlsx.utils.aoa_to_sheet([HEADERS, newRow]);
    worksheet["!cols"] = HEADERS.map(() => ({ wch: 20 }));
    xlsx.utils.book_append_sheet(workbook, worksheet, "Orders");
  }
  xlsx.writeFile(workbook, EXCEL_FILE_PATH);
  console.log("📊 Excel updated");
}

// ============================================================
// ─── 9. WHATSAPP NOTIFICATIONS
// ============================================================
async function notifyParent(record) {
  const msg =
    `🍱 *Mealkart – Order Confirmed!*\n\n` +
    `Hi ${record.parentName},\n\n` +
    `Meal subscription for *${record.childName}* is confirmed ✅\n\n` +
    `📋 *Details:*\n` +
    `• School  : ${record.school}\n` +
    `• Plan    : ${PLAN_LABELS[record.plan]}\n` +
    `• Class   : ${record.childClass} – ${record.childSection}\n` +
    (record.dietaryNotes ? `• Diet    : ${record.dietaryNotes}\n` : "") +
    `• Order   : ${record.orderId}\n\n` +
    `Fresh meals every school day 🙏\nFor support reply to this message.`;
  await sendWhatsApp(record.parentPhone, msg);
}

async function notifySchool(record) {
  const phone = SCHOOL_PHONES[record.school];
  if (!phone) { console.warn("⚠ No phone for school:", record.school); return; }
  const msg =
    `📢 *New Mealkart Subscription*\n\n` +
    `Student : *${record.childName}* · ${record.childClass}-${record.childSection}\n` +
    `Plan    : ${PLAN_LABELS[record.plan]}\n` +
    (record.dietaryNotes ? `Diet    : ${record.dietaryNotes}\n` : "") +
    `Parent  : ${record.parentName} (+91${record.parentPhone})\n` +
    `Order   : ${record.orderId}`;
  await sendWhatsApp(phone, msg);
}

// ============================================================
// ─── 10. RAZORPAY SUBSCRIPTION (weekly/fortnightly/monthly)
// ─── HOW TO GET PLAN IDs:
//   1. Go to dashboard.razorpay.com → Subscriptions → Plans
//   2. Click "Create Plan"
//   3. Weekly:      period=weekly,   interval=1, amount=54000
//   4. Fortnightly: period=weekly,   interval=2, amount=102000
//   5. Monthly:     period=monthly,  interval=1, amount=198000
//   6. Copy each plan_XXXX ID into your .env file
// ============================================================
app.post("/api/create-subscription", async (req, res) => {
  const { plan, parentName, parentPhone, school,
          childName, childClass, childSection, dietaryNotes, orderId } = req.body;

  if (plan === "one_meal") {
    return res.status(400).json({ error: "One Meal uses single order, not subscription" });
  }

  const planId = RAZORPAY_PLAN_IDS[plan];
  if (!planId) {
    return res.status(400).json({
      error: `No Razorpay plan ID configured for "${plan}". Add to .env: RAZORPAY_PLAN_${plan.toUpperCase()}=plan_XXXX`
    });
  }

  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id:        planId,
      total_count:    12,   // max renewal cycles (12 weeks / 12 months etc.)
      quantity:       1,
      customer_notify: 1,
      notes: { school, childName, childClass, childSection, parentName, parentPhone, orderId },
    });
    console.log("✅ Subscription created:", subscription.id);
    res.json({ subscription_id: subscription.id, status: subscription.status });
  } catch (err) {
    console.error("❌ Subscription creation failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ─── 11. CREATE ONE-TIME ORDER (for "one_meal" plan)
// ============================================================
app.post("/api/create-order", async (req, res) => {
  const { plan, childName, childClass, childSection,
          parentName, parentPhone, school, orderId } = req.body;

  if (!PLAN_AMOUNTS[plan]) return res.status(400).json({ error: "Invalid plan" });
  if (!/^[6-9]\d{9}$/.test(parentPhone)) return res.status(400).json({ error: "Invalid phone" });

  try {
    const order = await razorpay.orders.create({
      amount: PLAN_AMOUNTS[plan], currency: "INR", receipt: orderId,
      notes:  { school, plan, childName, childClass, childSection, parentName, parentPhone },
    });
    console.log("✅ Order created:", order.id);
    res.json({ id: order.id, amount: order.amount, currency: order.currency });
  } catch (err) {
    console.error("❌ Order creation failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ─── 12. VERIFY PAYMENT → SAVE → NOTIFY
// ============================================================
app.post("/api/verify-payment", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature,
          razorpay_subscription_id, formData, orderId } = req.body;

  // Verify signature
  const sigBody  = (razorpay_subscription_id
    ? razorpay_payment_id + "|" + razorpay_subscription_id
    : razorpay_order_id   + "|" + razorpay_payment_id);
  const expected = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(sigBody).digest("hex");

  if (expected !== razorpay_signature) {
    return res.status(400).json({ success: false, error: "Invalid signature" });
  }

  // Duplicate check
  const { data: existing } = await supabase.from("orders")
    .select("order_id").eq("razorpay_payment_id", razorpay_payment_id).single();
  if (existing) return res.json({ success: true, orderId: existing.order_id });

  const record = {
    orderId,
    school:            formData.school,
    plan:              formData.plan,
    childName:         formData.childName,
    childClass:        formData.childClass,
    childSection:      formData.childSection,
    parentName:        formData.parentName,
    parentPhone:       formData.parentPhone,
    dietaryNotes:      formData.dietaryNotes || "",
    razorpayOrderId:   razorpay_order_id || "",
    razorpayPaymentId: razorpay_payment_id,
    subscriptionId:    razorpay_subscription_id || null,
    status:            "confirmed",
    createdAt:         new Date().toISOString(),
  };

  await saveToDatabase(record);
  saveToExcel(record);
  await notifyParent(record);
  await notifySchool(record);

  res.json({ success: true, orderId });
});

// ============================================================
// ─── 13. WEBHOOK
// ============================================================
app.post("/api/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const sig      = req.headers["x-razorpay-signature"];
  const body     = req.body.toString();
  const expected = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET).update(body).digest("hex");
  if (expected !== sig) return res.status(400).send("Bad signature");

  const event = JSON.parse(body);
  console.log("📡 Webhook:", event.event);

  if (event.event === "subscription.charged") {
    const sub = event.payload.subscription.entity;
    console.log("🔄 Subscription auto-renewed:", sub.id);
    // Optionally send a renewal WhatsApp to parent here
  }
  if (event.event === "subscription.cancelled") {
    const sub = event.payload.subscription.entity;
    console.log("❌ Subscription cancelled:", sub.id);
    // Update status in Supabase to "cancelled"
  }

  res.json({ status: "ok" });
});

// ============================================================
// ─── 14. CRON — 9:45 AM IST MON–FRI (skips holidays)
// ============================================================
cron.schedule("15 4 * * 1-5", async () => {
  if (isTodayHoliday()) {
    console.log("🎉 Today is a school holiday — skipping delivery reminder.");
    return;
  }

  const { data: active, error } = await supabase
    .from("orders").select("*").eq("status", "confirmed");

  if (error || !active?.length) { console.log("No active orders."); return; }

  const list = active.map((o,i) =>
    `${i+1}. ${o.child_name} | ${o.child_class}-${o.child_section} | ${o.school}` +
    (o.dietary_notes ? ` | ⚠ ${o.dietary_notes}` : "")
  ).join("\n");

  await sendWhatsApp(ADMIN_PHONE,
    `🚚 *Mealkart Delivery Reminder*\n` +
    `📅 ${new Date().toLocaleDateString("en-IN",{timeZone:"Asia/Kolkata"})}\n\n` +
    `*${active.length}* deliveries today:\n\n${list}\n\n` +
    `Dispatch by 11:00 AM ✅`
  );
  console.log(`✅ Reminder sent for ${active.length} orders`);

}, { timezone: "Asia/Kolkata" });

// ============================================================
// ─── 15. ADMIN ROUTES (password protected)
// ============================================================

// Simple token auth middleware
function adminAuth(req, res, next) {
  const token = req.headers["x-admin-token"] || req.query.token;
  if (token !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized. Wrong admin password." });
  }
  next();
}

// Login — POST /api/admin/login { password: "..." }
app.post("/api/admin/login", (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    res.json({ success: true, token: ADMIN_PASSWORD });
  } else {
    res.status(401).json({ success: false, error: "Wrong password" });
  }
});

// All orders
app.get("/api/admin/orders", adminAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("orders").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ total: data.length, orders: data });
});

// Today's orders — uses IST timezone (UTC+5:30)
app.get("/api/admin/orders/today", adminAuth, async (req, res) => {
  // Get today's date in IST properly
  const now     = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST = UTC + 5:30
  const istNow  = new Date(now.getTime() + istOffset);
  const today   = istNow.toISOString().split("T")[0]; // "YYYY-MM-DD" in IST

  // Query with a wide enough window to catch IST day boundaries
  const startUTC = new Date(today + "T00:00:00+05:30").toISOString();
  const endUTC   = new Date(today + "T23:59:59+05:30").toISOString();

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .gte("created_at", startUTC)
    .lte("created_at", endUTC)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ total: data.length, orders: data });
});

// Revenue summary
app.get("/api/admin/summary", adminAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("orders").select("amount, plan, status, created_at");
  if (error) return res.status(500).json({ error: error.message });

  // Use IST for today's date
  const istNow  = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const today   = istNow.toISOString().split("T")[0];
  const startUTC = new Date(today + "T00:00:00+05:30").toISOString();
  const endUTC   = new Date(today + "T23:59:59+05:30").toISOString();

  const confirmed  = data.filter(o => o.status === "confirmed");
  const totalRev   = confirmed.reduce((s, o) => s + parseFloat(o.amount || 0), 0);
  const byPlan     = confirmed.reduce((acc, o) => {
    acc[o.plan] = (acc[o.plan] || 0) + 1; return acc;
  }, {});
  const todayOrders = confirmed.filter(o =>
    o.created_at >= startUTC && o.created_at <= endUTC
  );
  const todayRev = todayOrders.reduce((s, o) => s + parseFloat(o.amount || 0), 0);

  res.json({
    total_orders:  confirmed.length,
    total_revenue: totalRev.toFixed(2),
    today_orders:  todayOrders.length,
    today_revenue: todayRev.toFixed(2),
    by_plan:       byPlan,
  });
});

// Download Excel
app.get("/api/admin/download", adminAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("orders").select("*").order("created_at",{ascending:true});
  if (error) return res.status(500).json({ error: error.message });
  if (!data?.length) return res.status(404).json({ error: "No orders yet." });

  const HEADERS = [
    "Order ID","Date (IST)","School","Plan","Child Name","Class","Section",
    "Dietary Notes","Parent Name","Parent Phone","Payment ID","Subscription ID","Amount (₹)","Status"
  ];
  const rows = data.map(o => [
    o.order_id,
    new Date(o.created_at).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"}),
    o.school, PLAN_LABELS[o.plan]||o.plan, o.child_name, o.child_class,
    o.child_section, o.dietary_notes||"", o.parent_name,
    "+91"+o.parent_phone, o.razorpay_payment_id,
    o.subscription_id||"", o.amount, o.status,
  ]);

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.aoa_to_sheet([HEADERS,...rows]);
  ws["!cols"] = HEADERS.map(()=>({wch:20}));
  xlsx.utils.book_append_sheet(wb, ws, "Orders");
  const tmp = path.join(__dirname, "_tmp_report.xlsx");
  xlsx.writeFile(wb, tmp);
  res.download(tmp, "mealkart_orders.xlsx", () => fs.unlinkSync(tmp));
});

// Public track-by-phone (no auth needed)
// Uses query param ?phone=9876543210 to avoid Express 5 path-to-regexp PathError
app.get("/api/orders/track", async (req, res) => {
  const phone = req.query.phone;
  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ error: "Invalid phone number" });
  }
  const { data, error } = await supabase
    .from("orders")
    .select("order_id,school,plan,child_name,child_class,child_section,parent_name,amount,status,created_at,dietary_notes")
    .eq("parent_phone", phone).eq("status","confirmed")
    .order("created_at",{ascending:false});
  if (error) return res.status(500).json({ error: error.message });
  res.json({ orders: data || [] });
});

// ============================================================
// ─── START
// ============================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🍱  Mealkart backend → http://localhost:${PORT}`);
  console.log(`   CORS allowed: ${ALLOWED_ORIGINS.join(", ")}`);
  console.log(`   DEV mode: ${IS_DEV}`);
  console.log(`   POST /api/send-otp`);
  console.log(`   POST /api/verify-otp`);
  console.log(`   POST /api/create-order        (one_meal)`);
  console.log(`   POST /api/create-subscription (weekly/fortnightly/monthly)`);
  console.log(`   POST /api/verify-payment`);
  console.log(`   POST /api/admin/login`);
  console.log(`   GET  /api/admin/orders`);
  console.log(`   GET  /api/admin/orders/today`);
  console.log(`   GET  /api/admin/summary`);
  console.log(`   GET  /api/admin/download\n`);
});


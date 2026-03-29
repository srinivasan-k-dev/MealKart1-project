// ============================================================
//  MEALKART BACKEND — CLEAN VERSION
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

const sendWhatsApp = require("./whatsapp");
const sendSMS      = require("./sms"); // ✅ NEW (Fast2SMS)

const { createClient } = require("@supabase/supabase-js");

const app = express();

// ============================================================
// ─── 1. CORS
// ============================================================
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  "https://meal-kart1-project.vercel.app,http://localhost:3000,http://localhost:5173"
).split(",").map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ["GET", "POST"],
  credentials: true,
}));

app.use(express.json());

// ============================================================
// ─── 2. CONFIG
// ============================================================
const RAZORPAY_KEY_ID     = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const PORT                = process.env.PORT || 5000;

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
  one_meal: 12000,
  weekly: 54000,
  fortnightly: 102000,
  monthly: 198000,
};

const PLAN_LABELS = {
  one_meal: "One Meal",
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
};

// ============================================================
// ─── 5. OTP STORE (TEMP)
// ============================================================
const otpStore = {};

// ============================================================
// ─── 6. SEND OTP (SMS)
// ============================================================
app.post("/api/send-otp", async (req, res) => {
  const { phone } = req.body;

  if (!/^[6-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ success: false, error: "Invalid phone number" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  otpStore[phone] = {
    otp,
    expires: Date.now() + 10 * 60 * 1000,
  };

  console.log(`🔐 OTP for ${phone}: ${otp}`);

  try {
    await sendSMS(phone, `Your Mealkart OTP is ${otp}`);
    return res.json({ success: true });
  } catch (err) {
    console.error("❌ SMS failed:", err.message);

    // fallback (DEV)
    return res.json({ success: true, otp });
  }
});

// ============================================================
// ─── 7. VERIFY OTP
// ============================================================
app.post("/api/verify-otp", (req, res) => {
  const { phone, otp } = req.body;
  const record = otpStore[phone];

  if (!record) return res.json({ success: false, error: "No OTP found" });
  if (Date.now() > record.expires) return res.json({ success: false, error: "OTP expired" });
  if (record.otp !== otp) return res.json({ success: false, error: "Incorrect OTP" });

  delete otpStore[phone];
  res.json({ success: true });
});

// ============================================================
// ─── 8. NOTIFY PARENT (WhatsApp + SMS fallback)
// ============================================================
async function notifyParent(record) {
  const msg =
    `🍱 Mealkart Order Confirmed\n` +
    `Child: ${record.childName}\n` +
    `Plan: ${PLAN_LABELS[record.plan]}\n` +
    `Order: ${record.orderId}`;

  try {
    await sendWhatsApp(record.parentPhone, msg);
  } catch {
    console.log("WhatsApp failed → fallback SMS");
    await sendSMS(record.parentPhone, msg);
  }
}

// ============================================================
// ─── 9. CREATE ORDER
// ============================================================
app.post("/api/create-order", async (req, res) => {
  const { plan, parentPhone, orderId } = req.body;

  try {
    const order = await razorpay.orders.create({
      amount: PLAN_AMOUNTS[plan],
      currency: "INR",
      receipt: orderId,
    });

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ─── 10. VERIFY PAYMENT
// ============================================================
app.post("/api/verify-payment", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, formData, orderId } = req.body;

  const expected = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");

  if (expected !== razorpay_signature) {
    return res.status(400).json({ success: false });
  }

  const record = {
    orderId,
    ...formData,
    razorpayPaymentId: razorpay_payment_id,
    status: "confirmed",
  };

  await notifyParent(record);

  res.json({ success: true });
});

// ============================================================
// ─── START SERVER
// ============================================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});

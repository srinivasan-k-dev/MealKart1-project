// ============================================================
//  MEALKART BACKEND — server.js
//  Run: node server.js
//  Install: npm install express razorpay crypto cors dotenv xlsx node-cron axios
// ============================================================

require("dotenv").config();
const express  = require("express");
const Razorpay = require("razorpay");
const crypto   = require("crypto");
const cors     = require("cors");
const xlsx     = require("xlsx");
const fs       = require("fs");
const path     = require("path");
const cron     = require("node-cron");
const axios    = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================
// ─── 1. YOUR KEYS — fill these in .env file ─────────────────
// ============================================================
// HOW TO GET RAZORPAY KEYS:
//   1. Go to https://dashboard.razorpay.com
//   2. Login → Settings → API Keys → Generate Test Key
//   3. Copy Key ID  → paste as RAZORPAY_KEY_ID below
//   4. Copy Key Secret → paste as RAZORPAY_KEY_SECRET below
//
// HOW TO GET WHATSAPP API KEY (Interakt — easiest for India):
//   1. Go to https://app.interakt.ai → Sign up free
//   2. Connect your WhatsApp number (needs Facebook Business Manager)
//   3. Dashboard → Developer → API Token → copy it
//   4. Paste as WHATSAPP_API_KEY below
// ============================================================

const RAZORPAY_KEY_ID     = process.env.RAZORPAY_KEY_ID     || "rzp_test_XXXXXXXXXXXXXXXX";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "XXXXXXXXXXXXXXXXXXXXXXXX";
const WHATSAPP_API_KEY    = process.env.WHATSAPP_API_KEY    || "your_interakt_api_key_here";
const ADMIN_PHONE         = process.env.ADMIN_PHONE         || "919XXXXXXXXX"; // Your number with country code, no +

// Excel file will be saved here on your server/computer
const EXCEL_FILE_PATH = path.join(__dirname, "mealkart_orders.xlsx");

// School → WhatsApp number map. Add your schools here.
const SCHOOL_PHONES = {
  "The International School Bangalore (TISB)": "918XXXXXXXXX",
  "Inventure Academy":                          "917XXXXXXXXX",
  "Greenwood High International School":        "919XXXXXXXXX",
  // Add more: "School Name": "91<10-digit-number>"
};

// ============================================================
// ─── 2. RAZORPAY SETUP ───────────────────────────────────────
// ============================================================

const razorpay = new Razorpay({
  key_id:     RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

// Amount map in paise (₹1 = 100 paise)
const PLAN_AMOUNTS = {
  one_meal:    12000,   // ₹120
  weekly:      54000,   // ₹540
  fortnightly: 102000,  // ₹1,020
  monthly:     198000,  // ₹1,980
};

const PLAN_LABELS = {
  one_meal: "One Meal", weekly: "Weekly",
  fortnightly: "Fortnightly", monthly: "Monthly"
};

// ============================================================
// ─── 3. ORDER STORE (in-memory — swap with DB for production)
// ============================================================
// For production, replace with PostgreSQL:
//   const { Pool } = require("pg");
//   const db = new Pool({ connectionString: process.env.DATABASE_URL });
//   Then use db.query("INSERT INTO orders VALUES (...)")

let orders = [];

// ============================================================
// ─── 4. EXCEL REPORT ─────────────────────────────────────────
// WHERE IS THE FILE? It saves to: mealkart_orders.xlsx
// in the same folder as server.js on your computer/server.
// You can download it anytime at GET /api/download-report
//
// COLUMNS:
//   Order ID | Date | School | Plan | Child Name |
//   Class | Section | Parent Name | Parent Phone |
//   Razorpay Payment ID | Amount | Status
// ============================================================

function saveToExcel(order) {
  const HEADERS = [
    "Order ID", "Date & Time", "School", "Plan",
    "Child Name", "Class", "Section",
    "Parent Name", "Parent Phone",
    "Razorpay Payment ID", "Amount (₹)", "Status"
  ];

  // Build the new row to append
  const newRow = [
    order.orderId,
    new Date(order.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    order.school,
    PLAN_LABELS[order.plan] || order.plan,
    order.childName,
    order.childClass,
    order.childSection,
    order.parentName,
    "+91" + order.parentPhone,
    order.razorpayPaymentId,
    PLAN_AMOUNTS[order.plan] / 100,  // convert paise → rupees
    order.status,
  ];

  let workbook, worksheet;

  if (fs.existsSync(EXCEL_FILE_PATH)) {
    // ── File exists: READ it, then APPEND new row ──
    workbook  = xlsx.readFile(EXCEL_FILE_PATH);
    worksheet = workbook.Sheets["Orders"];

    // Find next empty row by checking current range
    const range = xlsx.utils.decode_range(worksheet["!ref"]);
    const nextRow = range.e.r + 1; // e.r = last row index, +1 = new row

    newRow.forEach((value, colIndex) => {
      const cellAddress = xlsx.utils.encode_cell({ r: nextRow, c: colIndex });
      const cellType    = typeof value === "number" ? "n" : "s";
      worksheet[cellAddress] = { v: value, t: cellType };
    });

    // Update the sheet's !ref range to include new row
    worksheet["!ref"] = xlsx.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: nextRow, c: HEADERS.length - 1 }
    });

  } else {
    // ── File does not exist: CREATE it with headers + first row ──
    workbook  = xlsx.utils.book_new();
    worksheet = xlsx.utils.aoa_to_sheet([HEADERS, newRow]);

    // Set column widths for readability
    worksheet["!cols"] = [
      { wch: 14 }, // Order ID
      { wch: 22 }, // Date
      { wch: 40 }, // School
      { wch: 14 }, // Plan
      { wch: 20 }, // Child Name
      { wch: 10 }, // Class
      { wch: 9  }, // Section
      { wch: 20 }, // Parent Name
      { wch: 16 }, // Phone
      { wch: 24 }, // Payment ID
      { wch: 12 }, // Amount
      { wch: 12 }, // Status
    ];

    xlsx.utils.book_append_sheet(workbook, worksheet, "Orders");
  }

  xlsx.writeFile(workbook, EXCEL_FILE_PATH);
  console.log(`📊 Excel updated → ${EXCEL_FILE_PATH} (${orders.length} total orders)`);
}

// ============================================================
// ─── 5. WHATSAPP NOTIFICATIONS via Interakt ──────────────────
// Interakt API docs: https://developers.interakt.ai/
// You must create a message TEMPLATE in Interakt dashboard first.
// Template example name: "order_confirmation"
// Body: "Hi {{1}}, your meal for {{2}} ({{3}}-{{4}}) at {{5}} is confirmed! Plan: {{6}}. Order: {{7}}"
// ============================================================

async function sendWhatsApp(phoneNumber, templateName, bodyValues) {
  // phoneNumber format: "919876543210" (country code + number, no +)
  try {
    const response = await axios.post(
      "https://api.interakt.ai/v1/public/message/",
      {
        countryCode: "+91",
        phoneNumber: phoneNumber.replace("91", ""), // Interakt needs just 10 digits
        callbackData: "mealkart_notification",
        type: "Template",
        template: {
          name: templateName,
          languageCode: "en",
          bodyValues: bodyValues,
        },
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(WHATSAPP_API_KEY + ":").toString("base64")}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`📲 WhatsApp sent to ${phoneNumber}:`, response.data);
  } catch (err) {
    console.error(`❌ WhatsApp failed to ${phoneNumber}:`, err.response?.data || err.message);
  }
}

// ── Send confirmation to parent ──
async function notifyParent(order) {
  await sendWhatsApp(
    "91" + order.parentPhone,
    "order_confirmation",   // Template name you created in Interakt
    [
      order.parentName,                   // {{1}} Hi [name]
      order.childName,                    // {{2}} meal for [child]
      order.childClass,                   // {{3}} class
      order.childSection,                 // {{4}} section
      order.school,                       // {{5}} school
      PLAN_LABELS[order.plan] || order.plan, // {{6}} plan
      order.orderId,                      // {{7}} order ID
    ]
  );
}

// ── Notify school ──
async function notifySchool(order) {
  const schoolPhone = SCHOOL_PHONES[order.school];
  if (!schoolPhone) {
    console.warn("⚠ No WhatsApp number mapped for:", order.school);
    return;
  }
  await sendWhatsApp(
    schoolPhone,
    "school_notification",  // Template name you created in Interakt
    [
      order.school,
      order.childName,
      order.childClass + "-" + order.childSection,
      PLAN_LABELS[order.plan] || order.plan,
      order.parentName,
      order.parentPhone,
    ]
  );
}

// ============================================================
// ─── 6. API: CREATE RAZORPAY ORDER ───────────────────────────
// ============================================================

app.post("/api/create-order", async (req, res) => {
  const { amount, plan, childName, childClass, childSection,
          parentName, parentPhone, school, orderId } = req.body;
  try {
    const order = await razorpay.orders.create({
      amount:   PLAN_AMOUNTS[plan] || amount,
      currency: "INR",
      receipt:  orderId,
      notes:    { school, plan, childName, childClass, childSection, parentName, parentPhone },
    });
    console.log("✅ Razorpay order created:", order.id);
    res.json({ id: order.id, amount: order.amount, currency: order.currency });
  } catch (err) {
    console.error("❌ Order creation failed:", err.message);
    res.status(500).json({ error: "Order creation failed", details: err.message });
  }
});

// ============================================================
// ─── 7. API: VERIFY PAYMENT + SAVE + NOTIFY ──────────────────
// ============================================================

app.post("/api/verify-payment", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id,
          razorpay_signature, formData, orderId } = req.body;

  // STEP 1: Verify Razorpay signature (security check — never skip)
  const body     = razorpay_order_id + "|" + razorpay_payment_id;
  const expected = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(body).digest("hex");

  if (expected !== razorpay_signature) {
    console.error("❌ Payment signature mismatch!");
    return res.status(400).json({ success: false, error: "Invalid signature" });
  }

  console.log("✅ Payment verified:", razorpay_payment_id);

  // STEP 2: Build order record
  const record = {
    orderId,
    school:            formData.school,
    plan:              formData.plan,
    childName:         formData.childName,
    childClass:        formData.childClass,
    childSection:      formData.childSection,
    parentName:        formData.parentName,
    parentPhone:       formData.parentPhone,
    razorpayOrderId:   razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    status:            "confirmed",
    createdAt:         new Date().toISOString(),
  };

  // STEP 3: Save to in-memory store
  orders.push(record);

  // STEP 4: Save to Excel file (appends a new row)
  saveToExcel(record);

  // STEP 5: Send WhatsApp notifications (non-blocking)
  notifyParent(record);
  notifySchool(record);

  // STEP 6: Respond to frontend → shows confirmation screen
  res.json({ success: true, orderId });
});

// ============================================================
// ─── 8. RAZORPAY WEBHOOK (extra safety net) ──────────────────
// Add this URL in: Razorpay Dashboard → Webhooks → + Add New
// URL: https://yourdomain.com/api/webhook
// Events to select: payment.captured, subscription.charged
// ============================================================

app.post("/api/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const sig      = req.headers["x-razorpay-signature"];
  const body     = req.body.toString();
  const expected = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET).update(body).digest("hex");

  if (expected !== sig) return res.status(400).send("Bad signature");

  const event = JSON.parse(body);
  console.log("📡 Webhook event:", event.event);

  if (event.event === "payment.captured") {
    console.log("💰 Captured:", event.payload.payment.entity.id);
  }
  if (event.event === "subscription.charged") {
    console.log("🔄 Subscription recharged:", event.payload.subscription.entity.id);
  }

  res.json({ status: "ok" });
});

// ============================================================
// ─── 9. CRON JOB — 9:45 AM IST DAILY REMINDER ───────────────
// Fires Monday–Friday at 9:45 AM India time
// ============================================================

cron.schedule("15 4 * * 1-5", async () => {
  console.log("⏰ 9:45 AM IST — Sending delivery reminder...");

  const active = orders.filter(o => o.status === "confirmed");
  if (!active.length) { console.log("No orders today."); return; }

  const listText = active
    .map((o, i) => `${i + 1}. ${o.childName} · ${o.childClass}-${o.childSection} · ${o.school}`)
    .join("\n");

  // Send to admin via WhatsApp
  await sendWhatsApp(
    ADMIN_PHONE,
    "delivery_reminder",   // Template name you created in Interakt
    [
      String(active.length),
      new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }),
      listText,
    ]
  );

  console.log(`✅ Reminder sent for ${active.length} orders`);

}, { timezone: "Asia/Kolkata" });

// ============================================================
// ─── 10. ADMIN ENDPOINTS ─────────────────────────────────────
// ============================================================

// View all orders in browser/Postman
app.get("/api/orders", (req, res) => {
  res.json({ total: orders.length, orders });
});

// Download Excel file directly
// Open in browser: http://localhost:5000/api/download-report
app.get("/api/download-report", (req, res) => {
  if (!fs.existsSync(EXCEL_FILE_PATH)) {
    return res.status(404).json({ error: "No orders yet. Place an order first." });
  }
  res.download(EXCEL_FILE_PATH, "mealkart_orders.xlsx");
});

// ============================================================
// ─── START SERVER ────────────────────────────────────────────
// ============================================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🍱  Mealkart backend running at http://localhost:${PORT}`);
  console.log(`\n   Endpoints:`);
  console.log(`   POST  /api/create-order      ← frontend calls this`);
  console.log(`   POST  /api/verify-payment    ← frontend calls after payment`);
  console.log(`   POST  /api/webhook           ← Razorpay calls this`);
  console.log(`   GET   /api/orders            ← view all orders`);
  console.log(`   GET   /api/download-report   ← download Excel file`);
  console.log(`\n   Excel file saves to: ${EXCEL_FILE_PATH}\n`);
});

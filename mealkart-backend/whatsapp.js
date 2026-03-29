// ============================================================
//  whatsapp.js — Twilio WhatsApp + Fast2SMS OTP sender
// ============================================================

const twilio = require("twilio");
const https  = require("https");

const client = new twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH
);

// ── Send WhatsApp message via Twilio Sandbox ──────────────────
// Used for: order confirmation, school notification, delivery reminder
// NOTE: Sandbox requires each number to join first — fine for your own number
const sendWhatsApp = async (to, message) => {
  try {
    const result = await client.messages.create({
      from: "whatsapp:+14155238886",
      to:   `whatsapp:+91${to}`,
      body: message,
    });
    console.log(`📲 WhatsApp sent to +91${to} | SID: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (err) {
    console.error(`❌ WhatsApp failed to +91${to}:`, err.message);
    return { success: false, error: err.message };
  }
};

// ── Send SMS via Fast2SMS ─────────────────────────────────────
// Used for: OTP only — works on ALL Indian numbers, no signup by recipient needed
// Get API key: fast2sms.com → Sign up free → Dashboard → Dev API → API Key
// Add to .env: FAST2SMS_API_KEY=your_key_here
// Cost: ~₹0.25 per SMS on paid plan, free credits given on signup for testing
const sendSMS = async (to, message) => {
  return new Promise((resolve) => {
    const apiKey = process.env.FAST2SMS_API_KEY;

    if (!apiKey) {
      console.error("❌ FAST2SMS_API_KEY not set in .env");
      return resolve({ success: false, error: "Fast2SMS API key not configured" });
    }

    const postData = JSON.stringify({
      route:   "q",          // quick transactional route
      message: message,
      language:"english",
      flash:   0,
      numbers: to,           // 10-digit number, no +91
    });

    const options = {
      hostname: "www.fast2sms.com",
      path:     "/dev/bulkV2",
      method:   "POST",
      headers:  {
        "authorization": apiKey,
        "Content-Type":  "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.return === true) {
            console.log(`📱 SMS sent to +91${to} via Fast2SMS`);
            resolve({ success: true });
          } else {
            console.error(`❌ Fast2SMS error:`, parsed.message);
            resolve({ success: false, error: parsed.message?.join(", ") || "SMS failed" });
          }
        } catch {
          console.error("❌ Fast2SMS parse error:", data);
          resolve({ success: false, error: "Invalid response from Fast2SMS" });
        }
      });
    });

    req.on("error", (err) => {
      console.error("❌ Fast2SMS request error:", err.message);
      resolve({ success: false, error: err.message });
    });

    req.write(postData);
    req.end();
  });
};

module.exports = { sendWhatsApp, sendSMS };

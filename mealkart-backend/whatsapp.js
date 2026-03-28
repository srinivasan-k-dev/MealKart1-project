// ============================================================
//  whatsapp.js — Twilio WhatsApp sender for Mealkart
//  Twilio Sandbox Number: +14155238886
// ============================================================

const twilio = require("twilio");

const client = new twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH
);

// ── Send a WhatsApp message via Twilio Sandbox ──
// `to`      = 10-digit Indian number e.g. "9876543210"
// `message` = plain text string
const sendWhatsApp = async (to, message) => {
  try {
    const result = await client.messages.create({
      from: "whatsapp:+14155238886",   // Twilio sandbox number
      to:   `whatsapp:+91${to}`,       // Parent's Indian number
      body: message,
    });
    console.log(`📲 WhatsApp sent to +91${to} | SID: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (err) {
    console.error(`❌ WhatsApp failed to +91${to}:`, err.message);
    return { success: false, error: err.message };
  }
};

module.exports = sendWhatsApp;

const axios = require("axios");

const sendSMS = async (phone, message) => {
  try {
    const res = await axios.get("https://www.fast2sms.com/dev/bulkV2", {
      params: {
        authorization: process.env.FAST2SMS_API_KEY,
        route: "q",
        message,
        language: "english",
        flash: 0,
        numbers: phone,
      },
    });

    console.log("📩 SMS sent:", res.data);
    return true;
  } catch (err) {
    console.error("❌ SMS failed:", err.message);
    return false;
  }
};

module.exports = sendSMS;

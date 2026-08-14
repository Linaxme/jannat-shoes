const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();
const db = admin.firestore();

const SMS_API_URL = "https://sms.ocs-api.top/api/send-sms";
const SMS_API_KEY = "WNULRXBVbfMWJLXQkd99TMVKqY7vXeVpYTMVl9Xu";
const SMS_SENDER_ID = "8809617626047";

function formatPhoneNumber(rawPhone) {
  let cleaned = (rawPhone || "").replace(/\D/g, "");
  if (cleaned.startsWith("880")) return cleaned;
  if (cleaned.startsWith("0")) return "88" + cleaned;
  return "880" + cleaned;
}

// 1. Send OTP Cloud Function
exports.sendCustomOtp = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).send("");

  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: "ফোন নম্বর প্রদান করুন।" });

    const cleanPhone = phone.replace(/\D/g, "");
    const formattedNumber = formatPhoneNumber(phone);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in Firestore otp_codes collection with 5-minute expiry
    await db.collection("otp_codes").doc(cleanPhone).set({
      otp: otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const message = `মেসার্স জান্নাত সুজ-এ লগইনের জন্য আপনার ওটিপি (OTP) কোড: ${otp}। কোডটির মেয়াদ ৫ মিনিট।`;

    const smsRes = await fetch(SMS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        api_key: SMS_API_KEY,
        senderid: SMS_SENDER_ID,
        number: formattedNumber,
        message: message,
      }),
    });

    const result = await smsRes.json();
    return res.json({ success: true, message: "ওটিপি সফলভাবে পাঠানো হয়েছে।" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Verify OTP Cloud Function
exports.verifyCustomOtp = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).send("");

  try {
    const { phone, otp } = req.body;
    const cleanPhone = (phone || "").replace(/\D/g, "");
    const docRef = db.collection("otp_codes").doc(cleanPhone);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(400).json({ success: false, error: "ওটিপি কোডের মেয়াদ শেষ হয়েছে।" });
    }

    const data = doc.data();
    if (Date.now() > data.expiresAt) {
      await docRef.delete();
      return res.status(400).json({ success: false, error: "ওটিপি কোডের মেয়াদ শেষ হয়েছে।" });
    }

    if (data.otp !== (otp || "").trim()) {
      return res.status(400).json({ success: false, error: "ওটিপি কোডটি সঠিক নয়।" });
    }

    await docRef.delete();
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

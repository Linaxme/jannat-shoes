import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

// In-memory store for OTPs
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

/**
 * 1. Send SMS Cloud Function (2nd Gen with native CORS)
 */
export const sendSms = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method Not Allowed" });
    return;
  }

  try {
    const { to, message, apiKey, senderId, baseUrl } = req.body || {};

    if (!to || !message) {
      res.status(400).json({ success: false, error: "Phone number and message are required" });
      return;
    }

    // Format recipient phone number (Standard BD format: 8801XXXXXXXXX)
    let formattedPhone = String(to).replace(/[^0-9]/g, "");
    if (formattedPhone.startsWith("01")) {
      formattedPhone = "88" + formattedPhone;
    }

    const activeApiKey = apiKey || process.env.SMS_API_KEY || "YOUR_ELITBUZZ_API_KEY";
    const activeSenderId = senderId || process.env.SMS_SENDER_ID || "8809617618999";
    const activeBaseUrl = baseUrl || "https://msg.elitbuzz-bd.com/smsapi";

    const params = new URLSearchParams({
      api_key: activeApiKey,
      type: "text",
      contacts: formattedPhone,
      senderid: activeSenderId,
      msg: message,
    });

    const response = await fetch(activeBaseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const responseText = await response.text();
    res.json({
      success: true,
      message: "SMS request dispatched successfully",
      gatewayResponse: responseText,
    });
  } catch (error: any) {
    console.error("SMS Dispatch Error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to send SMS" });
  }
});

/**
 * 2. Send OTP Cloud Function (2nd Gen with native CORS)
 */
export const sendOtp = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method Not Allowed" });
    return;
  }

  try {
    const { phone, appName } = req.body || {};

    if (!phone) {
      res.status(400).json({ success: false, error: "Phone number is required" });
      return;
    }

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

    // Standardize phone key
    const cleanPhone = String(phone).replace(/[^0-9]/g, "");
    otpStore.set(cleanPhone, { otp, expiresAt });

    const name = appName || "মেসার্স জান্নাত সুজ";
    const message = `আপনার ${name} যাচাইকরণ কোড হলো: ${otp}। মেয়াদ ৫ মিনিট।`;

    // Dispatch SMS
    let formattedPhone = cleanPhone;
    if (formattedPhone.startsWith("01")) {
      formattedPhone = "88" + formattedPhone;
    }

    const activeApiKey = process.env.SMS_API_KEY || "YOUR_ELITBUZZ_API_KEY";
    const activeSenderId = process.env.SMS_SENDER_ID || "8809617618999";
    const activeBaseUrl = "https://msg.elitbuzz-bd.com/smsapi";

    const params = new URLSearchParams({
      api_key: activeApiKey,
      type: "text",
      contacts: formattedPhone,
      senderid: activeSenderId,
      msg: message,
    });

    await fetch(activeBaseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    res.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error: any) {
    console.error("OTP Dispatch Error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to send OTP" });
  }
});

/**
 * 3. Verify OTP Cloud Function (2nd Gen with native CORS)
 */
export const verifyOtp = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method Not Allowed" });
    return;
  }

  try {
    const { phone, otp } = req.body || {};

    if (!phone || !otp) {
      res.status(400).json({ success: false, error: "Phone and OTP are required" });
      return;
    }

    const cleanPhone = String(phone).replace(/[^0-9]/g, "");
    const record = otpStore.get(cleanPhone);

    if (!record) {
      res.status(400).json({ success: false, error: "কোন ওটিপি অনুরোধ পাওয়া যায়নি। পুনরায় ওটিপি পাঠান।" });
      return;
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanPhone);
      res.status(400).json({ success: false, error: "ওটিপির মেয়াদ শেষ হয়ে গেছে। অনুগ্রহ করে আবার চেষ্টা করুন।" });
      return;
    }

    if (record.otp !== String(otp).trim()) {
      res.status(400).json({ success: false, error: "ভুল ওটিপি কোড! অনুগ্রহ করে সঠিক কোড দিন।" });
      return;
    }

    // Success -> delete used OTP
    otpStore.delete(cleanPhone);

    res.json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error: any) {
    console.error("OTP Verify Error:", error);
    res.status(500).json({ success: false, error: error.message || "Verification failed" });
  }
});

import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

// In-memory store for OTPs
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

const DEFAULT_SMS_API_URL = "https://sms.ocs-api.top/api/send-sms";
const DEFAULT_SMS_API_KEY = process.env.SMS_API_KEY || "WNULRXBVbfMWJLXQkd99TMVKqY7vXeVpYTMVl9Xu";
const DEFAULT_SMS_SENDER_ID = process.env.SMS_SENDER_ID || "8809617626047";

function formatPhoneNumber(rawPhone: string): string {
  let cleaned = String(rawPhone).replace(/\D/g, "");
  if (cleaned.startsWith("880")) {
    return cleaned;
  }
  if (cleaned.startsWith("0")) {
    return "88" + cleaned;
  }
  return "880" + cleaned;
}

/**
 * 1. Send SMS Cloud Function (2nd Gen with native CORS)
 */
export const sendSms = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method Not Allowed" });
    return;
  }

  try {
    const { to, phone, message, apiKey, senderId, baseUrl } = req.body || {};
    const targetPhone = to || phone;

    if (!targetPhone || !message) {
      res.status(400).json({ success: false, error: "Phone number and message are required" });
      return;
    }

    const formattedPhone = formatPhoneNumber(targetPhone);
    const activeApiKey = apiKey || DEFAULT_SMS_API_KEY;
    const activeSenderId = senderId || DEFAULT_SMS_SENDER_ID;
    const activeBaseUrl = baseUrl || DEFAULT_SMS_API_URL;

    let response;
    // Check if ElitBuzz or OCS / JSON Gateway
    if (activeBaseUrl.includes("elitbuzz")) {
      const params = new URLSearchParams({
        api_key: activeApiKey,
        type: "text",
        contacts: formattedPhone,
        senderid: activeSenderId,
        msg: message,
      });

      response = await fetch(activeBaseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
    } else {
      // Standard JSON SMS Gateway (ocs-api / REST)
      response = await fetch(activeBaseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        body: JSON.stringify({
          api_key: activeApiKey,
          senderid: activeSenderId,
          number: formattedPhone,
          message: message,
        }),
      });
    }

    const responseText = await response.text();
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      parsedData = { raw: responseText };
    }

    if (response.ok) {
      res.json({
        success: true,
        message: "SMS request dispatched successfully",
        gatewayResponse: parsedData,
      });
    } else {
      res.status(response.status || 500).json({
        success: false,
        error: parsedData?.message || responseText || "SMS gateway rejected the request",
        gatewayResponse: parsedData,
      });
    }
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

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

    // Standardize phone key
    const cleanPhone = String(phone).replace(/[^0-9]/g, "");
    otpStore.set(cleanPhone, { otp, expiresAt });

    const name = appName || "মেসার্স জান্নাত সুজ";
    const formattedPhone = formatPhoneNumber(cleanPhone);
    const message = `Jannat Shoes OTP: ${otp}. Your login code is ${otp}. Valid for 5 minutes.`;

    const response = await fetch(DEFAULT_SMS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: JSON.stringify({
        api_key: DEFAULT_SMS_API_KEY,
        senderid: DEFAULT_SMS_SENDER_ID,
        number: formattedPhone,
        message: message,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (response.ok) {
      res.json({
        success: true,
        message: "OTP sent successfully",
        devOtp: otp,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result?.message || "Failed to send OTP through SMS Gateway",
      });
    }
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

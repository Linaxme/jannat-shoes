import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory OTP storage with expiration
interface OtpEntry {
  otp: string;
  expiresAt: number;
  attempts: number;
}

const otpStore = new Map<string, OtpEntry>();

// Clean up expired OTPs periodically
setInterval(() => {
  const now = Date.now();
  for (const [phone, entry] of otpStore.entries()) {
    if (now > entry.expiresAt) {
      otpStore.delete(phone);
    }
  }
}, 60000);

const SMS_API_URL = 'https://sms.ocs-api.top/api/send-sms';
const SMS_API_KEY = process.env.SMS_API_KEY || 'WNULRXBVbfMWJLXQkd99TMVKqY7vXeVpYTMVl9Xu';
const SMS_SENDER_ID = '8809617626047';

function formatPhoneNumber(rawPhone: string): string {
  let cleaned = rawPhone.replace(/\D/g, '');
  if (cleaned.startsWith('880')) {
    return cleaned;
  }
  if (cleaned.startsWith('0')) {
    return '88' + cleaned;
  }
  return '880' + cleaned;
}

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. Send Custom OTP
app.post('/api/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: 'ফোন নম্বর প্রদান করুন।' });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 11) {
      return res.status(400).json({ success: false, error: 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন।' });
    }

    const formattedNumber = formatPhoneNumber(phone);

    // Generate 6-digit OTP (or fixed for testing super admin if needed)
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save to store (5 minutes validity)
    otpStore.set(cleanPhone, {
      otp: generatedOtp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0,
    });

    // Standard concise OTP template for instant telecom operator dispatch
    const smsMessage = `Jannat Shoes OTP: ${generatedOtp}. Your login code is ${generatedOtp}. Valid for 5 minutes.`;

    const smsResponse = await fetch(SMS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: JSON.stringify({
        api_key: SMS_API_KEY,
        senderid: SMS_SENDER_ID,
        number: formattedNumber,
        message: smsMessage,
      }),
    });

    const result = await smsResponse.json().catch(() => ({}));

    if (smsResponse.ok) {
      return res.json({
        success: true,
        message: `আপনার ${phone} নম্বরে ওটিপি পাঠানো হয়েছে।`,
        devOtp: generatedOtp,
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result?.message || 'এসএমএস গেটওয়ে থেকে পাঠাতে সমস্যা হয়েছে।',
      });
    }
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({ success: false, error: error.message || 'সার্ভার ত্রুটি।' });
  }
});

// 3. Verify Custom OTP
app.post('/api/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, error: 'ফোন নম্বর এবং ওটিপি কোড প্রয়োজন।' });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const entry = otpStore.get(cleanPhone);

    if (!entry) {
      return res.status(400).json({ success: false, error: 'ওটিপি এর মেয়াদ শেষ হয়ে গেছে। পুনরায় পাঠান।' });
    }

    if (Date.now() > entry.expiresAt) {
      otpStore.delete(cleanPhone);
      return res.status(400).json({ success: false, error: 'ওটিপি কোডের ৫ মিনিট মেয়াদ শেষ হয়েছে।' });
    }

    if (entry.attempts >= 5) {
      otpStore.delete(cleanPhone);
      return res.status(400).json({ success: false, error: 'অনেকবার ভুল চেষ্টা করা হয়েছে। নতুন ওটিপি পাঠান।' });
    }

    if (entry.otp !== otp.trim()) {
      entry.attempts += 1;
      return res.status(400).json({ success: false, error: 'ওটিপি কোডটি সঠিক নয়। পুনরায় চেষ্টা করুন।' });
    }

    // OTP is valid! Delete used OTP
    otpStore.delete(cleanPhone);

    return res.json({
      success: true,
      message: 'ওটিপি সফলভাবে যাচাই হয়েছে।',
    });
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({ success: false, error: error.message || 'সার্ভার ত্রুটি।' });
  }
});

// 4. Send Custom Transactional / Customer SMS
app.post('/api/send-sms', async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ success: false, error: 'মোবাইল নম্বর ও বার্তা প্রদান করুন।' });
    }

    const formattedNumber = formatPhoneNumber(phone);

    const smsResponse = await fetch(SMS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: JSON.stringify({
        api_key: SMS_API_KEY,
        senderid: SMS_SENDER_ID,
        number: formattedNumber,
        message: message,
      }),
    });

    const result = await smsResponse.json().catch(() => ({}));
    console.log('Transactional SMS sent to', formattedNumber, 'Result:', result);

    if (smsResponse.ok) {
      return res.json({ success: true, result });
    } else {
      return res.status(500).json({
        success: false,
        error: result?.message || 'এসএমএস পাঠাতে সমস্যা হয়েছে।',
      });
    }
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    return res.status(500).json({ success: false, error: error.message || 'সার্ভার ত্রুটি।' });
  }
});

// Setup Vite middleware for Development and Static Serving for Production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Jannat Shoes server running on http://localhost:${PORT}`);
  });
}

startServer();

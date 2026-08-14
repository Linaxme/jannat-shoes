# Firebase Cloud Functions Deploy Guide (via Termux / PC)

এই প্রজেক্টে Firebase Functions সাপোর্ট রেডি করে রাখা হয়েছে।

---

## 📱 মোবাইল (Termux) দিয়ে ডিপ্লয় করার নিয়ম:

### ১. টার্মুক্স প্রস্তুত করুন:
```bash
pkg update && pkg upgrade -y
pkg install nodejs git -y
npm install -g firebase-tools
```

### ২. ফায়ারবেসে লগইন করুন:
```bash
firebase login --no-localhost
```
*(টার্মিনালে দেওয়া লিঙ্ক ব্রাউজারে খুলে অনুমোদন দিন এবং কোডটি পেস্ট করুন)*

### ৩. প্রজেক্ট ফোল্ডারে ডিপ্লয় করুন:
```bash
cd functions
npm install
firebase deploy --only functions
```

---

## 🔑 ডিপ্লয় শেষে ফাংশন লিঙ্ক:
ডিপ্লয় সফল হলে টার্মিনালে ৩টি URL পাবেন:
- `sendSms`: `https://<region>-<project-id>.cloudfunctions.net/sendSms`
- `sendOtp`: `https://<region>-<project-id>.cloudfunctions.net/sendOtp`
- `verifyOtp`: `https://<region>-<project-id>.cloudfunctions.net/verifyOtp`

Cloudflare Pages-এর Environment Variables-এ `VITE_FIREBASE_FUNCTION_SMS_URL` হিসেবে এই `sendSms` URL-টি বসিয়ে দিলে ব্রাউজার থেকে স্বয়ংক্রিয়ভাবে সরাসরি ফায়ারবেস ক্লাউড ফাংশন দিয়ে এসএমএস পাঠানো হবে।

# Project Instructions & User Preferences

## Cloud Agent

- Install with `npm ci` from the repository root. Node.js 22 is enough. Dev server: `npm run dev` (Express + Vite on http://0.0.0.0:3000). Readiness: `GET /api/health`.
- `npm run lint` is `tsc --noEmit`.
- Do not call `/api/send-otp` or `/api/send-sms`. Those routes send real SMS.
- The UI talks to the production Firestore project `stokm-fe3c1` and can write on load. Do not create, edit, or delete shop data from a Cloud Agent.

## UI Text & Feature Design Guidelines
- **কোনো অতিরিক্ত বা অপ্রয়োজনীয় নির্দেশনামূলক লেখা পরিহার করুন**: যেকোনো ফিচার যুক্ত বা পরিবর্তন করার সময় UI-তে বাড়তি কোনো নির্দেশনামূলক লেখা (instructional text, hints, helper descriptions, verbose sub-labels) যোগ করবেন না। শুধুমাত্র প্রয়োজনীয় কার্যকরী লেবেল ও ডেটা প্রদর্শন করতে হবে।
- ইন্টারফেস সবসময় ক্লিন, সরাসরি এবং মিনিমালিস্ট রাখতে হবে।

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dns from "dns";

// Fix for Node 17+ localhost resolution
dns.setDefaultResultOrder("ipv4first");

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON and URL-encoded bodies
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // SMS API Endpoint proxy
  app.post("/api/send-sms", async (req, res) => {
    try {
      const { phone, message } = req.body;
      if (!phone || !message) {
        return res.status(400).json({ success: false, error: "মোবাইল নম্বর এবং মেসেজ উভয়ই আবশ্যক।" });
      }

      // Format phone number to clean digit string
      let cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
        cleanPhone = '88' + cleanPhone;
      }

      const apiKey = process.env.SMS_API_KEY || "WNULRXBVbfMWJLXQkd99TMVKqY7vXeVpYTMVl9Xu";
      const senderId = process.env.SMS_SENDER_ID || "nonmasking";

      const apiUrl = `https://sms.ocs-api.top/api/send-sms?api_key=${encodeURIComponent(apiKey)}&senderid=${encodeURIComponent(senderId)}&number=${encodeURIComponent(cleanPhone)}&message=${encodeURIComponent(message)}`;

      console.log(`Sending SMS to ${cleanPhone} with senderid ${senderId} via proxy...`);
      const response = await fetch(apiUrl, {
        headers: {
          "Accept": "application/json"
        }
      });

      const textResponse = await response.text();
      console.log("SMS API Response Status:", response.status);
      console.log("SMS API Response Body:", textResponse);

      let data;
      try {
        data = JSON.parse(textResponse);
      } catch {
        data = { raw: textResponse };
      }

      const isSuccess = response.ok && (
        (typeof data.message === "string" && data.message.toLowerCase().includes("success")) || 
        (Array.isArray(data.results) && data.results.length > 0 && (
          data.results[0].status === "sent" || 
          data.results[0].status === "success" ||
          data.results[0].code === null ||
          data.results[0].code === 0
        )) ||
        data.total_cost !== undefined
      );

      if (isSuccess) {
        return res.json({ success: true, data });
      } else {
        const errorMessage = data.message || (data.errors ? Object.values(data.errors).flat().join(", ") : null) || textResponse || "গেটওয়ে থেকে ত্রুটি ঘটেছে।";
        return res.json({ success: false, error: errorMessage });
      }
    } catch (error: any) {
      console.error("Error sending SMS:", error);
      return res.status(500).json({ success: false, error: error.message || "সার্ভারের অভ্যন্তরীণ সমস্যা।" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

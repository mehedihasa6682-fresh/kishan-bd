import express from "express";
import webpush from "web-push";
import dotenv from "dotenv";
import path from "path";
import admin from "firebase-admin";

dotenv.config();

// Initialize Firebase Admin
try {
  if (admin.apps.length === 0) {
    const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (rawServiceAccount) {
      try {
        const serviceAccount = JSON.parse(rawServiceAccount);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin initialized successfully");
      } catch (parseError) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON. Ensure it is a valid JSON string on Vercel.");
      }
    } else {
      console.warn("FIREBASE_SERVICE_ACCOUNT_JSON missing. FCM Admin will not be available.");
    }
  }
} catch (error) {
  console.error("Firebase Admin init failed:", error);
}

const app = express();
app.use(express.json());

// VAPID Keys
const vapidKeys = {
  publicKey: process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
};

if (vapidKeys.publicKey && vapidKeys.privateKey) {
  try {
    webpush.setVapidDetails(
      "mailto:admin@sodaibhai.com",
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );
    console.log("VAPID details set successfully");
  } catch (err) {
    console.error("Failed to set VAPID details:", err);
  }
} else {
  console.warn("VAPID keys are missing. Push notifications will not work.");
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/fcm-status", (req, res) => {
  res.json({
    adminInitialized: admin.apps.length > 0,
    vapidSet: !!(vapidKeys.publicKey && vapidKeys.privateKey),
    vercel: !!process.env.VERCEL,
    env: {
      hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
      hasVapidPublic: !!process.env.VITE_VAPID_PUBLIC_KEY,
      hasVapidPrivate: !!process.env.VAPID_PRIVATE_KEY
    }
  });
});

app.post("/api/order-notification", async (req, res) => {
  const { customerName, phone, address, itemCount, totalAmount, paymentMethod, items } = req.body;
  
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!token || !chatId) {
    console.error("Missing Telegram configuration");
    return res.status(500).json({ error: "Notification service not configured" });
  }

  const itemsList = items && items.length > 0 
    ? items.map((item: any) => `• ${item.name} x${item.quantity}`).join('\n') 
    : 'No items recorded';

  const message = `🛒 <b>New Grocery Order</b>\n\n` +
    `👤 <b>Customer:</b> ${customerName}\n` +
    `📞 <b>Phone:</b> ${phone}\n` +
    `📍 <b>Address:</b> ${address}\n` +
    `💳 <b>Payment:</b> ${paymentMethod}\n\n` +
    `📦 <b>Products:</b>\n${itemsList}\n\n` +
    `🛍 <b>Total Items:</b> ${itemCount}\n` +
    `💰 <b>Total Amount:</b> ৳${totalAmount}`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Telegram API Error:", errorData);
      throw new Error("Failed to send Telegram message");
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Telegram notification failed:", error);
    res.status(500).json({ error: "Failed to send notification" });
  }
});

app.post("/api/send-fcm", async (req, res) => {
  const { token, notification, data } = req.body;
  
  if (!token) return res.status(400).json({ error: "Missing FCM token" });
  
  if (admin.apps.length === 0) {
    return res.status(500).json({ 
      error: "Firebase Admin not initialized", 
      details: "FIREBASE_SERVICE_ACCOUNT_JSON environment variable is missing or invalid on Vercel dashboard." 
    });
  }
  
  try {
    const message: any = {
      token: token,
      notification: {
        title: notification.title || "সদাই ভাই",
        body: notification.body || "Update from Sodai Bhai"
      },
      data: data || {},
      android: {
        priority: 'high',
        notification: {
          icon: 'stock_ticker_update', // Use app icon
          color: '#16A34A',
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK', // Common for cross-platform, but works for web too
          notificationCount: 1,
        }
      },
      webpush: {
        headers: {
          Urgency: 'high'
        },
        notification: {
          icon: "/logo.png",
          badge: "/logo.png",
          vibrate: [200, 100, 200, 100, 200],
          requireInteraction: true,
          renotify: true,
          actions: [
            { action: 'open', title: 'Open View' }
          ]
        },
        fcmOptions: {
          link: data?.url || '/'
        }
      }
    };

    const response = await admin.messaging().send(message);
    res.json({ success: true, messageId: response });
  } catch (error: any) {
    console.error("FCM Send Error:", error);
    res.status(500).json({ error: "FCM Send Failed", details: error.message });
  }
});

app.post("/api/send-notification", async (req, res) => {
  const { subscription, payload } = req.body;
  if (!vapidKeys.privateKey) {
    return res.status(400).json({ error: "Missing VAPID_PRIVATE_KEY" });
  }
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Push failed" });
  }
});

app.get("/api/vapid-public-key", (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// Helper for local dev only
async function startServer() {
  const isVercel = !!process.env.VERCEL || !!process.env.NOW_REGION;
  const isProd = process.env.NODE_ENV === "production";

  if (isVercel) {
    console.log("Running in Vercel environment - Skipping local port listener");
    return;
  }

  if (!isProd) {
    // Dynamically import Vite only during development
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      
      const PORT = 3000;
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Development server running on http://localhost:${PORT}`);
      });
    } catch (err) {
      console.error("Failed to start Vite dev server:", err);
    }
  } else {
    // Local Production: Serve static files from 'dist'
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      // For any route that's not an API, serve index.html
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: "API route not found" });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
    
    const PORT = process.env.PORT || 3000;
    app.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`Local production server running on http://localhost:${PORT}`);
    });
  }
}

startServer().catch(err => {
  console.error("Critical error in startServer:", err);
});

export default app;

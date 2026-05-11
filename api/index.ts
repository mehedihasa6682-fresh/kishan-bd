import express from "express";
import webpush from "web-push";
import dotenv from "dotenv";
import path from "path";
import admin from "firebase-admin";
import nodemailer from "nodemailer";

dotenv.config();

// Initialize Firebase Admin
try {
  if (admin.apps.length === 0) {
    const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (rawServiceAccount) {
      try {
        // Handle potential double-escaped newlines and other common env var issues
        let configString = rawServiceAccount.trim();
        if (configString.startsWith('"') && configString.endsWith('"')) {
          configString = JSON.parse(configString);
        }
        
        // Final robustness check: if it looks like JSON but parsing might fail due to literal newlines
        let serviceAccount: any;
        try {
          serviceAccount = typeof configString === 'string' ? JSON.parse(configString) : configString;
        } catch (e) {
          // Try replacing literal \n with actual newlines if it's a string
          if (typeof configString === 'string') {
            const fixed = configString.replace(/\\n/g, '\n');
            serviceAccount = JSON.parse(fixed);
          } else {
            throw e;
          }
        }
        
        // Ensure private_key has correct newlines
        if (serviceAccount.private_key) {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id
        });
        console.log("Firebase Admin initialized successfully. Project:", serviceAccount.project_id);
      } catch (parseError: any) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON. Error:", parseError.message);
      }
    } else {
      console.warn("FIREBASE_SERVICE_ACCOUNT_JSON missing. Admin SDK will not be fully functional.");
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
  console.warn("VAPID keys are missing. Push notifications (WebPush) will not work.");
}

// Nodemailer Transporter Configuration
const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    console.warn("Email configuration missing (SMTP_HOST, EMAIL_USER, EMAIL_PASS). Bulk email will fail.");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
  });
};

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    admin: admin.apps.length > 0
  });
});

// Coupon Validation
app.post("/api/coupons/validate", async (req, res) => {
  const { code, orderValue, userId } = req.body;
  if (!code) return res.status(400).json({ error: "Coupon code required" });

  if (admin.apps.length === 0) {
    return res.status(503).json({ error: "Service unavailable", details: "Database connection not initialized" });
  }

  try {
    const db = admin.firestore();
    const couponSnapshot = await db.collection('coupons')
      .where('code', '==', code)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (couponSnapshot.empty) {
      return res.status(404).json({ error: "Invalid or inactive coupon" });
    }

    const couponData = couponSnapshot.docs[0].data();
    
    // Safety & Validation Rules
    if (orderValue < (couponData.minOrder || 0)) {
      return res.status(400).json({ error: `Minimum order of ৳${couponData.minOrder} required` });
    }

    const now = new Date();
    if (couponData.expiryDate && new Date(couponData.expiryDate) < now) {
      return res.status(400).json({ error: "Coupon has expired" });
    }

    if (couponData.usageLimit && (couponData.usedCount || 0) >= couponData.usageLimit) {
      return res.status(400).json({ error: "Coupon usage limit reached" });
    }

    let discount = 0;
    if (couponData.type === 'percentage') {
      discount = (orderValue * (couponData.value / 100));
      if (couponData.maxDiscount && discount > couponData.maxDiscount) {
        discount = couponData.maxDiscount;
      }
    } else if (couponData.type === 'fixed') {
      discount = couponData.value;
    }

    res.json({ 
      success: true, 
      discount, 
      type: couponData.type,
      couponId: couponSnapshot.docs[0].id
    });
  } catch (error: any) {
    res.status(500).json({ error: "Validation failed", details: error.message });
  }
});

// Abandoned Cart Tracking
app.post("/api/cart/abandon", async (req, res) => {
  const { userId, items, totalAmount } = req.body;
  if (!userId) return res.status(400).json({ error: "User identity required" });

  if (admin.apps.length === 0) return res.status(503).json({ error: "Database not available" });

  try {
    const db = admin.firestore();
    await db.collection('abandoned_carts').doc(userId).set({
      userId,
      items,
      totalAmount,
      lastUpdated: new Date().toISOString(),
      notificationSent: false,
      status: 'abandoned'
    }, { merge: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to log cart", details: error.message });
  }
});

// Cart Recovery Engine (Should be called by a cron)
app.get("/api/cart/recover-pings", async (req, res) => {
  if (admin.apps.length === 0) return res.status(503).json({ error: "Database not available" });

  try {
    const db = admin.firestore();
    const threshold = new Date();
    threshold.setMinutes(threshold.getMinutes() - 30); // 30 mins ago

    const snapshot = await db.collection('abandoned_carts')
      .where('status', '==', 'abandoned')
      .where('notificationSent', '==', false)
      .where('lastUpdated', '<=', threshold.toISOString())
      .limit(10)
      .get();

    const results = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Get User's FCM Token
      const tokenDoc = await db.collection('fcmTokens').doc(data.userId).get();
      if (tokenDoc.exists) {
        const { token } = tokenDoc.data()!;
        
        // Send Notification
        try {
          await admin.messaging().send({
            token,
            notification: {
              title: "🛒 আপনার কার্ট এখনো অপেক্ষা করছে!",
              body: "আপনার পছন্দের পণ্যগুলো এখনো কার্টে আছে। এখনই অর্ডার শেষ করুন এবং বিশেষ ডিসকাউন্ট বুঝে নিন! 🎁"
            },
            data: { 
              url: '/cart',
              type: 'abandoned_recovery'
            },
            webpush: {
              fcmOptions: { link: '/cart' }
            }
          });
          
          await doc.ref.update({ notificationSent: true });
          results.push({ userId: data.userId, status: 'sent' });
        } catch (pushError) {
          results.push({ userId: data.userId, status: 'failed', error: pushError });
        }
      } else {
        results.push({ userId: data.userId, status: 'no_token' });
      }
    }

    res.json({ processed: results.length, details: results });
  } catch (error: any) {
    res.status(500).json({ error: "Recovery engine failed", details: error.message });
  }
});

app.get("/api/fcm-status", (req, res) => {
  res.json({
    adminInitialized: admin.apps.length > 0,
    vapidSet: !!(vapidKeys.publicKey && vapidKeys.privateKey),
    vercel: !!(process.env.VERCEL || process.env.NOW_REGION),
    telegram: {
      hasToken: !!process.env.TELEGRAM_BOT_TOKEN,
      hasChatId: !!process.env.TELEGRAM_ADMIN_CHAT_ID,
    },
    email: {
      hasHost: !!process.env.SMTP_HOST,
      hasUser: !!process.env.EMAIL_USER,
      hasPass: !!process.env.EMAIL_PASS
    }
  });
});

app.post("/api/order-notification", async (req, res) => {
  const { customerName, phone, address, itemCount, totalAmount, paymentMethod, items } = req.body;
  
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!token || !chatId) {
    console.error("Missing Telegram configuration.");
    return res.status(500).json({ 
      error: "Notification service not configured"
    });
  }

  const itemsList = items && items.length > 0 
    ? items.map((item: any) => `• ${item.name} x${item.quantity}`).join('\n') 
    : 'No items recorded';

  // Sanitize text for HTML mode
  const clean = (str: any) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const message = `🛒 <b>New Grocery Order</b>\n\n` +
    `👤 <b>Customer:</b> ${clean(customerName)}\n` +
    `📞 <b>Phone:</b> ${clean(phone)}\n` +
    `📍 <b>Address:</b> ${clean(address)}\n` +
    `💳 <b>Payment:</b> ${clean(paymentMethod)}\n\n` +
    `📦 <b>Products:</b>\n${clean(itemsList)}\n\n` +
    `🛍 <b>Total Items:</b> ${itemCount}\n` +
    `💰 <b>Total Amount:</b> ৳${totalAmount}`;

  try {
    const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const responseData = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: "Telegram API indicated failure", 
        details: responseData 
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to send notification via network", details: error.message });
  }
});

app.post("/api/admin/bulk-email", async (req, res) => {
  const { target, subject, content } = req.body;
  
  if (!subject || !content) return res.status(400).json({ error: "Subject and content required" });
  if (admin.apps.length === 0) return res.status(503).json({ error: "Firebase Admin not initialized" });

  const transporter = createTransporter();
  if (!transporter) {
    return res.status(503).json({ error: "Email service not configured. Check EMAIL_USER, EMAIL_PASS and SMTP_HOST variables." });
  }

  try {
    const db = admin.firestore();
    let emails: string[] = [];

    if (target === 'custom' && req.body.customEmails) {
      emails = req.body.customEmails.split(',').map((e: string) => e.trim()).filter((e: string) => /^\S+@\S+\.\S+$/.test(e));
    } else {
      let query: any = db.collection('users');
      
      if (target === 'no-push') {
        query = query.where('pushEnabled', '==', false);
      }

      const usersSnapshot = await query.get();
      emails = usersSnapshot.docs.map((doc: any) => doc.data().email).filter((e: any) => !!e);
    }

    if (emails.length === 0) {
      return res.json({ success: true, count: 0, message: "No valid email addresses found for dispatch." });
    }

    console.log(`Sending marketing bulk email via SMTP to ${emails.length} users. Subject: ${subject}`);
    
    // Use BCC for privacy
    // Note: Most providers have limits on BCC count (e.g. 50-100 per email).
    // For a real production app, we would chunk these.
    const CHUNK_SIZE = 45;
    const sendAttempts = [];

    for (let i = 0; i < emails.length; i += CHUNK_SIZE) {
      const bccBatch = emails.slice(i, i + CHUNK_SIZE);
      sendAttempts.push(
        transporter.sendMail({
          from: `"Sodaibhai Admin" <${process.env.EMAIL_USER}>`,
          to: process.env.EMAIL_USER, // Send to self, users in BCC
          bcc: bccBatch,
          subject: subject,
          html: content.replace(/\n/g, '<br/>'),
          text: content
        })
      );
    }

    const results = await Promise.allSettled(sendAttempts);
    const failed = results.filter(r => r.status === 'rejected');

    if (failed.length > 0) {
       console.error("Email batch failed:", failed);
       return res.status(500).json({ 
         error: "Partial or total failure in sending emails", 
         details: failed.map((f: any) => f.reason?.message || "Unknown error").join(', ')
       });
    }

    res.json({ 
      success: true, 
      count: emails.length,
      message: `Successfully dispatched emails in ${sendAttempts.length} batches.`
    });
  } catch (error: any) {
    console.error("Bulk Email Error:", error);
    res.status(500).json({ error: "Email broadcast failed", details: error.message });
  }
});

app.post("/api/admin/bulk-push", async (req, res) => {
  const { title, body, target } = req.body;
  if (!title || !body) return res.status(400).json({ error: "Title and body required" });
  if (admin.apps.length === 0) return res.status(503).json({ error: "Firebase Admin not initialized" });

  try {
    const db = admin.firestore();
    let query: any = db.collection('fcm_tokens');
    
    const tokensSnapshot = await query.get();
    const tokens = tokensSnapshot.docs.map((doc: any) => doc.data().token).filter((t: any) => !!t);

    if (tokens.length === 0) {
      return res.json({ success: true, count: 0, message: "No valid FCM tokens found." });
    }

    console.log(`Sending bulk push to ${tokens.length} tokens. Title: ${title}`);
    
    const messages = tokens.map(token => ({
      token,
      notification: { title, body },
      android: { priority: 'high' },
      webpush: {
        notification: {
          icon: '/logo.png',
          badge: '/logo.png',
          click_action: '/'
        }
      }
    }));

    // Send in batches of 500 (FCM limit)
    let successCount = 0;
    for (let i = 0; i < messages.length; i += 500) {
      const batch = messages.slice(i, i + 500);
      const response = await admin.messaging().sendEach(batch);
      successCount += response.successCount;
    }
    
    res.json({ 
      success: true, 
      count: tokens.length,
      sentCount: successCount,
      message: `Dispatched ${tokens.length} push notifications.` 
    });
  } catch (error: any) {
    res.status(500).json({ error: "Bulk push failed", details: error.message });
  }
});

app.post("/api/send-fcm", async (req, res) => {
  const { token, notification, data } = req.body;
  
  if (!token) return res.status(400).json({ error: "Missing FCM token" });
  
  if (admin.apps.length === 0) {
    return res.status(503).json({ 
      error: "Firebase Admin not initialized", 
      details: "Check your FIREBASE_SERVICE_ACCOUNT_JSON." 
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
          icon: 'stock_ticker_update',
          color: '#16A34A',
          sound: 'default',
        }
      },
      webpush: {
        notification: {
          icon: "/logo.png",
          badge: "/logo.png",
          requireInteraction: true,
        },
        fcmOptions: {
          link: data?.url || '/'
        }
      }
    };

    const response = await admin.messaging().send(message);
    res.json({ success: true, messageId: response });
  } catch (error: any) {
    res.status(500).json({ error: "FCM Send Failed", details: error.message });
  }
});

app.post("/api/broadcast-fcm", async (req, res) => {
  const { notification, data } = req.body;
  
  if (admin.apps.length === 0) {
    return res.status(503).json({ error: "Firebase Admin not initialized." });
  }
  
  try {
    const db = admin.firestore();
    const tokensSnapshot = await db.collection('fcmTokens').get();
    const tokens = tokensSnapshot.docs.map(doc => doc.data().token).filter(t => !!t);
    
    if (tokens.length === 0) {
      return res.json({ success: true, successCount: 0, message: "No active tokens found" });
    }

    const activeTokens = tokens.slice(0, 500);

    const message = {
      notification: {
        title: notification.title || "সদাই ভাই",
        body: notification.body || "নতুন অফার এসেছে!"
      },
      data: data || {},
      tokens: activeTokens,
      webpush: {
        fcmOptions: {
          link: data?.url || '/'
        },
        notification: {
          icon: "/logo.png",
          badge: "/logo.png"
        }
      }
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    
    // Cleanup stale tokens
    if (response.failureCount > 0) {
      const staleTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          const code = resp.error.code;
          if (code === 'messaging/invalid-registration-token' || 
              code === 'messaging/registration-token-not-registered') {
            staleTokens.push(activeTokens[idx]);
          }
        }
      });
      
      if (staleTokens.length > 0) {
        const batch = db.batch();
        for (const token of staleTokens) {
          const staleSnapshot = await db.collection('fcmTokens').where('token', '==', token).get();
          staleSnapshot.forEach(doc => batch.delete(doc.ref));
        }
        await batch.commit();
      }
    }

    res.json({ 
      success: true, 
      successCount: response.successCount, 
      failureCount: response.failureCount
    });
  } catch (error: any) {
    res.status(500).json({ error: "FCM Broadcast Failed", details: error.message });
  }
});

app.post("/api/send-notification", async (req, res) => {
  const { subscription, payload } = req.body;
  if (!vapidKeys.privateKey) return res.status(400).json({ error: "Missing VAPID_PRIVATE_KEY" });
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
  const isVercel = !!(process.env.VERCEL || process.env.NOW_REGION || process.env.FUNCTIONS_EMULATOR);
  const isProd = process.env.NODE_ENV === "production";

  if (isVercel) {
    console.log("Running in Serverless environment - Port listener bypassed.");
    return;
  }

  if (!isProd) {
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) return res.status(404).json({ error: "API not found" });
      res.sendFile(path.join(distPath, 'index.html'));
    });
    
    const PORT = process.env.PORT || 3000;
    app.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`Production server running on port ${PORT}`);
    });
  }
}

startServer().catch(err => console.error("Server Start Error:", err));

app.get("/api/test-telegram", async (req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chatId) return res.json({ success: false, error: "Config missing" });

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: "⚡️ Neural Link Test Success",
        parse_mode: 'HTML'
      })
    });
    const data = await response.json();
    res.json({ success: response.ok, data });
  } catch (e: any) {
    res.json({ success: false, error: e.message });
  }
});

export default app;


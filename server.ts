import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import webpush from "web-push";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// VAPID Keys
const vapidKeys = {
  publicKey: process.env.VITE_VAPID_PUBLIC_KEY || "BLUaQ6p_En7RjF_9QTN__g6WVViX9r9eJfy16eiryt-GADsNg46gtyJNqxDDS7qeGyYCUkhkIjvkKRKvIRHgBRw",
  privateKey: process.env.VAPID_PRIVATE_KEY || "LooYGn1uk40EEC5vpuBLJ4Jsad0Wmpzt1AEFPM1cJ0g"
};

if (vapidKeys.publicKey && vapidKeys.privateKey) {
  webpush.setVapidDetails(
    "mailto:example@yourdomain.com",
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
}

// API Routes
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

// Production serving
if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

async function startServer() {
  const PORT = 3000;
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  // Only listen if not on Vercel
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;

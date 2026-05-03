import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import webpush from "web-push";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // VAPID Keys - Should be in .env but providing defaults for demo
  // Users can generate these using npx web-push generate-vapid-keys
  const vapidKeys = {
    publicKey: process.env.VITE_VAPID_PUBLIC_KEY || "BP80R2KTOd44MTHx8apVSgbQTZ_ky8Lr_c8MRyTEAtiq7jbvhRlV6fcjT3ABFpHtmOlefUR6s4CzRHK10RGYiQU",
    privateKey: process.env.VAPID_PRIVATE_KEY || ""
  };

  if (vapidKeys.publicKey && vapidKeys.privateKey) {
    webpush.setVapidDetails(
      "mailto:example@yourdomain.com",
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );
  }

  // API Route: Send Test Notification
  app.post("/api/send-notification", async (req, res) => {
    const { subscription, payload } = req.body;

    if (!vapidKeys.privateKey) {
      return res.status(400).json({ 
        error: "VAPID_PRIVATE_KEY is missing. Please set it in Settings -> Secrets." 
      });
    }

    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      res.json({ success: true, message: "Notification sent successfully!" });
    } catch (error) {
      console.error("Push error:", error);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // API Route: Get Public VAPID Key
  app.get("/api/vapid-public-key", (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

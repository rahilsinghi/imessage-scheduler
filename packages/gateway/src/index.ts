import cors from "cors";
import express, { type Request, type Response } from "express";
import { z } from "zod";
import { config } from "./config.js";
import { checkMessagesAvailable, sendMessage } from "./imessage.js";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const SendRequestSchema = z.object({
  messageId: z.string().min(1, "messageId is required"),
  phoneNumber: z.string().min(1, "phoneNumber is required"),
  content: z.string().min(1, "content is required"),
});

// ---------------------------------------------------------------------------
// Stats (in-memory, resets on restart)
// ---------------------------------------------------------------------------

interface GatewayStats {
  messagesSent: number;
  messagesFailed: number;
  lastSentAt: string | null;
}

const stats: GatewayStats = {
  messagesSent: 0,
  messagesFailed: 0,
  lastSentAt: null,
};

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = express();

app.use(cors());
app.use(express.json());

// Request logging
app.use((req: Request, _res: Response, next) => {
  console.log(`[gateway] ${req.method} ${req.path}`);
  next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    messagesSent: stats.messagesSent,
    messagesFailed: stats.messagesFailed,
    lastSentAt: stats.lastSentAt,
  });
});

app.post("/send", async (req: Request, res: Response) => {
  const parsed = SendRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    const errors = parsed.error.errors.map((e) => e.message).join(", ");
    res.status(400).json({ success: false, error: errors, messageId: req.body?.messageId ?? null });
    return;
  }

  const { messageId, phoneNumber, content } = parsed.data;

  console.log(`[gateway] Processing messageId=${messageId}`);

  const result = await sendMessage(phoneNumber, content);

  if (result.success) {
    stats.messagesSent += 1;
    stats.lastSentAt = new Date().toISOString();
    res.json({ success: true, messageId });
  } else {
    stats.messagesFailed += 1;
    res.status(502).json({ success: false, error: result.error, messageId });
  }
});

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

const start = async (): Promise<void> => {
  const messagesAvailable = await checkMessagesAvailable();

  if (messagesAvailable) {
    console.log("[gateway] Messages.app detected and running");
  } else {
    console.warn(
      "[gateway] WARNING: Messages.app is not running. " +
        "Send requests will fail until Messages is opened and signed in.",
    );
  }

  const server = app.listen(config.port, () => {
    console.log(`[gateway] Gateway ready on port ${config.port}`);
  });

  // Graceful shutdown
  const shutdown = (signal: string): void => {
    console.log(`[gateway] Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      console.log("[gateway] Server closed");
      process.exit(0);
    });

    // Force exit if close takes too long
    setTimeout(() => {
      console.error("[gateway] Forced shutdown after timeout");
      process.exit(1);
    }, 5_000);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

start();

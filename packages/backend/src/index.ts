import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { sqlite } from "./db/index.js";
import { messagesRouter, statsRouter, configRouter } from "./routes/messages.js";
import { errorHandler } from "./middleware/error-handler.js";
import { startWorker, stopWorker } from "./queue/worker.js";
import { getConfig } from "./services/message-service.js";

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);
app.use(express.json());

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use("/api/messages", messagesRouter);
app.use("/api/stats", statsRouter);
app.use("/api/config", configRouter);

// ─── Health Check ────────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ─── Error Handler (must be last) ────────────────────────────────────────────

app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────────────────────

const server = app.listen(config.port, () => {
  console.log(`[backend] Server listening on http://localhost:${config.port}`);
  console.log(`[backend] Gateway URL: ${config.gatewayUrl}`);

  // Load persisted config (merged with defaults)
  const queueConfig = getConfig();
  console.log(
    `[backend] Queue config — interval: ${queueConfig.sendIntervalMs}ms, batch: ${queueConfig.messagesPerTick}`
  );

  startWorker({
    sendIntervalMs: queueConfig.sendIntervalMs,
    messagesPerTick: queueConfig.messagesPerTick,
    gatewayUrl: config.gatewayUrl,
  });
});

// ─── Graceful Shutdown ───────────────────────────────────────────────────────

const shutdown = (signal: string): void => {
  console.log(`\n[backend] Received ${signal}, shutting down gracefully...`);
  stopWorker();

  server.close(() => {
    sqlite.close();
    console.log("[backend] Server closed");
    process.exit(0);
  });

  // Force exit after 5s if graceful shutdown stalls
  setTimeout(() => {
    console.error("[backend] Forced exit after timeout");
    process.exit(1);
  }, 5000);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

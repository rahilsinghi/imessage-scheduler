import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  createMessage,
  getMessages,
  getMessage,
  cancelMessage,
  getStats,
  getConfig,
  updateConfig,
} from "../services/message-service.js";
import { restartWorker } from "../queue/worker.js";

export const messagesRouter: IRouter = Router();
export const statsRouter: IRouter = Router();
export const configRouter: IRouter = Router();

// ─── Validation Schemas ──────────────────────────────────────────────────────

const createMessageSchema = z.object({
  phoneNumber: z
    .string()
    .min(1, "phoneNumber is required")
    .regex(/^\+?[0-9\s\-()]+$/, "Invalid phone number format"),
  content: z
    .string()
    .min(1, "content is required")
    .max(1600, "content exceeds 1600 character limit"),
  scheduledFor: z.string().datetime().optional(),
});

const updateConfigSchema = z.object({
  sendIntervalMs: z.number().int().min(1000).optional(),
  messagesPerTick: z.number().int().min(1).max(100).optional(),
});

const messageQuerySchema = z.object({
  status: z
    .enum(["QUEUED", "ACCEPTED", "SENT", "DELIVERED", "RECEIVED", "FAILED"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ─── Messages Routes ─────────────────────────────────────────────────────────

messagesRouter.post("/", (req, res, next) => {
  try {
    const parsed = createMessageSchema.parse(req.body);
    const scheduledForMs = parsed.scheduledFor
      ? new Date(parsed.scheduledFor).getTime()
      : undefined;
    const message = createMessage(parsed.phoneNumber, parsed.content, scheduledForMs);
    res.status(201).json({ data: message });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    next(error);
  }
});

messagesRouter.get("/", (req, res, next) => {
  try {
    const parsed = messageQuerySchema.parse(req.query);
    const result = getMessages({
      status: parsed.status,
      limit: parsed.limit,
      offset: parsed.offset,
    });
    res.json({ data: result.data, total: result.total });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    next(error);
  }
});

messagesRouter.get("/:id", (req, res) => {
  const message = getMessage(req.params.id);

  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  res.json({ data: message });
});

messagesRouter.delete("/:id", (req, res) => {
  const result = cancelMessage(req.params.id);

  if (!result.success) {
    const status = result.reason === "Message not found" ? 404 : 409;
    res.status(status).json({ error: result.reason });
    return;
  }

  res.json({ data: { success: true } });
});

// ─── Stats Route ─────────────────────────────────────────────────────────────

statsRouter.get("/", (_req, res) => {
  const stats = getStats();
  res.json({ data: stats });
});

// ─── Config Routes ───────────────────────────────────────────────────────────

configRouter.get("/", (_req, res) => {
  const cfg = getConfig();
  res.json({ data: cfg });
});

configRouter.put("/", (req, res, next) => {
  try {
    const parsed = updateConfigSchema.parse(req.body);

    if (parsed.sendIntervalMs === undefined && parsed.messagesPerTick === undefined) {
      res.status(400).json({ error: "At least one config field is required" });
      return;
    }

    const updated = updateConfig(parsed);

    restartWorker({
      sendIntervalMs: updated.sendIntervalMs,
      messagesPerTick: updated.messagesPerTick,
    });

    res.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    next(error);
  }
});

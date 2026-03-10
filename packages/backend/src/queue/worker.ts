import { eq, asc, and, or, lte, isNull, sql } from "drizzle-orm";
import { db, sqlite } from "../db/index.js";
import { messages, MessageStatus } from "../db/schema.js";
import { config as appConfig } from "../config.js";
import { updateMessageStatus } from "../services/message-service.js";

interface WorkerConfig {
  sendIntervalMs: number;
  messagesPerTick: number;
  gatewayUrl: string;
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;
let currentConfig: WorkerConfig;

const processQueue = async (): Promise<void> => {
  const batchSize = currentConfig.messagesPerTick;

  for (let i = 0; i < batchSize; i++) {
    const message = pickNextMessage();

    if (!message) {
      return;
    }

    console.log(
      `[queue] Processing message ${message.id} → ${message.phoneNumber}`
    );

    try {
      const response = await fetch(`${currentConfig.gatewayUrl}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: message.id,
          phoneNumber: message.phoneNumber,
          content: message.content,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(
          `[queue] Gateway returned ${response.status} for message ${message.id}: ${errorBody}`
        );
        updateMessageStatus(message.id, MessageStatus.FAILED);
        continue;
      }

      updateMessageStatus(message.id, MessageStatus.SENT, {
        sentAt: new Date(),
      });
      console.log(`[queue] Message ${message.id} sent successfully`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `[queue] Failed to send message ${message.id}: ${errorMessage}`
      );
      updateMessageStatus(message.id, MessageStatus.FAILED);
    }
  }
};

/**
 * Atomically picks the oldest QUEUED message and marks it ACCEPTED.
 * Uses a raw SQL transaction to guarantee FIFO ordering under concurrency.
 */
const pickNextMessage = (): {
  id: string;
  phoneNumber: string;
  content: string;
} | null => {
  const pickTransaction = sqlite.transaction(() => {
    const now = new Date();
    const row = db
      .select({
        id: messages.id,
        phoneNumber: messages.phoneNumber,
        content: messages.content,
      })
      .from(messages)
      .where(
        and(
          eq(messages.status, MessageStatus.QUEUED),
          or(
            isNull(messages.scheduledFor),
            lte(messages.scheduledFor, now)
          )
        )
      )
      .orderBy(asc(messages.scheduledFor))
      .limit(1)
      .get();

    if (!row) return null;

    db.update(messages)
      .set({
        status: MessageStatus.ACCEPTED,
        updatedAt: new Date(),
      })
      .where(eq(messages.id, row.id))
      .run();

    return row;
  });

  return pickTransaction();
};

export const startWorker = (overrides?: Partial<WorkerConfig>): void => {
  currentConfig = {
    sendIntervalMs: overrides?.sendIntervalMs ?? appConfig.sendIntervalMs,
    messagesPerTick: overrides?.messagesPerTick ?? appConfig.messagesPerTick,
    gatewayUrl: overrides?.gatewayUrl ?? appConfig.gatewayUrl,
  };

  if (intervalHandle) {
    clearInterval(intervalHandle);
  }

  intervalHandle = setInterval(() => {
    processQueue().catch((err) => {
      console.error("[queue] Unexpected error in processQueue:", err);
    });
  }, currentConfig.sendIntervalMs);

  console.log(
    `[queue] Worker started — interval: ${currentConfig.sendIntervalMs}ms, batch: ${currentConfig.messagesPerTick}`
  );
};

export const stopWorker = (): void => {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log("[queue] Worker stopped");
  }
};

export const restartWorker = (newConfig: Partial<WorkerConfig>): void => {
  console.log("[queue] Restarting worker with new config");
  stopWorker();
  startWorker({ ...currentConfig, ...newConfig });
};

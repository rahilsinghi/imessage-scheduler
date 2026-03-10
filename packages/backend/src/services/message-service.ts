import { eq, sql, desc, and, count } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/index.js";
import { messages, configTable, MessageStatus } from "../db/schema.js";
import type { Message } from "../db/schema.js";

export interface QueueConfig {
  sendIntervalMs: number;
  messagesPerTick: number;
}

export const createMessage = (
  phoneNumber: string,
  content: string,
  scheduledFor?: number
): Message => {
  const now = new Date();
  const id = uuidv4();
  const scheduledForDate = scheduledFor != null ? new Date(scheduledFor) : now;

  const rows = db
    .insert(messages)
    .values({
      id,
      phoneNumber,
      content,
      status: MessageStatus.QUEUED,
      scheduledAt: now,
      scheduledFor: scheduledForDate,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .all();

  console.log(`[message-service] Created message ${id} for ${phoneNumber} (scheduledFor: ${scheduledForDate.toISOString()})`);
  return rows[0];
};

export interface GetMessagesOptions {
  status?: string;
  limit?: number;
  offset?: number;
}

export interface GetMessagesResult {
  data: Message[];
  total: number;
}

export const getMessages = (options: GetMessagesOptions = {}): GetMessagesResult => {
  const { status, limit = 50, offset = 0 } = options;

  const conditions = status ? eq(messages.status, status) : undefined;

  const data = db
    .select()
    .from(messages)
    .where(conditions)
    .orderBy(desc(messages.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  const [{ total }] = db
    .select({ total: count() })
    .from(messages)
    .where(conditions)
    .all();

  return { data, total };
};

export const getMessage = (id: string): Message | undefined => {
  return db.select().from(messages).where(eq(messages.id, id)).get();
};

export const cancelMessage = (id: string): { success: boolean; reason?: string } => {
  const existing = getMessage(id);

  if (!existing) {
    return { success: false, reason: "Message not found" };
  }

  if (existing.status !== MessageStatus.QUEUED) {
    return {
      success: false,
      reason: `Cannot cancel message with status ${existing.status}`,
    };
  }

  db.delete(messages).where(
    and(eq(messages.id, id), eq(messages.status, MessageStatus.QUEUED))
  ).run();

  console.log(`[message-service] Cancelled message ${id}`);
  return { success: true };
};

export interface StatusUpdateExtras {
  sentAt?: Date;
  deliveredAt?: Date;
}

export const updateMessageStatus = (
  id: string,
  status: MessageStatus,
  extras: StatusUpdateExtras = {}
): Message | undefined => {
  const updatePayload: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  };

  if (extras.sentAt) {
    updatePayload.sentAt = extras.sentAt;
  }
  if (extras.deliveredAt) {
    updatePayload.deliveredAt = extras.deliveredAt;
  }

  const rows = db
    .update(messages)
    .set(updatePayload)
    .where(eq(messages.id, id))
    .returning()
    .all();

  return rows[0];
};

export interface MessageStats {
  queued: number;
  accepted: number;
  sent: number;
  delivered: number;
  failed: number;
  total: number;
}

export const getStats = (): MessageStats => {
  const rows = db
    .select({
      status: messages.status,
      count: count(),
    })
    .from(messages)
    .groupBy(messages.status)
    .all();

  const stats: MessageStats = {
    queued: 0,
    accepted: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    total: 0,
  };

  for (const row of rows) {
    const key = row.status.toLowerCase() as keyof Omit<MessageStats, "total">;
    if (key in stats) {
      stats[key] = row.count;
    }
    stats.total += row.count;
  }

  return stats;
};

export const getConfig = (): QueueConfig => {
  const rows = db.select().from(configTable).all();
  const configMap = new Map(rows.map((r) => [r.key, r.value]));

  return {
    sendIntervalMs: configMap.has("sendIntervalMs")
      ? parseInt(configMap.get("sendIntervalMs")!, 10)
      : 3_600_000,
    messagesPerTick: configMap.has("messagesPerTick")
      ? parseInt(configMap.get("messagesPerTick")!, 10)
      : 1,
  };
};

export const updateConfig = (updates: Partial<QueueConfig>): QueueConfig => {
  const entries = Object.entries(updates).filter(
    ([, value]) => value !== undefined
  );

  for (const [key, value] of entries) {
    db.insert(configTable)
      .values({ key, value: String(value) })
      .onConflictDoUpdate({
        target: configTable.key,
        set: { value: String(value) },
      })
      .run();
  }

  console.log(`[message-service] Updated config: ${JSON.stringify(updates)}`);
  return getConfig();
};

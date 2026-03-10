import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const MessageStatus = {
  QUEUED: "QUEUED",
  ACCEPTED: "ACCEPTED",
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  RECEIVED: "RECEIVED",
  FAILED: "FAILED",
} as const;

export type MessageStatus = (typeof MessageStatus)[keyof typeof MessageStatus];

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  phoneNumber: text("phone_number").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default(MessageStatus.QUEUED),
  scheduledAt: integer("scheduled_at", { mode: "timestamp_ms" }).notNull(),
  scheduledFor: integer("scheduled_for", { mode: "timestamp_ms" }),
  sentAt: integer("sent_at", { mode: "timestamp_ms" }),
  deliveredAt: integer("delivered_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const configTable = sqliteTable("config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type ConfigRow = typeof configTable.$inferSelect;

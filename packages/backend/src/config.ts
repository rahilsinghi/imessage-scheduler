import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, "../.env") });

export interface AppConfig {
  readonly port: number;
  readonly databaseUrl: string;
  readonly gatewayUrl: string;
  readonly sendIntervalMs: number;
  readonly messagesPerTick: number;
}

const parseIntWithDefault = (value: string | undefined, fallback: number): number => {
  if (value === undefined) return fallback;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const config: AppConfig = {
  port: parseIntWithDefault(process.env.PORT, 3001),
  databaseUrl: process.env.DATABASE_URL ?? path.resolve(__dirname, "../data/messages.db"),
  gatewayUrl: process.env.GATEWAY_URL ?? "http://localhost:3002",
  sendIntervalMs: parseIntWithDefault(process.env.SEND_INTERVAL_MS, 3_600_000),
  messagesPerTick: parseIntWithDefault(process.env.MESSAGES_PER_TICK, 1),
};

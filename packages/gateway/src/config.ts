import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, "../.env") });

export interface GatewayConfig {
  readonly port: number;
}

const parseIntWithDefault = (value: string | undefined, fallback: number): number => {
  if (value === undefined) return fallback;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const config: GatewayConfig = {
  port: parseIntWithDefault(process.env.GATEWAY_PORT, 3002),
};

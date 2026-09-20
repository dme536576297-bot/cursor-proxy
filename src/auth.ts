import type { IncomingMessage } from "node:http";
import { config } from "./config.js";

export function checkBridgeToken(req: IncomingMessage): boolean {
  const header = req.headers.authorization ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(header);
  const bearer = m?.[1]?.trim() ?? "";
  const apiKey = String(req.headers["x-api-key"] ?? "").trim();
  return bearer === config.bridgeToken || apiKey === config.bridgeToken;
}

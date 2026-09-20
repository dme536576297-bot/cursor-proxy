import type { IncomingMessage, ServerResponse } from "node:http";

export async function readBodyJson<T = unknown>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {} as T;
  return JSON.parse(raw) as T;
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(data),
  });
  res.end(data);
}

export function sendUnauthorized(res: ServerResponse): void {
  sendJson(res, 401, {
    error: {
      message: "Invalid token. Use Authorization: Bearer <BRIDGE_TOKEN> or x-api-key.",
      type: "authentication_error",
    },
  });
}

export function sendMethodNotAllowed(res: ServerResponse): void {
  sendJson(res, 405, {
    error: { message: "Method not allowed", type: "invalid_request_error" },
  });
}

import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Backend } from "../adapters/index.js";
import { contentToText } from "../adapters/index.js";
import { readBodyJson, sendJson } from "../http.js";

type AnthropicBody = {
  model?: string;
  system?: unknown;
  messages?: Array<{ role: string; content: unknown }>;
  stream?: boolean;
  max_tokens?: number;
};

function systemToText(system: unknown): string | undefined {
  if (!system) return undefined;
  if (typeof system === "string") return system;
  return contentToText(system);
}

export async function anthropicMessages(
  req: IncomingMessage,
  res: ServerResponse,
  backend: Backend,
): Promise<void> {
  const body = await readBodyJson<AnthropicBody>(req);
  const model = body.model || "cursor-auto";
  const mapped = (body.messages ?? []).map((m) => ({
    role: m.role,
    content: contentToText(m.content),
  }));
  const result = await backend.generate({
    model,
    system: systemToText(body.system),
    messages: mapped,
    maxTokens: body.max_tokens,
  });

  const id = `msg_${randomUUID().replace(/-/g, "").slice(0, 24)}`;

  if (body.stream) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    const ev = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    ev("message_start", {
      type: "message_start",
      message: {
        id,
        type: "message",
        role: "assistant",
        content: [],
        model: result.model,
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 0, output_tokens: 0 },
      },
    });
    ev("content_block_start", {
      type: "content_block_start",
      index: 0,
      content_block: { type: "text", text: "" },
    });
    const size = 48;
    for (let i = 0; i < result.text.length; i += size) {
      ev("content_block_delta", {
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text: result.text.slice(i, i + size) },
      });
    }
    ev("content_block_stop", { type: "content_block_stop", index: 0 });
    ev("message_delta", {
      type: "message_delta",
      delta: { stop_reason: "end_turn", stop_sequence: null },
      usage: { output_tokens: 0 },
    });
    ev("message_stop", { type: "message_stop" });
    res.end();
    return;
  }

  sendJson(res, 200, {
    id,
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: result.text }],
    model: result.model,
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 0, output_tokens: 0 },
  });
}

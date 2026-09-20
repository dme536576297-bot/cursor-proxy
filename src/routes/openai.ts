import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Backend } from "../adapters/index.js";
import { contentToText } from "../adapters/index.js";
import { MODEL_ALIASES } from "../config.js";
import { readBodyJson, sendJson } from "../http.js";

type OpenAIChatBody = {
  model?: string;
  messages?: Array<{ role: string; content: unknown }>;
  stream?: boolean;
  max_tokens?: number;
};

export function listModels(_req: IncomingMessage, res: ServerResponse): void {
  sendJson(res, 200, {
    object: "list",
    data: MODEL_ALIASES.map((m) => ({
      id: m.id,
      object: "model",
      created: 0,
      owned_by: m.owned_by,
    })),
  });
}

export async function chatCompletions(
  req: IncomingMessage,
  res: ServerResponse,
  backend: Backend,
): Promise<void> {
  const body = await readBodyJson<OpenAIChatBody>(req);
  const model = body.model || "cursor-auto";
  const messages = (body.messages ?? []).map((m) => ({
    role: m.role,
    content: contentToText(m.content),
  }));
  const systemParts = messages.filter((m) => m.role === "system").map((m) => m.content);
  const rest = messages.filter((m) => m.role !== "system");
  const result = await backend.generate({
    model,
    system: systemParts.join("\n") || undefined,
    messages: rest,
    maxTokens: body.max_tokens,
  });

  const id = `chatcmpl_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const created = Math.floor(Date.now() / 1000);

  if (body.stream) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    const write = (obj: unknown) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
    write({
      id,
      object: "chat.completion.chunk",
      created,
      model: result.model,
      choices: [{ index: 0, delta: { role: "assistant", content: "" }, finish_reason: null }],
    });
    const size = 48;
    for (let i = 0; i < result.text.length; i += size) {
      write({
        id,
        object: "chat.completion.chunk",
        created,
        model: result.model,
        choices: [
          { index: 0, delta: { content: result.text.slice(i, i + size) }, finish_reason: null },
        ],
      });
    }
    write({
      id,
      object: "chat.completion.chunk",
      created,
      model: result.model,
      choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
    });
    res.write("data: [DONE]\n\n");
    res.end();
    return;
  }

  sendJson(res, 200, {
    id,
    object: "chat.completion",
    created,
    model: result.model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: result.text },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  });
}

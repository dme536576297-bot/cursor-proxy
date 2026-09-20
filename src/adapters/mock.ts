import type { Backend, GenerateInput, GenerateResult } from "./types.js";

export class MockBackend implements Backend {
  readonly name = "mock";

  async generate(input: GenerateInput): Promise<GenerateResult> {
    const lastUser = [...input.messages].reverse().find((m) => m.role === "user");
    const snippet = (lastUser?.content ?? "").slice(0, 160).replace(/\s+/g, " ");
    const text =
      `[cursor-proxy mock] model=${input.model}\n` +
      `Echo: ${snippet || "(empty)"}\n\n` +
      `Set BACKEND=cursor-agent and ensure cursor-agent is logged in to use Cursor.`;
    return { text, model: input.model || "cursor-auto" };
  }
}

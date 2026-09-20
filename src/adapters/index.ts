import { config } from "../config.js";
import { CursorAgentBackend } from "./cursor-agent.js";
import { MockBackend } from "./mock.js";
import type { Backend } from "./types.js";

export function createBackend(): Backend {
  if (config.backend === "cursor-agent") return new CursorAgentBackend();
  return new MockBackend();
}

export type { Backend, ChatMessage, GenerateInput, GenerateResult } from "./types.js";
export { contentToText, flattenPrompt } from "./prompt.js";

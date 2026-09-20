import type { ChatMessage } from "./types.js";

export function flattenPrompt(system: string | undefined, messages: ChatMessage[]): string {
  const parts: string[] = [];
  if (system?.trim()) parts.push(`System:\n${system.trim()}`);
  for (const m of messages) parts.push(`${m.role || "user"}:\n${m.content}`);
  parts.push("assistant:");
  return parts.join("\n\n");
}

export function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === "string") return block;
        if (block && typeof block === "object") {
          const b = block as Record<string, unknown>;
          if (typeof b.text === "string") return b.text;
          if (typeof b.content === "string") return b.content;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  if (content == null) return "";
  return String(content);
}

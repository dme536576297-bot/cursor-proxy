export type BackendKind = "mock" | "cursor-agent";

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export const config = {
  host: env("HOST", "127.0.0.1"),
  port: Number(env("PORT", "8787")) || 8787,
  bridgeToken: env("BRIDGE_TOKEN", "local-dev-token"),
  backend: (env("BACKEND", "mock") as BackendKind) || "mock",
  cursorAgentBin: env("CURSOR_AGENT_BIN", "cursor-agent"),
  workspaceDir: env("WORKSPACE_DIR", process.cwd()),
};

export const MODEL_ALIASES = [
  { id: "cursor-auto", owned_by: "cursor-proxy" },
  { id: "cursor-sonnet", owned_by: "cursor-proxy" },
  { id: "cursor-gpt", owned_by: "cursor-proxy" },
] as const;

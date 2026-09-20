import { spawn } from "node:child_process";
import { config } from "../config.js";
import type { Backend, GenerateInput, GenerateResult } from "./types.js";
import { flattenPrompt } from "./prompt.js";

/** Spawns Cursor Agent CLI. No private cloud HTTP / cookie scraping. */
export class CursorAgentBackend implements Backend {
  readonly name = "cursor-agent";

  async generate(input: GenerateInput): Promise<GenerateResult> {
    const prompt = flattenPrompt(input.system, input.messages);
    const args = buildArgs(prompt);
    const { stdout, stderr, code } = await runProcess(config.cursorAgentBin, args, {
      cwd: config.workspaceDir,
      timeoutMs: 10 * 60 * 1000,
    });
    if (code !== 0 && !stdout.trim()) {
      throw new Error(
        `cursor-agent exited ${code}: ${stderr.slice(0, 500) || "no stderr"}\n` +
          `Tried: ${config.cursorAgentBin} ${args.join(" ")}`,
      );
    }
    return {
      text: stdout.trim() || stderr.trim() || "(empty cursor-agent output)",
      model: input.model || "cursor-auto",
    };
  }
}

function buildArgs(prompt: string): string[] {
  const fromEnv = process.env.CURSOR_AGENT_ARGS?.trim();
  if (fromEnv) return [...fromEnv.split(/\s+/).filter(Boolean), prompt];
  return ["-p", "--output-format", "text", prompt];
}

function runProcess(
  bin: string,
  args: string[],
  opts: { cwd: string; timeoutMs: number },
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      cwd: opts.cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`cursor-agent timed out after ${opts.timeoutMs}ms`));
    }, opts.timeoutMs);
    child.stdout.on("data", (d: Buffer) => {
      stdout += d.toString("utf8");
    });
    child.stderr.on("data", (d: Buffer) => {
      stderr += d.toString("utf8");
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code });
    });
  });
}

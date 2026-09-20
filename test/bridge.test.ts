import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import test from "node:test";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = 8799;
const TOKEN = "test-token";
const BASE = `http://127.0.0.1:${PORT}`;

async function withServer(fn: () => Promise<void>): Promise<void> {
  const child: ChildProcess = spawn(process.execPath, ["dist/server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(PORT),
      BRIDGE_TOKEN: TOKEN,
      BACKEND: "mock",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`${BASE}/health`);
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {
      // retry
    }
    await sleep(50);
  }
  if (!ready) {
    child.kill("SIGTERM");
    throw new Error("server did not become ready");
  }
  try {
    await fn();
  } finally {
    child.kill("SIGTERM");
    await Promise.race([once(child, "exit"), sleep(2000)]);
  }
}

test("health is open", async () => {
  await withServer(async () => {
    const r = await fetch(`${BASE}/health`);
    assert.equal(r.status, 200);
    const j = (await r.json()) as { ok: boolean; backend: string };
    assert.equal(j.ok, true);
    assert.equal(j.backend, "mock");
  });
});

test("rejects missing token", async () => {
  await withServer(async () => {
    const r = await fetch(`${BASE}/v1/models`);
    assert.equal(r.status, 401);
  });
});

test("openai chat completions mock", async () => {
  await withServer(async () => {
    const r = await fetch(`${BASE}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "cursor-auto",
        messages: [{ role: "user", content: "hello bridge" }],
      }),
    });
    assert.equal(r.status, 200);
    const j = (await r.json()) as { choices: Array<{ message: { content: string } }> };
    assert.match(j.choices[0]!.message.content, /hello bridge/);
  });
});

test("anthropic messages mock", async () => {
  await withServer(async () => {
    const r = await fetch(`${BASE}/v1/messages`, {
      method: "POST",
      headers: {
        "x-api-key": TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "cursor-auto",
        max_tokens: 256,
        messages: [{ role: "user", content: "ping anthropic" }],
      }),
    });
    assert.equal(r.status, 200);
    const j = (await r.json()) as { content: Array<{ type: string; text: string }> };
    assert.equal(j.content[0]!.type, "text");
    assert.match(j.content[0]!.text, /ping anthropic/);
  });
});

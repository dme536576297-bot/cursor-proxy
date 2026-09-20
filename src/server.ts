import http from "node:http";
import { createBackend } from "./adapters/index.js";
import { checkBridgeToken } from "./auth.js";
import { config } from "./config.js";
import { sendJson, sendMethodNotAllowed, sendUnauthorized } from "./http.js";
import { anthropicMessages } from "./routes/anthropic.js";
import { chatCompletions, listModels } from "./routes/openai.js";

const backend = createBackend();

const server = http.createServer(async (req, res) => {
  try {
    const host = req.headers.host ?? `${config.host}:${config.port}`;
    const url = new URL(req.url ?? "/", `http://${host}`);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (req.method === "GET" && (path === "/health" || path === "/")) {
      sendJson(res, 200, {
        ok: true,
        name: "cursor-proxy",
        backend: backend.name,
        bind: `${config.host}:${config.port}`,
      });
      return;
    }

    if (!checkBridgeToken(req)) {
      sendUnauthorized(res);
      return;
    }

    if (req.method === "GET" && (path === "/v1/models" || path === "/models")) {
      listModels(req, res);
      return;
    }

    if (path === "/v1/chat/completions" || path === "/chat/completions") {
      if (req.method !== "POST") return sendMethodNotAllowed(res);
      await chatCompletions(req, res, backend);
      return;
    }

    if (path === "/v1/messages" || path === "/messages") {
      if (req.method !== "POST") return sendMethodNotAllowed(res);
      await anthropicMessages(req, res, backend);
      return;
    }

    sendJson(res, 404, {
      error: {
        message: `No route for ${req.method} ${path}`,
        type: "invalid_request_error",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sendJson(res, 500, { error: { message, type: "api_error" } });
  }
});

server.listen(config.port, config.host, () => {
  console.log(`[cursor-proxy] http://${config.host}:${config.port} backend=${backend.name}`);
});

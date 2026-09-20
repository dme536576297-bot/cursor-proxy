# cursor-proxy

本地协议桥：让 **Claude Code** / **Codex** 的 Agent UI 打到本机兼容 API，再转发到 **Cursor Agent CLI**（或 mock）。

> 非正式 Cursor 产品。不是官方「裸模型推理 API」。请自行确认是否符合 Cursor 服务条款。本项目只封装已登录的 `cursor-agent` CLI，不抓 Cookie、不逆向私有云 HTTP。

## 架构

```
Claude Code  ──ANTHROPIC_BASE_URL──┐
                                   ├──► cursor-proxy (127.0.0.1)
Codex        ──OPENAI_BASE_URL─────┘            │
                                                ▼
                                      mock | cursor-agent CLI
```

## 快速开始

```bash
cd cursor-proxy
npm install
cp .env.example .env
npm run dev          # mock 后端，默认 http://127.0.0.1:8787
curl http://127.0.0.1:8787/health
```

鉴权：`Authorization: Bearer <BRIDGE_TOKEN>` 或 `x-api-key: <BRIDGE_TOKEN>`。

## Claude Code

```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:8787
export ANTHROPIC_API_KEY=local-dev-token   # 与 BRIDGE_TOKEN 一致
# 然后正常使用 Claude Code；请求会打到 /v1/messages
```

## Codex

`~/.codex/config.toml` 示例：

```toml
[model_providers.cursor_proxy]
name = "cursor-proxy"
base_url = "http://127.0.0.1:8787/v1"
wire_api = "chat_completions"
env_key = "CURSOR_PROXY_TOKEN"

[profiles.cursor]
model_provider = "cursor_proxy"
model = "cursor-auto"
```

```bash
export CURSOR_PROXY_TOKEN=local-dev-token
codex --profile cursor
```

## 切到真实 Cursor Agent

1. 本机安装并登录 `cursor-agent`（以你机器上的 CLI 名为准）
2. `export BACKEND=cursor-agent`
3. 若参数不兼容：`export CURSOR_AGENT_ARGS='-p --output-format text'`（按 `cursor-agent --help` 调整）
4. 可选：`WORKSPACE_DIR=/path/to/repo`

## 脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | tsx 热重载 |
| `npm run build` | 编译到 `dist/` |
| `npm start` | 跑编译产物 |
| `npm test` | 集成测试（mock） |

## 限制

- 只绑定 `127.0.0.1`
- Agent 工具链 / 索引能力取决于 `cursor-agent`，不是完整复刻 Cursor IDE
- 流式为兼容性 SSE；usage 计数为占位
- 不保证 Claude Code / Codex 每个版本的全部字段

## License

MIT

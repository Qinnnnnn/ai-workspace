# Codenano API

Node.js HTTP/WebSocket service that wraps the [codenano](https://github.com/Adamlixi/codenano) SDK for building AI coding agents.

## Overview

This service exposes the full codenano SDK capability via HTTP API, enabling Python clients (ML pipelines, data processing services) to interact with AI agents over HTTP.

```
┌─────────────┐    HTTP     ┌────────────────┐
│   Python    │  ─────────► │  Codenano API  │
│   Client   │  ◄───────── │  (Fastify)    │
└─────────────┘   SSE/WS    └───────┬────────┘
                                    │
                                    ▼
                            ┌──────────────┐
                            │  codenano    │
                            │     SDK      │
                            └──────────────┘
```

## Features

- **Full AgentConfig surface** — All codenano SDK options exposed via HTTP
- **Session management** — Create, list, get, delete sessions with TTL
- **Streaming responses** — SSE for real-time agent events
- **Hook callbacks** — WebSocket for `onPreToolUse`, `onTurnEnd`, etc.
- **Tool permissions** — Rule-based allow/deny/ask per tool
- **Memory API** — Cross-session memory operations
- **MCP integration** — Connect and manage MCP servers

## Setup

```bash
cd agent-service
npm install
```

Create a `.env` file:

```env
ANTHROPIC_AUTH_TOKEN=sk-ant-your-api-key
ANTHROPIC_MODEL=claude-sonnet-4-6
LOG_LEVEL=INFO
AGENT_SERVICE_PORT=8000
SB_TTL_MINUTES=30
```

## Running

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Reference

### Sessions

#### Create Session

```bash
POST /api/v1/sessions
Content-Type: application/json

{
  "config": {
    "model": "claude-sonnet-4-6",
    "toolPreset": "core"
  },
  "hooks": ["onPreToolUse"],
  "toolPermissions": {
    "Bash": "deny"
  }
}
```

Response:
```json
{ "sessionId": "uuid" }
```

#### Send Message

```bash
POST /api/v1/sessions/:id/message
Content-Type: application/json

{
  "prompt": "Write a hello world program",
  "stream": true
}
```

Stream response (SSE):
```
data: {"type":"query_start","queryTracking":{...}}
data: {"type":"text","text":"Hello"}
data: {"type":"tool_use","toolName":"Bash",...}
data: {"type":"result","result":{...}}
```

Non-streaming response:
```json
{
  "result": {
    "text": "...",
    "usage": {...},
    "stopReason": "end_turn",
    ...
  }
}
```

#### Get Session

```bash
GET /api/v1/sessions/:id
```

Response:
```json
{
  "sessionId": "uuid",
  "createdAt": "2026-04-20T10:00:00Z",
  "lastActivity": "2026-04-20T10:05:00Z",
  "historyLength": 5
}
```

#### List Sessions

```bash
GET /api/v1/sessions
```

Response:
```json
{
  "sessions": [
    { "sessionId": "uuid1", "createdAt": "...", "lastActivity": "..." },
    { "sessionId": "uuid2", "createdAt": "...", "lastActivity": "..." }
  ]
}
```

#### Delete Session

```bash
DELETE /api/v1/sessions/:id
```

Response: `{ "ok": true }`

#### Get History

```bash
GET /api/v1/sessions/:id/history
```

Response:
```json
{
  "history": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": [{"type": "text", "text": "Hi"}] }
  ]
}
```

### Hooks (WebSocket)

Connect to receive hook events:

```bash
GET /ws/sessions/:id/hooks
```

Register hooks:
```json
{ "type": "register_hook", "hooks": ["onPreToolUse", "onTurnEnd"] }
```

Receive hook events:
```json
{
  "type": "hook_event",
  "hookId": "uuid",
  "hookType": "onPreToolUse",
  "data": { "toolName": "Bash", "toolInput": {...} }
}
```

Respond with decision:
```json
{
  "type": "hook_decision",
  "hookId": "uuid",
  "decision": { "behavior": "allow" }
}
```

Or deny:
```json
{
  "type": "hook_decision",
  "hookId": "uuid",
  "decision": { "behavior": "deny", "message": "Not allowed" }
}
```

Ping/pong for keepalive:
```json
{ "type": "ping" }
→ { "type": "pong" }
```

### Memory

#### Save Memory

```bash
POST /api/v1/memory
Content-Type: application/json

{
  "key": "project-context",
  "content": "This is a Python ML project",
  "type": "context"
}
```

Response: `{ "ok": true }`

#### Load Memory

```bash
GET /api/v1/memory/project-context
```

Response:
```json
{
  "name": "project-context",
  "description": "project-context",
  "type": "context",
  "content": "This is a Python ML project"
}
```

#### List Memories

```bash
GET /api/v1/memory
GET /api/v1/memory?pattern=project-*
```

Response:
```json
{
  "memories": [
    { "name": "...", "description": "...", "type": "...", "content": "..." }
  ]
}
```

#### Delete Memory

```bash
DELETE /api/v1/memory/project-context
```

Response: `{ "ok": true }`

### MCP Servers

#### Connect MCP Server

```bash
POST /api/v1/mcp/connect
Content-Type: application/json

{
  "serverId": "my-server",
  "config": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"]
  }
}
```

Response: `{ "ok": true, "serverId": "my-server" }`

#### List MCP Tools

```bash
GET /api/v1/mcp/tools
```

Response:
```json
{
  "tools": [
    { "serverId": "my-server", "tools": [...] }
  ]
}
```

#### Call MCP Tool

```bash
POST /api/v1/mcp/tools/call
Content-Type: application/json

{
  "serverId": "my-server",
  "toolName": "read_file",
  "toolInput": { "path": "/workspace/file.txt" }
}
```

Response:
```json
{
  "result": {
    "content": "file contents...",
    "isError": false
  }
}
```

#### Disconnect MCP Server

```bash
DELETE /api/v1/mcp/my-server
```

Response: `{ "ok": true }`

## AgentConfig Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `model` | string | `claude-sonnet-4-6` | Claude model |
| `toolPreset` | `core\|extended\|all` | `core` | Built-in tool set |
| `maxTurns` | number | `30` | Max agent loop turns |
| `thinkingConfig` | `adaptive\|disabled` | `disabled` | Thinking mode |
| `maxOutputTokens` | number | `16384` | Max output per call |
| `systemPrompt` | string | - | Custom system prompt |
| `identity` | string | - | Agent identity |
| `language` | string | - | Response language |
| `autoCompact` | boolean | `true` | Auto-compact context |
| `fallbackModel` | string | - | Fallback on 529 errors |
| `mcpServers` | array | - | MCP server configs |
| `persistence` | object | - | Session persistence |
| `memory` | object | - | Memory configuration |

## Tool Permissions

Control tool execution with rule-based permissions:

```json
{
  "toolPermissions": {
    "Bash": "deny",
    "FileWrite": "ask",
    "FileRead": "allow"
  }
}
```

- `allow` — Execute without prompting
- `deny` — Block execution, return error
- `ask` — Send hook event via WebSocket

Default: `ask` for unspecified tools.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_AUTH_TOKEN` | Yes | - | Anthropic API key |
| `ANTHROPIC_BASE_URL` | No | - | Custom API endpoint |
| `ANTHROPIC_MODEL` | No | `claude-sonnet-4-6` | Default model |
| `LOG_LEVEL` | No | `INFO` | Logging level |
| `AGENT_SERVICE_PORT` | No | `8000` | HTTP port |
| `SB_TTL_MINUTES` | No | `30` | Session TTL |

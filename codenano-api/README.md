# Codenano API

A production-ready Node.js HTTP/WebSocket service providing direct integration with the [codenano](https://github.com/Adamlixi/codenano) SDK for building AI-powered coding agents.

## Overview

Codenano API exposes the complete codenano SDK capabilities via a RESTful HTTP interface with WebSocket support for real-time events. This architecture enables seamless integration with Python clients, ML pipelines, and external services while maintaining full access to codenano's agent capabilities.

```
┌─────────────────┐       HTTP/WebSocket        ┌────────────────────┐
│   Python CLI    │  ───────────────────────►  │   Codenano API     │
│   Pipeline      │  ◄───────────────────────  │   (Fastify)        │
└─────────────────┘        SSE/WS             └─────────┬──────────┘
                                                        │
                                                        │ Direct Import
                                                        ▼
                                              ┌────────────────────┐
                                              │     codenano       │
                                              │       SDK          │
                                              └────────────────────┘
```

## Architecture

This service implements direct TypeScript library integration with codenano, replacing traditional subprocess orchestration:

- **No bwrap sandbox** — Workspace isolation provided by codenano's built-in path-guard
- **No subprocess overhead** — In-process agent execution reduces latency
- **Full SDK access** — Complete API surface without protocol translation

## Capabilities

| Category | Features |
|----------|----------|
| **Session Management** | Create, list, retrieve, delete sessions with TTL-based auto-cleanup |
| **Real-time Streaming** | Server-Sent Events (SSE) for message streaming and tool execution progress |
| **Hook System** | WebSocket-based permission callbacks (`onPreToolUse`, `onTurnEnd`, etc.) |
| **Tool Control** | Rule-based allow/deny/ask permissions per tool |
| **Memory** | Cross-session memory persistence via SDK storage |
| **MCP Integration** | Connect, manage, and call Model Context Protocol servers |
| **Custom Tools** | Runtime tool definition and registration |
| **Cost Tracking** | Model pricing lookup and usage cost calculation |
| **Git Integration** | Repository state queries for context injection |
| **Skills** | Skill file discovery, loading, and template expansion |

## Requirements

- Node.js >= 18
- Anthropic API key (`ANTHROPIC_AUTH_TOKEN`)

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file:

```env
ANTHROPIC_AUTH_TOKEN=sk-ant-your-api-key
ANTHROPIC_MODEL=claude-sonnet-4-6
LOG_LEVEL=info
AGENT_SERVICE_PORT=8000
SB_TTL_MINUTES=30
CODENANO_WORKSPACE=/path/to/workspace
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_AUTH_TOKEN` | Yes | — | Anthropic API key |
| `ANTHROPIC_BASE_URL` | No | `https://api.anthropic.com` | API endpoint |
| `ANTHROPIC_MODEL` | No | `claude-sonnet-4-6` | Default model |
| `LOG_LEVEL` | No | `info` | Logging level |
| `AGENT_SERVICE_PORT` | No | `8000` | Service port |
| `SB_TTL_MINUTES` | No | `30` | Session TTL (minutes) |
| `CODENANO_WORKSPACE` | No | `/` | Workspace root for path validation |

## Quick Start

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

```http
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
{ "sessionId": "550e8400-e29b-41d4-a716-446655440000" }
```

#### Send Message

```http
POST /api/v1/sessions/:id/message
Content-Type: application/json

{
  "prompt": "Explain this function",
  "stream": true
}
```

**Streaming response (SSE):**
```
data: {"type":"query_start","sessionId":"...","turnIndex":0}
data: {"type":"text","text":"This function..."}
data: {"type":"tool_use","tool":"Bash","input":{"command":"ls"}}
data: {"type":"tool_result","tool":"Bash","result":"..."}
data: {"type":"result","text":"...","usage":{...},"stopReason":"end_turn"}
```

**Non-streaming response:**
```json
{
  "result": {
    "text": "...",
    "usage": {"inputTokens": 100, "outputTokens": 200},
    "stopReason": "end_turn"
  }
}
```

#### Session Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/sessions` | List all sessions |
| `GET` | `/api/v1/sessions/:id` | Get session metadata |
| `GET` | `/api/v1/sessions/:id/history` | Get conversation history |
| `DELETE` | `/api/v1/sessions/:id` | Delete session |

### Hook WebSocket

Connect to receive and respond to agent hooks:

```http
GET /ws/sessions/:id/hooks
```

**Register hooks:**
```json
{ "type": "register_hook", "hooks": ["onPreToolUse", "onTurnEnd"] }
```

**Receive hook event:**
```json
{
  "type": "hook_event",
  "hookId": "uuid",
  "hookType": "onPreToolUse",
  "data": { "toolName": "Bash", "toolInput": {...} }
}
```

**Respond with decision:**
```json
{ "type": "hook_decision", "hookId": "uuid", "decision": { "behavior": "allow" } }
```

### Memory

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/memory` | Save memory |
| `GET` | `/api/v1/memory` | List memories |
| `GET` | `/api/v1/memory/:key` | Get memory |
| `DELETE` | `/api/v1/memory/:key` | Delete memory |

### MCP Servers

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/mcp/connect` | Connect MCP server |
| `GET` | `/api/v1/mcp/tools` | List MCP tools |
| `POST` | `/api/v1/mcp/tools/call` | Call MCP tool |
| `DELETE` | `/api/v1/mcp/:serverId` | Disconnect server |

### Tools

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/tools` | Define custom tool |
| `GET` | `/api/v1/tools` | List custom tools |
| `GET` | `/api/v1/tools/:name` | Get tool |
| `DELETE` | `/api/v1/tools/:name` | Delete tool |

### Cost

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/cost/pricing` | Get model pricing |
| `POST` | `/api/v1/cost/calculate` | Calculate usage cost |

### Git

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/git/state` | Get repository state |

### Skills

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/skills` | List skills |
| `GET` | `/api/v1/skills/:name` | Get skill content |
| `POST` | `/api/v1/skills/expand` | Expand skill template |

## AgentConfig Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `model` | string | `claude-sonnet-4-6` | Claude model |
| `toolPreset` | `core\|extended\|all` | `core` | Tool preset |
| `maxTurns` | number | — | Max conversation turns |
| `thinkingConfig` | `adaptive\|disabled` | `disabled` | Thinking mode |
| `maxOutputTokens` | number | `16384` | Max output tokens |
| `mcpServers` | array | — | MCP server configs |
| `persistence` | object | — | Session persistence settings |
| `memory` | object | — | Memory configuration |

## Tool Permissions

Control tool execution with permission rules:

| Mode | Behavior |
|------|----------|
| `allow` | Execute without notification |
| `deny` | Block execution |
| `ask` | Send WebSocket hook event (default) |

Example:
```json
{
  "toolPermissions": {
    "Bash": "deny",
    "FileWrite": "ask",
    "FileRead": "allow"
  }
}
```

## Testing

```bash
npm test
```

## License

MIT

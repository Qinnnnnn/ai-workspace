## Why

The current architecture (Python FastAPI service → Node.js codenano-cli JSON-RPC bridge → codenano SDK) adds unnecessary complexity, latency, and type loss. The CLI layer has no business logic—just protocol translation. A direct Node.js Fastify service that wraps codenano SDK exposes the full SDK capability with type safety and minimal overhead.

## What Changes

- **New**: Create `agent-service/` — a Node.js Fastify HTTP/WebSocket service that directly wraps codenano SDK
- **New**: Expose full `AgentConfig` surface via HTTP API (memory, MCP, persistence, hooks via WebSocket)
- **New**: WebSocket endpoint for hook callbacks, enabling Python-side `onPreToolUse`/`onTurnEnd` etc.
- **New**: Memory API (`saveMemory`, `loadMemory`, `scanMemories`)
- **New**: MCP integration API (`connectMCPServer`, `listMCPTools`, `callMCPTool`)
- **Remove**: Delete `codenano-service/` (Python FastAPI)
- **Remove**: Delete `codenano-cli/` (JSON-RPC thin wrapper)
- **Change**: Service port default 8000 (configurable via `AGENT_SERVICE_PORT`)
- **Change**: Configuration via `.env` file (no `apiKey` in request body)

## Capabilities

### New Capabilities

- `agent-service-api`: Core HTTP/WebSocket service wrapping codenano SDK — session management, message streaming (SSE), hook callbacks (WebSocket)
- `memory-api`: HTTP API for cross-session memory operations (save, load, scan, delete)
- `mcp-api`: HTTP API for MCP server lifecycle management (connect, list tools, call tool, disconnect)
- `tool-permissions`: Rule-based tool permission configuration instead of function-based `canUseTool` hook

### Modified Capabilities

- `agent-api`: **BREAKING** — Replaces the JSON-RPC bridge architecture with direct HTTP/WebSocket API. Full AgentConfig surface exposed instead of only `toolPreset`.
- `session-management`: **BREAKING** — Removes bwrap sandbox and codenano-cli subprocess dependency. Session lifecycle now managed directly by Node.js service with in-memory registry.
- `tool-preset-config`: **BREAKING** — Tool presets (`core`/`extended`/`all`) now passed directly to codenano SDK's `createAgent`, not through JSON-RPC init.

## Impact

- **Delete**: `codenano-service/` (Python service)
- **Delete**: `codenano-cli/` (Node.js JSON-RPC wrapper)
- **Add**: `agent-service/` (Node.js Fastify service)
- **Port**: Default 8000, configurable via `AGENT_SERVICE_PORT` env var
- **Config**: `.env` file at `agent-service/.env` with `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL`, `LOG_LEVEL`
- **codenano SDK**: No changes — `agent-service` is a passive wrapper

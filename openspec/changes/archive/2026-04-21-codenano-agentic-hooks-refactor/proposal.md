## Why

codenano-api currently exposes a WebSocket hook coordination system designed for external Python clients to intervene in agent execution (approve/deny tool calls). This is misaligned with the pure Agentic service model (Kimi/Claude Computer style) where agents operate autonomously without human-in-the-loop confirmation. The external hook model adds unnecessary complexity, security concerns (external clients can block tools), and architectural overhead.

## What Changes

- **Remove** WebSocket hook endpoint (`GET /ws/sessions/:id/hooks`)
- **Remove** `hooks` parameter from session creation API
- **Remove** `hook-coordinator.ts` - no longer needed
- **Remove** MCP management API (`/api/v1/mcp/*`) - MCP servers are configured via session creation `config.mcpServers` only
- **Simplify** `toolPermissions` to purely internal allow/deny rules (no "ask" mode requiring external coordination)
- **Remove** custom tools API (`POST /tools`, `GET /tools`, etc.) - tools come from presets and MCP only
- **Add** session resume via `resumeSessionId` parameter in session creation

## Capabilities

### New Capabilities

- `session-resume`: Ability to resume an existing persisted session by loading its message history.

### Modified Capabilities

- `agent-service-api`: Remove WebSocket hook endpoint and `hooks` parameter from session creation. Add `resumeSessionId` support.
- `tool-permissions`: Remove "ask" permission mode. Permissions are now purely internal: `"allow"` executes immediately, `"deny"` blocks without external coordination.

## Impact

**Removed components:**
- `src/hooks/hook-coordinator.ts` - WebSocket hook coordination
- `GET /ws/sessions/:id/hooks` endpoint
- `hooks` parameter in `POST /api/v1/sessions`
- `POST /api/v1/tools`, `GET /api/v1/tools`, `GET /api/v1/tools/:name`, `DELETE /api/v1/tools/:name` endpoints
- `src/routes/tools.ts` - custom tools API
- `src/routes/mcp.ts` - independent MCP management API
- `mcpConnections` management in session-registry

**Modified components:**
- `POST /api/v1/sessions` - removes `hooks` parameter, adds optional `resumeSessionId`
- `toolPermissions` in session creation - "ask" mode removed
- `src/index.ts` - removes websocket plugin, hooksRoutes, toolsRoutes, mcpRoutes

**Added components:**
- `resumeSessionId` support in session creation

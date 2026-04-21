## Context

codenano-api wraps the codenano SDK as an HTTP/WebSocket service. The current hook system (`hook-coordinator.ts`) is designed for external Python clients to intercept and approve/deny tool calls at runtime via WebSocket. This model was inherited from the agent-wrapper.js subprocess era and persists unnecessarily after the refactor to direct library integration.

The target use case is an **Agentic service** (Kimi/Claude Computer style): users issue high-level goals, and agents execute autonomously without pausing for human confirmation. External hook coordination is architecturally misaligned with this model.

## Goals / Non-Goals

**Goals:**
- Provide a pure Agentic service that runs autonomously without external intervention
- Support session resume for long-running conversations
- Simplify the codebase by removing WebSocket hook infrastructure
- Remove custom tools API (tools come from presets and MCP only)

**Non-Goals:**
- No external client tool approval via WebSocket
- No `ask` permission mode requiring external coordination
- No hook registration protocol via API
- No custom tool definition API

## Decisions

### Decision 1: Remove WebSocket hook infrastructure entirely

**Chosen:** Delete `hook-coordinator.ts`, remove hook endpoints, no internal hook replacement

**Rationale:** For pure Agentic operation, hooks are not needed. The service logs are sufficient for observability. Adding internal logging hooks (without WebSocket) would be complexity for no immediate value.

### Decision 2: Remove custom tools API

**Chosen:** Remove `POST /tools`, `GET /tools`, `DELETE /tools/:name` endpoints

**Rationale:** User's requirement is "tools are preset + MCP". Custom tool definition API is not needed. Simpler.

### Decision 3: Remove `toolPermissions: "ask"` mode

**Chosen:** Only `"allow"` and `"deny"` are valid permission modes

**Rationale:** "ask" mode requires external client coordination via WebSocket, which contradicts autonomous operation. Denied tools return an error result directly to the model without external involvement. Default is now "allow".

### Decision 4: Add `resumeSessionId` to session creation

**Chosen:** `POST /api/v1/sessions { resumeSessionId?, config, toolPermissions }`

**Rationale:** Enables long-running conversations across API calls. Uses codenano's built-in `persistence.resumeSessionId` mechanism - when provided, codenano loads messages from the session's JSONL file before starting.

## Session Resume Implementation

codenano SDK's `SessionPersistConfig` supports `resumeSessionId`:

```typescript
// In codenano, session persistence is configured via:
const session = agent.session(sessionId, {
  persistence: {
    enabled: true,
    storageDir: '...',
    resumeSessionId: 'existing-session-id',  // ← loads messages from that session
  }
})
```

The API translates `resumeSessionId` in the request body to this codenano option.

## Risks / Trade-offs

[Risk] Session resume doesn't restore MCP connections
→ Mitigation: By design. Resume reloads message history only. Fresh MCP connections must be re-established via `config.mcpServers`.

[Risk] Removing "ask" mode breaks existing Python clients that relied on it
→ Mitigation: This is a breaking change. Clients using toolPermissions with "ask" will need to be updated to either "allow" or "deny".

## Open Questions

None remaining.

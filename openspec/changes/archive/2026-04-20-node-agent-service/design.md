## Context

**Current State**: The codebase has a two-layer service architecture:
- `codenano-service/` — Python FastAPI that spawns `codenano-cli` subprocesses
- `codenano-cli/` — Node.js thin wrapper that translates JSON-RPC to `codenano` SDK calls

This creates a chain: Python → JSON-RPC → Node.js CLI → codenano SDK, where the CLI layer adds no business logic—only serialization overhead and type loss.

**Problem**: Hooks (e.g., `onPreToolUse`) are TypeScript functions that cannot cross the JSON-RPC boundary. The SDK's full capability surface (memory, MCP, persistence config) is unreachable from the Python side. The architecture is over-complicated for what should be a simple passthrough.

**Stakeholders**: Python clients (ML pipelines, data processing services) that need to call the agent via HTTP.

## Goals / Non-Goals

**Goals:**
- Single-process Node.js service that directly wraps codenano SDK
- Expose full `AgentConfig` surface (memory, MCP, persistence, all advanced options)
- HTTP API for all operations (sessions, memory, MCP)
- WebSocket for hook callbacks so Python can implement `onPreToolUse` etc.
- Configuration via `.env` file, not request body for credentials
- Keep `codenano` SDK unchanged — this service is a passive wrapper

**Non-Goals:**
- Python SDK or Python client library (just HTTP interface)
- Direct Python-to-nodenano FFI
- Changing codenano SDK itself
- Supporting arbitrary custom tools via function passing (use MCP instead)

## Decisions

### Decision 1: Fastify over Express

**Choice**: Use Fastify as the HTTP framework.

**Rationale**:
- JSON Schema validation built-in, matching our AgentConfig schema design
- 2-3x faster than Express
- Native WebSocket support via `@fastify/websocket`
- TypeScript-first with excellent type inference
- Consistent with codenano's TypeScript codebase

**Alternatives**: Express (simpler but no built-in validation, slower), Hono (lighter but less mature ecosystem), NestJS (heavy, over-engineered for this use case).

### Decision 2: In-memory Session Registry

**Choice**: Keep session state in a Node.js Map in the service process, not in a separate persistence layer.

**Rationale**:
- codenano SDK already handles session persistence via `persistence` config (writes JSONL files to `storageDir`)
- This service only needs to map `sessionId` → `Session` instances
- Service restarts are acceptable — clients can `resumeSessionId` to continue
- Simple `Map<string, SessionEntry>` registry is sufficient

**Alternatives**: Redis/some external store (adds ops complexity, unnecessary since SDK handles persistence).

### Decision 3: WebSocket for Hook Callbacks

**Choice**: Hooks are handled via a persistent WebSocket connection per session, not serialized function passing.

**Rationale**:
- JSON-RPC (and HTTP) cannot pass function references
- WebSocket allows bidirectional async communication
- Python client opens WS connection when creating a session with hooks
- Service sends hook events to WS, Python responds with allow/deny decision
- Timeout (30s) defaults to allow

**Protocol**:
```
WS: connect /ws/sessions/:id/hooks
Python → WS: { "type": "register_hook", "hooks": ["onPreToolUse", "onTurnEnd"] }
SDK triggers hook:
WS ← Service: { "type": "hook_event", "hookId": "uuid", "hookType": "onPreToolUse", "data": {...} }
Python → WS: { "type": "hook_decision", "hookId": "uuid", "decision": { "behavior": "allow" } }
```

**Alternatives**: HTTP polling (high latency), SSE (unidirectional, can't receive decisions). WebSocket is the right fit for request-response hook callbacks.

### Decision 4: Rule-based Tool Permissions instead of `canUseTool` Function

**Choice**: Expose `toolPermissions: Record<string, 'allow' | 'deny' | 'ask'>` in AgentConfig instead of a `canUseTool` function.

**Rationale**:
- `canUseTool: PermissionFn` is a function type — impossible to serialize across HTTP
- Simple rule-based config covers 95% of use cases
- `"ask"` mode triggers hook event for Python to decide (via WebSocket)
- codenano SDK has no built-in rule-based permissions, so this is a service-layer feature

**Alternatives**: Force all permission decisions through hook system (more flexible but higher latency for simple cases).

### Decision 5: Environment Variables for Credentials

**Choice**: `apiKey`, `baseURL` come from `.env` file, not request body.

**Rationale**:
- Matches existing `codenano-service` convention
- Credentials should not travel over HTTP body unnecessarily
- Request body can still override `model`, `systemPrompt`, `mcpServers` etc.

**Alternatives**: All config in request body (credentials in logs risk), separate secrets management (over-engineered).

### Decision 6: Single Agent Instance per Session (not per Service)

**Choice**: Each session creates its own `createAgent()` + `session()`.

**Rationale**:
- codenano sessions are lightweight wrappers around a shared agent config
- Pooling agents adds complexity without clear benefit
- Service can handle hundreds of concurrent sessions (Node.js async)
- Each session gets isolated tool maps and history

## Risks / Trade-offs

**[Risk] Node.js service crash loses in-memory session registry**
→ Mitigation: `persistence` config persists sessions to JSONL files. Client can resume with `resumeSessionId`. Service crash = reconnect and resume.

**[Risk] WebSocket disconnect leaves hook decisions hanging**
→ Mitigation: 30-second timeout defaults to allow. Python client should reconnect on disconnect.

**[Risk] Long-running sessions accumulate memory**
→ Mitigation: `maxTurns` defaults to 30. Service should monitor memory and implement graceful session eviction if needed. Client can explicitly close sessions.

**[Risk] MCP server connection is async and can fail**
→ Mitigation: Return error to client. Consider implementing health checks for connected MCP servers.

**[Risk] Python client cannot pass custom tool `execute` functions**
→ Mitigation: Use MCP protocol — Python exposes tools as MCP server, service connects via `connectMCPServers`.

**[Trade-off] No built-in authentication/authorization**
→ Current scope: internal service behind firewall. Production deployment would need API key middleware or reverse proxy auth.

## Open Questions

1. **Service lifecycle with MCP servers**: If a session creates MCP connections and the service restarts, what happens? Should MCP connections be persisted or re-established on resume?

2. **Hook timeout duration**: 30 seconds for hook decisions—is this too long, too short? Should it be configurable?

3. **Memory extraction events**: `memory.extractStrategy: 'auto'` triggers background extraction. Should the service notify Python clients of extraction events via WebSocket?

4. **Graceful shutdown sequence**: What is the correct order? (1) Stop accepting new requests, (2) Close all WebSocket connections, (3) Abort all sessions, (4) Disconnect MCP servers, (5) Exit?

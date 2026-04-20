## Context

codenano-api currently uses a subprocess architecture to wrap the codenano TypeScript SDK:

```
client → HTTP API → spawn codenano subprocess (bwrap) → JSON protocol
```

This architecture adds complexity (JSON RPC, process lifecycle, bwrap dependency) without commensurate benefit. codenano's built-in `path-guard` provides sufficient workspace isolation, making bwrap and subprocess overhead unnecessary for typical agentic workflow use cases.

## Goals / Non-Goals

**Goals:**
- Simplify codenano-api to a thin HTTP/WebSocket adapter layer
- Enable direct library access to all codenano capabilities
- Remove bwrap and subprocess dependencies
- Maintain backward compatibility for the core API surface
- Improve performance by eliminating IPC overhead

**Non-Goals:**
- Modifying codenano SDK internals
- Adding new AI/LLM capabilities beyond what codenano provides
- Supporting multi-tenant isolation beyond workspace path constraints
- Changing the HTTP/WebSocket API protocol (except for new capability routes)

## Decisions

### 1. Architecture: Library Integration over Subprocess

**Decision:** Replace subprocess spawning with direct TypeScript imports of codenano modules.

**Rationale:**
- codenano's `path-guard` validates all file operations against workspace boundaries
- Subprocess overhead (fork, bwrap, JSON serialization) adds ~50-100ms latency per request
- Direct imports enable full capability access without protocol translation
- Simplified debugging - stack traces remain in-process

**Alternative:** Keep subprocess but remove bwrap. Rejected because it keeps JSON protocol complexity without security benefit.

### 2. Session Management: codenano-native over Custom Registry

**Decision:** Use codenano's built-in `SessionImpl` with JSONL file persistence.

**Rationale:**
- codenano already handles session lifecycle, message history, and resume
- JSONL append-only format is crash-safe and simple
- Removing `session-registry.ts` eliminates duplicate session tracking logic

**Alternative:** Implement session registry in API layer. Rejected - adds complexity for no benefit.

### 3. Hook System: WebSocket Coordinator + Direct Callbacks

**Decision:** Keep WebSocket hook coordinator for permission decisions, add direct hook callback support.

**Rationale:**
- `onPreToolUse` and `onPostToolUse` hooks align with HTTP permission check pattern
- WebSocket allows external permission services without modifying core API
- Direct callbacks enable simpler deployments without WebSocket infrastructure

### 4. New API Routes: Incremental, Not All at Once

**Decision:** Add new capability routes incrementally as they're needed.

**Rationale:**
- Proposal includes routes for tools, cost, git, skills, prompt
- Not all may be needed immediately
- Each can be added independently without architectural risk

**New routes planned:**
- `POST /api/v1/agents` - create agent with custom tools
- `GET /api/v1/cost` - cost tracking for model usage
- `GET /api/v1/git/state` - current git state for context

### 5. Module Structure

**Decision:** Flatten codenano-api structure to minimize indirection.

```
codenano-api/src/
├── index.ts              # Fastify app setup
├── agent.ts              # Agent factory and config
├── routes/
│   ├── sessions.ts       # Session CRUD + message streaming
│   ├── hooks.ts         # WebSocket hook coordinator
│   ├── memory.ts         # Memory operations
│   ├── mcp.ts           # MCP server management
│   └── index.ts         # Route registration
├── types/
│   └── index.ts         # Shared TypeScript types
└── utils/
    └── index.ts          # Shared utilities
```

**Removed:**
- `agent-wrapper.js` - subprocess wrapper (gone)
- `services/session-registry.ts` - process management (gone)
- `services/hook-coordinator.ts` - becomes simpler, move to routes/hooks.ts

## Risks / Trade-offs

[Risk] Process isolation removed → codenano bugs could affect API process
[Mitigation] codenano's path-guard validates all operations; workspace config limits blast radius

[Risk] Long-running agents block event loop
[Mitigation] codenano tools are async; use worker_threads for CPU-intensive operations if needed

[Risk] Memory leaks in long-running sessions
[Mitigation] codenano's compactMessages handles token budget; monitor memory usage

## Migration Plan

1. **Phase 1 - Core Migration (2-3 days)**
   - Create new `agent.ts` module with direct codenano imports
   - Migrate session routes to use `SessionImpl` directly
   - Remove `agent-wrapper.js` and `session-registry.ts`
   - Verify existing functionality works

2. **Phase 2 - Cleanup (1-2 days)**
   - Remove bwrap dependencies from package.json
   - Simplify hook coordinator
   - Add any missing capability routes

3. **Phase 3 - Documentation (1 day)**
   - Update API documentation
   - Update deployment guides (remove bwrap requirement)

## Open Questions

1. Should we keep any sandbox mechanism at all, or rely entirely on path-guard?
2. Do we need rate limiting or quota management at the API layer?
3. What's the strategy for handling agent crashes (restart vs. error response)?

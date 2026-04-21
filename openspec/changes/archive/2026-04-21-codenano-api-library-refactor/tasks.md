## 1. Setup and Structure

- [x] 1.1 Create new module structure under `src/`
- [x] 1.2 Create `src/agent.ts` for agent factory
- [x] 1.3 Create `src/utils/` for shared utilities
- [x] 1.4 Update `tsconfig.json` for direct codenano imports
- [x] 1.5 Verify codenano submodule is properly linked

## 2. Agent Module (`src/agent.ts`)

- [x] 2.1 Implement `createAgent(config)` function with direct codenano import
- [x] 2.2 Implement tool preset selection (`coreTools`, `extendedTools`, `allTools`)
- [x] 2.3 Implement custom tool registration via `defineTool()`
- [x] 2.4 Wire up hook system (onPreToolUse, onPostToolUse, onTurnEnd)
- [x] 2.5 Configure workspace path validation via `CODENANO_WORKSPACE`

## 3. Session Routes (`src/routes/sessions.ts`)

- [x] 3.1 Migrate `POST /api/v1/sessions` to use `createAgent()` + `Session`
- [x] 3.2 Migrate `GET /api/v1/sessions` to use `listSessions()`
- [x] 3.3 Migrate `GET /api/v1/sessions/:id` to use session registry
- [x] 3.4 Migrate `DELETE /api/v1/sessions/:id` to abort + cleanup
- [x] 3.5 Migrate `POST /api/v1/sessions/:id/message` with SSE streaming
- [x] 3.6 Migrate `GET /api/v1/sessions/:id/history` to use `loadSession()`

## 4. Hook Coordinator (`src/routes/hooks.ts`)

- [x] 4.1 Implement WebSocket endpoint `WS /ws/sessions/:id/hooks`
- [x] 4.2 Bridge WebSocket messages to agent hook callbacks
- [x] 4.3 Support allow/deny responses from external permission services

## 5. Memory Routes (`src/routes/memory.ts`)

- [x] 5.1 Migrate `POST /api/v1/memory` to use `saveMemory()`
- [x] 5.2 Migrate `GET /api/v1/memory/:key` to use `loadMemory()`
- [x] 5.3 Migrate `GET /api/v1/memory` to use `scanMemories()`
- [x] 5.4 Migrate `DELETE /api/v1/memory/:key`

## 6. MCP Routes (`src/routes/mcp.ts`)

- [x] 6.1 Migrate `POST /api/v1/mcp/connect` to use `connectMCPServer()`
- [x] 6.2 Migrate `GET /api/v1/mcp/tools` to use `listMCPTools()`
- [x] 6.3 Migrate `POST /api/v1/mcp/tools/call` to use `callMCPTool()`
- [x] 6.4 Migrate `DELETE /api/v1/mcp/:serverId` to use `disconnectAll()`

## 7. New API Routes

- [x] 7.1 Create `src/routes/tools.ts` with `POST /api/v1/tools`
- [x] 7.2 Create `src/routes/cost.ts` with `GET /api/v1/cost/pricing` and `POST /api/v1/cost/calculate`
- [x] 7.3 Create `src/routes/git.ts` with `GET /api/v1/git/state`
- [x] 7.4 Create `src/routes/skills.ts` with skills management endpoints

## 8. Cleanup Removed Components

- [x] 8.1 Delete `src/agent-wrapper.js`
- [x] 8.2 Delete `src/services/session-registry.ts` (replaced with lightweight version)
- [x] 8.3 Delete `src/services/hook-coordinator.ts` (moved to `src/hooks/hook-coordinator.ts`)
- [x] 8.4 Remove bwrap dependency from `package.json` (no bwrap dependency)

## 9. Session Registry

- [x] 9.1 Create lightweight in-memory session registry (`src/services/session-registry.ts`)
- [x] 9.2 Implement TTL-based session cleanup
- [x] 9.3 Implement session activity touch on message
- [x] 9.4 Implement graceful shutdown cleanup

## 10. Streaming Implementation

- [x] 10.1 Implement SSE streaming for message responses
- [x] 10.2 Implement tool execution event streaming
- [x] 10.3 Implement token budget management with compaction (via codenano)
- [x] 10.4 Implement tool result truncation (via codenano)

## 11. Testing

- [x] 11.1 Verify existing session CRUD works
- [x] 11.2 Verify message streaming works
- [x] 11.3 Verify hook WebSocket works
- [x] 11.4 Verify path-guard blocks escapes
- [x] 11.5 Verify new API routes work
- [x] 11.6 Verify memory operations work
- [x] 11.7 Verify MCP integration works

## 12. Documentation

- [x] 12.1 Update API documentation
- [x] 12.2 Update deployment guide (remove bwrap requirement)
- [x] 12.3 Add migration notes for API changes

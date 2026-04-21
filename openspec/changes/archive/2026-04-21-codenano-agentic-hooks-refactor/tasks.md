## 1. Remove WebSocket hook infrastructure

- [x] 1.1 Delete `src/hooks/hook-coordinator.ts`
- [x] 1.2 Remove WebSocket hook route registration from `src/index.ts`
- [x] 1.3 Remove `src/routes/hooks.ts` (if it only contains hook WebSocket endpoint)
- [x] 1.4 Remove `HookType`, `HookDecision` types from `src/types/index.ts` (if only used by hook coordinator)

## 2. Remove MCP management API

- [x] 2.1 Delete `src/routes/mcp.ts`
- [x] 2.2 Remove mcpRoutes registration from `src/index.ts`
- [x] 2.3 Remove `mcpConnections` from `src/services/session-registry.ts`
- [x] 2.4 Remove `ConnectMCPServerBody`, `CallMCPToolBody` from types (MCPServerConfig kept for config.mcpServers)

## 3. Simplify session creation API

- [x] 3.1 Update `POST /api/v1/sessions` - remove `hooks` parameter from request body
- [x] 3.2 Add `resumeSessionId` support - if provided, pass to codenano's `persistence.resumeSessionId`
- [x] 3.3 Update `src/services/session-registry.ts` - remove `hookCoordinator` from `SessionEntry` interface

## 4. Update tool-permissions

- [x] 4.1 Remove "ask" mode from permission check logic - only allow/deny
- [x] 4.2 Update default permission from "ask" to "allow" in permission check
- [x] 4.3 Remove `toolPermissions: "ask"` handling everywhere

## 5. Remove custom tools API

- [x] 5.1 Remove `POST /api/v1/tools` endpoint
- [x] 5.2 Remove `GET /api/v1/tools` endpoint
- [x] 5.3 Remove `GET /api/v1/tools/:name` endpoint
- [x] 5.4 Remove `DELETE /api/v1/tools/:name` endpoint
- [x] 5.5 Delete `src/routes/tools.ts`
- [x] 5.6 Remove `getCustomTools()` and `clearCustomTools()` exports

## 6. Update service shutdown

- [x] 6.1 WebSocket cleanup already absent from shutdown handler

## 7. Verify and test

- [x] 7.1 Run TypeScript compilation - fix any type errors
- [x] 7.2 Test session creation with `POST /api/v1/sessions`
- [x] 7.3 Test session message with `POST /api/v1/sessions/:id/message`
- [x] 7.4 Test session resume with `POST /api/v1/sessions { "resumeSessionId": "..." }`
- [x] 7.5 Test tool permission deny - verify blocked tool returns error
- [x] 7.6 Test session deletion with `DELETE /api/v1/sessions/:id`
- [x] 7.7 Verify hook endpoints return 404
- [x] 7.8 Verify custom tools endpoints return 404
- [x] 7.9 Verify MCP endpoints return 404
- [x] 7.10 Test graceful shutdown

## Why

Currently, codenano uses a global `process.env.CODENANO_WORKSPACE` environment variable for workspace isolation. This causes race conditions when multiple sessions run concurrently, as one session's workspace setting can overwrite another's. Per-session workspace isolation is required for supporting multiple simultaneous users.

## What Changes

- Add `workspace` parameter to `AgentConfig` for explicit per-session workspace specification
- Add `workspace` field to `ToolContext` for tools to access the session's workspace at execution time
- Update `tool-executor.ts` to populate `ToolContext.workspace` from `AgentConfig`
- Update 6 file tools (FileRead, FileWrite, FileEdit, Bash, Grep, Glob) to use `context.workspace` instead of `process.env.CODENANO_WORKSPACE`
- Update `codenano-api` to create per-session workspace directories at `~/.agent-core/workspaces/{sessionId}`
- Update `session-registry.ts` to store workspace path and clean up workspace directory when session is deleted
- Extend session API responses to include workspace information

## Capabilities

### New Capabilities

- `session-workspace-isolation`: Per-session workspace isolation - Each session gets an isolated workspace directory, with file operations constrained to that directory. Workspace is required (no fallback) and cleaned up when session is deleted.

### Modified Capabilities

- (none)

## Impact

- **codenano (fork)**: `src/types.ts`, `src/tool-executor.ts`, `src/tools/*.ts`
- **codenano-api**: `src/routes/sessions.ts`, `src/services/session-registry.ts`
- **API changes**: Session create/GET responses include `workspace` field

## Context

codenano-api provides a multi-user agentic service using the codenano SDK. Each session needs an isolated workspace directory where the agent can read/write files without interfering with other sessions.

Currently, codenano uses `process.env.CODENANO_WORKSPACE` as a global environment variable for workspace isolation. This approach works for single-session use but causes race conditions in concurrent multi-session scenarios:

```
Request A: process.env.CODENANO_WORKSPACE = '/workspaces/session-a'
Request B: (concurrent) → overwrites to '/workspaces/session-b'
Tool execution: reads the last value → session-a operates in session-b's workspace
```

The codenano SDK is maintained as a local fork (`../codenano`), which gives us full control to implement proper per-session workspace isolation.

## Goals / Non-Goals

**Goals:**
- Per-session workspace isolation via explicit configuration (no global state)
- Workspace path: `~/.agent-core/workspaces/{sessionId}`
- Workspace directory created on session creation, deleted on session deletion
- Type-safe workspace access through `ToolContext`
- Workspace is required (no fallback to env var or `/`)

**Non-Goals:**
- User authentication / multi-tenancy (handled separately)
- Workspace persistence across session deletion
- Custom workspace paths via API (workspace always under `~/.agent-core/workspaces/`)
- Modifying codenano's memory or session persistence (already per-session)

## Decisions

### Decision 1: Workspace passed through `AgentConfig` → `ToolContext`

**Choice**: Add `workspace` to `AgentConfig` and `ToolContext`

**Rationale**: This follows the existing data flow:
1. API layer creates agent with config
2. Agent stores config
3. Tool executor creates `ToolContext` from config
4. Tools read workspace from context

This is more explicit than alternatives:
- Global state (`process.env`): Causes concurrency issues
- Direct agent reference in tools: Creates tight coupling

**Alternatives considered**:
- `AgentImpl.getWorkspace()` method: Requires passing agent reference through execution chain
- Workspace as separate parameter to `executeSingleTool`: Proliferates through call chain

### Decision 2: 6 tools update to use `context.workspace`

**Files to modify**:
- `src/tools/FileReadTool.ts`
- `src/tools/FileWriteTool.ts`
- `src/tools/FileEditTool.ts`
- `src/tools/BashTool.ts`
- `src/tools/GrepTool.ts`
- `src/tools/GlobTool.ts`

Each tool currently reads `process.env.CODENANO_WORKSPACE || '/'`. Change to `context.workspace`.

**Note**: The `path-guard.ts` validation functions accept workspace as parameter, so no changes needed there.

### Decision 3: `codenano-api` handles workspace lifecycle

**Session creation**:
```typescript
const sessionId = crypto.randomUUID()
const workspace = `${homedir()}/.agent-core/workspaces/${sessionId}`
mkdirSync(workspace, { recursive: true })

const agent = createAgent({ workspace, ... })
```

**Session deletion**: Delete both session and workspace directory.

**Rationale**: Keeping workspace management in codenano-api keeps codenano SDK clean and focused on agent behavior.

### Decision 4: API responses include workspace path

**Rationale**: Enables admin debugging and audit. Workspace path is not sensitive (user data already accessible to service).

## Risks / Trade-offs

**[Risk] Concurrent tool execution** → Already handled by `ToolContext` design. Each tool call receives its workspace at execution time.

**[Risk] Workspace cleanup on crash** → TTL cleanup in `session-registry.ts` already handles orphaned sessions. Workspace directories are small (user files only), so temporary leakage is acceptable.

**[Trade-off] Workspace required** → No fallback to `/` or env var. Simpler mental model: every session has exactly one workspace. If workspace param is missing, createAgent throws.

## Migration Plan

1. **codenano fork changes first**:
   - Update `types.ts`: Add `AgentConfig.workspace`, `ToolContext.workspace`
   - Update `tool-executor.ts`: Populate `ToolContext.workspace`
   - Update 6 tools: Use `context.workspace`

2. **codenano-api changes**:
   - Update `sessions.ts`: Create workspace dir on session create
   - Update `session-registry.ts`: Store workspace path, delete on destroy
   - Update API responses: Include workspace field

3. **Testing**:
   - Concurrent sessions don't interfere
   - Session deletion cleans up workspace

4. **Rollback**: Revert to previous commit, but concurrent workspace isolation will still be broken.

## Open Questions

1. Should workspace creation be lazy (on first file write) or eager (on session create)?
   - **Decision**: Eager - fail fast if disk is full, cleaner lifecycle

2. Maximum workspace size limit?
   - **Decision**: No limit for now, revisit if storage becomes an issue

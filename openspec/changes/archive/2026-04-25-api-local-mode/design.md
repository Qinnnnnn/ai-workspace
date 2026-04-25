## Context

The `codenano-api` service creates agent sessions via `POST /api/v1/sessions`. Currently, every session creation:
1. Creates a Docker container (`createContainer`)
2. Starts the container (`startContainer`)
3. Constructs `RuntimeContext` with `type: 'sandbox'`
4. Calls `createAgentInstance` which always uses `sandboxCoreTools()`

This makes local development/debugging slow (container startup time) and prevents iterating without Docker daemon.

The `RuntimeContext` discriminated union already exists:
```typescript
type RuntimeContext =
  | { type: 'local'; cwd: string }
  | { type: 'sandbox'; cwd: string; hostWorkspaceDir: string; containerId: string }
```

And `createAgentInstance` already branches on `runtime?.type === 'sandbox'`.

## Goals / Non-Goals

**Goals:**
- Support `sandbox: false` config to skip Docker and run in local mode
- Local mode respects `toolPreset` config (core / extended / all)
- Backward compatible: `sandbox: true` (default) behaves identically to current
- Minimal code changes: leverage existing RuntimeContext branching

**Non-Goals:**
- Modifying sandbox behavior (Docker setup, resource limits, etc.)
- Supporting hybrid modes (local + Docker in same session)
- Adding new tool sets specific to local mode

## Decisions

### Decision 1: Add `sandbox` field to `SessionCreateConfig`

**Choice**: Add `sandbox?: boolean` to `SessionCreateConfig` in `types/index.ts`, defaulting to `true`.

**Rationale**: Backward compatible — existing callers continue to get sandbox behavior. Explicit opt-in/opt-out is clear.

**Alternatives considered**:
- `runtime: 'local' | 'sandbox'` — more flexible but requires type changes downstream
- Separate endpoints (`/api/v1/sessions/local`) — creates code duplication

### Decision 2: Branch session creation in routes handler

**Choice**: In `sessions.ts` POST handler, check `config.sandbox !== false` before Docker calls.

**Rationale**: Keeps Docker logic untouched for sandbox path; local path just skips it.

```typescript
// sandbox path (config.sandbox !== false)
const containerId = await createContainer(sessionId, physicalPath)
await startContainer(containerId)

// local path (config.sandbox === false)
// No Docker calls
```

### Decision 3: Construct RuntimeContext based on mode

**Choice**:
- sandbox: `{ type: 'sandbox', cwd: '/workspace', hostWorkspaceDir: physicalPath, containerId }`
- local: `{ type: 'local', cwd: physicalPath }`

**Rationale**: `cwd` for local matches the workspace path, consistent with sandbox where cwd is `/workspace` (mapped to hostWorkspaceDir).

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Local mode has no isolation (tools can access entire filesystem) | Acceptable for local dev/debug; sandbox remains default |
| `toolPreset` ignored in sandbox mode confuses users | Document that sandbox uses fixed `sandboxCoreTools()` regardless of `toolPreset` |
| Docker image not available locally | Already handled: sandbox=true returns 503 if Docker unavailable |

## Migration Plan

1. Deploy with new `sandbox` field accepted but defaulting to `true`
2. No breaking changes — existing clients continue working
3. Clients can immediately use `sandbox: false` for local dev

## Open Questions

- Should local mode workspaces be created at `~/.agent-core/workspaces/{sessionId}` (same as sandbox) or a dedicated `~/.agent-core/local-workspaces/` directory?
- **Chosen**: Same `workspaces/{sessionId}` path — consistent with sandbox, just no Docker.

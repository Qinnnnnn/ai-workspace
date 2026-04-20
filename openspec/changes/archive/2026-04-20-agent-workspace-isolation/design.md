## Context

codenano-api creates agent sessions via `createAgent().session()` in the same Node.js process. All tools (FileRead, FileWrite, Bash) operate directly on the host filesystem without any isolation. Sessions are not isolated from each other.

## Goals / Non-Goals

**Goals:**
- Filesystem-level isolation for each session
- Agent can only read/write within its workspace
- Session persistence stored in workspace (agent can see its own history)
- Clean workspace lifecycle: create on session start, destroy on session end

**Non-Goals:**
- Network isolation (not needed)
- PID/process isolation beyond bwrap namespaces
- Container-based isolation (bwrap is sufficient)
- Multi-agent coordination (each session is independent)

## Decisions

### 1. Workspace Path: `~/.codenano/workspaces/{session_id}/`

**Decision:** Workspace stored at `~/.codenano/workspaces/{session_id}/` on the host.

**Rationale:** Follows XDG base directory convention, keeps all workspaces under a single parent for easy management.

### 2. bwrap Sandbox: Workspace Bound to `/`

**Decision:** Launch agent via `bwrap --bind {workspace} / --exec {agent}`.

**Rationale:**
- Agent's root `/` = workspace, agent cannot escape
- bwrap provides syscall-level isolation (mount namespace)
- All tools (Bash, FileRead, FileWrite) automatically constrained
- Cold start < 1s is acceptable for this use case

**Alternative considered:** Only path validation in SDK. Rejected because bwrap provides kernel-enforced guarantees rather than code-enforced.

### 3. Path Validation in SDK Tools

**Decision:** Add path validation to all file-operating tools in codenano SDK.

**Rationale:** Defense in depth. Even with bwrap, validation prevents accidental or intentional escapes.

**Validation rules:**
- Absolute paths: must start with `/`
- Relative paths: resolve relative to workspace
- Path must be within workspace after resolution
- Bash commands: validate all extracted paths

**Dangerous commands blocked regardless of path:**
- `rm -rf /`, `mkfs`, `dd`, etc.

### 4. Session Persistence in Workspace

**Decision:** SDK persistence config `storageDir` points to workspace's `.codenano/` subdirectory.

**Rationale:** Session history is part of the agent's workspace, not separate from it.

### 5. Process Model: Child Process + IPC

**Decision:** Agent runs as a child process spawned via Node.js `child_process.spawn()`, communicating via stdin/stdout.

**Rationale:**
- codenano SDK is a Node.js library, not a standalone binary
- IPC via JSON messages over stdio is simple and reliable
- Fastify WebSocket streams to agent's stdout

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| bwrap not available on system | Check at startup, fail fast with clear error |
| Path validation bypass via symlinks | bwrap `--bind` creates actual mount, symlinks can't escape |
| Session cleanup on crash | TTL-based cleanup loop already exists |
| Large workspace slow to bind | bwrap bind is instant (not copy) |

## Open Questions

None at this time.

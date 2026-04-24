## Context

Codenano aims to be a multi-session computer use runtime where each agent session operates in an isolated workspace. Currently, codenano-sdk uses `process.cwd()` internally for critical operations (instructions loading, skills discovery, memory hashing) instead of the configured workspace path, causing path leakage. Additionally, executing agent commands directly on the host without isolation poses security and stability risks.

The target environment is a single EC2 instance (not distributed), prioritizing simplicity and host security.

## Goals / Non-Goals

**Goals:**
- Each session has an isolated Docker container with resource limits (0.5 CPU, 512MB RAM)
- LLM sees only `/workspace` as its root (path parallax)
- File operations execute on host via Node.js `fs` (fast, no escaping issues)
- Shell commands execute inside Docker container (isolated)
- Path traversal attacks are prevented via `startsWith()` validation
- UID/GID alignment prevents permission conflicts between host and container

**Non-Goals:**
- Multi-host or Kubernetes deployment
- General container orchestration
- Windows container support
- Live migration or checkpointing

## Decisions

### 1. Docker-based Isolation (vs VM or Process-level)

**Decision**: Use Docker containers for command execution isolation.

**Rationale**: OS-level namespace isolation with cgroups resource limits. Lightweight compared to VMs. dockerode provides robust programmatic control.

**Alternatives considered**:
- *VM*: Too heavy for single-node, slow startup
- *Process-level seccomp/landlock*: More complex to implement correctly, less proven

### 2. Hybrid File/Command Execution (vs Everything in Docker)

**Decision**: SDK reads/writes files directly on host (`fs` module); command-execution tools (BashTool, GlobTool, GrepTool) proxy through `docker exec`.

**Tool Categories**:
| Tool Type | Tools | Execution Method |
|-----------|-------|------------------|
| **FileTools** (host, no sandbox) | FileReadTool, FileWriteTool, FileEditTool | Node.js `fs` on host, literal paths |
| **SandboxFileTools** (host, sandboxed) | SandboxFileReadTool, SandboxFileWriteTool, SandboxFileEditTool | Node.js `fs` on host, path sandboxed via `hostWorkspaceDir` |
| **SandboxTool** (container) | SandboxBashTool, SandboxGlobTool, SandboxGrepTool | `docker exec {containerId} bash -c "cd /workspace && {cmd}"` |

**Implementation Note**: Original FileTools remain unchanged. Sandbox versions (SandboxFileReadTool, etc.) were created separately with sandbox support. When `context.hostWorkspaceDir` is set, paths are sandboxed using `resolveSecurePhysicalPath()` which strips `/workspace` prefix, resolves physically, and validates with `realpath()` + `startsWith()` check. Use `sandboxCoreTools()` to get all sandbox-aware tools.

**Rationale**:
- File content (source code) often large and complex; escaping for `docker exec cat/echo` is error-prone
- Node.js `fs` is fast and native; no serialization overhead
- Command tools need container isolation for security

**Alternatives considered**:
- *Everything via docker exec*: Simpler architecture but breaks with complex file content (escaping hell)
- *Everything on host*: Faster but loses container isolation for command execution

### 3. Path Parallax Implementation

**Decision**: Map host's `{WORKSPACE_BASE}/{sessionId}` to container's `/workspace`.

**Implementation**:
- API creates physical directory and Docker volume mount: `-v {physicalPath}:/workspace`
- API passes `hostWorkspaceDir` and `containerId` to SDK via agent config
- SDK stores these in `ToolContext` for tools to access
- LLM prompt states `Primary working directory: /workspace`
- SandboxFileTools resolve virtual paths against `hostWorkspaceDir` via `resolveSecurePhysicalPath()`

**Security**: `finalPhysicalPath.startsWith(hostWorkspaceDir)` check blocks traversal.

**Tool Selection Note**: When `containerId` is set, the API must explicitly pass sandbox tools (`sandboxCoreTools()`) to the agent. The SDK does not automatically switch tool implementations based on `hostWorkspaceDir`.

### 4. UID/GID Alignment

**Decision**: Create container's `agent` user with same UID as host API user.

**Implementation**:
```dockerfile
ARG HOST_UID=1000
RUN useradd -m -d /home/agent -s /bin/bash -u ${HOST_UID} agent
```

**Why**: Host SDK creates files as ubuntu UID; container agent must match to avoid `Permission denied`.

### 5. Session Lifecycle

**Decision**: Container starts on session creation, stops on session destruction.

**Flow**:
1. `POST /api/v1/sessions` → create physical dir + start container + store `{sessionId, containerId, physicalPath}`
2. `DELETE /api/v1/sessions/{id}` → stop container + cleanup physical dir

**Keepalive**: Container runs `tail -f /dev/null` to stay alive without CPU usage.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Docker daemon unavailable | Health check on startup; return 503 if Docker not accessible |
| Zombie processes from long-running commands | `spawnSync` with timeout (120s default); throw on timeout |
| Container resource exhaustion | cgroups hard limits (0.5 CPU, 512MB); `docker update` for dynamic adjustment |
| UID mismatch if host user UID changes | Document requirement; fail fast if mismatch detected |
| Docker image pull failures | Pre-pull image on API start; fail-fast with clear error |
| Path traversal via symlinks | `realpath()` resolution before `startsWith()` check |

## Open Questions

1. **Network**: Should container have internet access? If yes, bridge network; if no, `--network none`
2. **Secrets**: How to inject API keys into container? `-e` flags for explicit env vars only
3. **Container reuse**: Should we pool/reuse containers across sessions for faster startup?
4. **Persistence**: Should physical workspace be cleaned up on session end, or retained for debugging?

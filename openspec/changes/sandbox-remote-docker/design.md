## Context

The `codenano-api` server currently requires Docker to run locally on the same machine. Sandboxes are created via `dockerode` connecting to a local Unix socket. Workspace directories are bind-mounted from the host filesystem into containers.

This architecture prevents independent scaling of the API server and Docker runtime, and creates a tight coupling that complicates multi-instance deployments. Moving Docker to a remote EC2 host allows the API server to remain stateless and horizontally scalable while the sandbox runtime scales independently.

## Goals / Non-Goals

**Goals:**
- API server connects to Docker daemon on remote EC2 via SSH (no local Docker dependency)
- Workspace stored in container tmpfs — isolated, stateless, no host filesystem access
- All file operations (read/write/edit) route through `docker exec` with stdin/stdout streaming
- Path traversal protection enforced inside the container, not on the API server
- Zero changes to Agent-facing behavior (Tool API remains identical)

**Non-Goals:**
- Session persistence across container restarts (tmpfs is ephemeral by design)
- File change monitoring (inotify-based file watching)
- Modifying the Docker image itself (assumes `codenano-sandbox:latest` already exists)

## Decisions

### 1. SSH tunnel for Docker communication (over TCP exposure)

**Decision:** Use SSH for both `dockerode` control plane and `docker exec` CLI operations.

**Rationale:** SSH provides encrypted transport and leverages existing SSH key infrastructure. The alternative (exposing Docker TCP port) introduces security exposure and requires modifying Docker daemon configuration on EC2-B.

When using `ssh://user@host` protocol, dockerode and the CLI both authenticate via SSH, then interact with the local `/var/run/docker.sock` on the remote host. This means EC2-B's Docker daemon requires no configuration changes — only the SSH daemon needs to be accessible.

**Alternatives considered:**
- TCP socket exposure on port 2375/2376: Requires modifying dockerd flags, security risk
- SSH tunnel (`ssh -L`): Adds persistent tunnel management overhead

### 2. tmpfs for workspace (over bind mount or named volume)

**Decision:** Mount `/workspace` as a tmpfs inside the container.

**Rationale:**
- No host filesystem dependency — workspace exists only in container memory
- No UID/GID mapping issues (bind mounts require matching numeric UIDs between host and container)
- Session-isolated by default — no cross-session contamination
- Docker manages lifecycle automatically

**Alternatives considered:**
- Bind mount: Requires pre-creating directories on EC2-B with correct ownership; adds host dependency
- Named volume: Still persisted by Docker; adds cleanup complexity for ephemeral sessions

### 3. stdin/stdout streaming for file I/O (over command-line interpolation)

**Decision:** Use `spawnSync(..., { input: content })` for writes and `docker exec cat` for reads.

**Rationale:**
- Eliminates `ARG_MAX` command-line length limits
- Removes all shell escape complexity — content flows through stdin unchanged
- Reads return file content directly via stdout, no intermediate files

**Alternatives considered:**
- `echo '$content' | docker exec -i ...`: Content with special characters (`$`, backticks, etc.) can be interpreted by bash
- Base64 encoding: Adds encoding/decoding overhead, reduces debuggability

### 4. Node.js-side string replacement for FileEdit (over sed)

**Decision:** Read file via `docker exec cat`, replace strings in Node.js memory, write back via stdin.

**Rationale:**
- sed's `&` replacement, multiline handling, and delimiter escaping create fragile edge cases
- Node.js `String.split().join()` and `String.replace()` are battle-tested and predictable
- Single round-trip for reads, single round-trip for writes (two total docker exec calls)

**Alternatives considered:**
- `sed -i`: Fragile with special characters, poor multiline support
- Combined read+write in single shell: Increases command complexity without reducing network round-trips

### 5. SANDBOX_MODE dual-mode for local/remote switching

**Decision:** Introduce `SANDBOX_MODE` environment variable (`local` | `remote`). Both `dockerode` and CLI tools switch behavior based on this single flag.

**Rationale:**
- No global state pollution: `DOCKER_HOST` is only injected into individual `spawnSync` child processes, not the Node.js process itself
- No restart required to switch modes in production: just change the env var and restart the API server
- `dockerode` reads mode directly; `spawnSync` commands get `env.DOCKER_HOST` injected per-call
- Clean separation: lifecycle (dockerode) vs execution (CLI tools) both respect the same mode flag

**Alternatives considered:**
- Global `process.env.DOCKER_HOST` injection at startup: Pollutes global state; affects all threads and modules
- Separate env vars for dockerode vs CLI: Inconsistent configuration, easy to misconfigure one path

### 6. Unified Executor layer (`sandbox-exec.ts`)

**Decision:** Extract all `docker exec` calls into a single `executeCoreCommand(containerId, command)` utility. All sandbox tools call this executor; none call `spawnSync` directly.

**Rationale:**
- Centralizes `SANDBOX_MODE` routing logic in one place
- Future proofs new sandbox tools: any new executor (Python runtime, etc.) just calls `executeCoreCommand`
- `spawnSync('docker', ['exec', containerId, 'bash', '-c', command])` replaces `spawnSync('bash', ['-c', 'docker exec ...'])` — eliminates double bash nesting
- `executeStdinCommand(containerId, command, input)` variant handles stdin streaming for writes
- `maxBuffer: 50MB` set once, applies to all tools

**Alternatives considered:**
- Scattered `spawnSync` calls: Duplicates routing logic in every tool; easy to miss one when adding a new tool

## Risks / Trade-offs

- **[Risk]** SSH connection overhead: Each docker exec call incurs SSH handshake latency (~50-100ms on LAN/cloud)
  → **Mitigation**: For single-session workloads this is acceptable; inotify-based watching (future) can batch events

- **[Risk]** tmpfs uses container memory, capped at 512MB
  → **Mitigation**: Hard limit prevents runaway memory consumption; 512MB is sufficient for text-heavy development workloads

- **[Risk]** Ephemeral workspace — no session recovery after container restart
  → **Mitigation**: This is by design for initial deployment; session persistence can be added later via named volumes if required

- **[Risk]** SSH key management: EC2-A must have passwordless SSH access to EC2-B
  → **Mitigation**: Standard SSH key deployment; Terraform/Ansible can manage this

## Migration Plan

1. **Pre-deployment (EC2-B)**
   - Confirm `codenano-sandbox:latest` Docker image is available
   - Run `sudo usermod -aG docker ubuntu` for the SSH user
   - Add EC2-A's SSH public key to `~/.ssh/authorized_keys` on EC2-B

2. **Pre-deployment (EC2-A)**
   - Install Docker CLI if not present
   - Deploy updated `codenano-api` with new environment variables
   - `SANDBOX_MODE=local` (default): validates local docker socket still works
   - `SANDBOX_MODE=remote`: validates SSH tunnel to EC2-B works

3. **Deploy**
   - `SANDBOX_MODE=remote` + `DOCKER_HOST_HOST`/`DOCKER_HOST_USER`/`DOCKER_HOST_KEY_PATH` configured
   - Validate session creation against remote Docker host
   - Validate file write/read/edit round-trip
   - Confirm path traversal protection rejects `/etc/passwd`

4. **Rollback**
   - Set `SANDBOX_MODE=local`: falls back to local Docker socket, no code changes needed

## Open Questions

1. Should the SSH connection use a dedicated key pair separate from user's default key?
2. Is there a need for Docker daemon health monitoring or auto-reconnection on the API server side?
3. Should we add a `SANDBOX_TMPFS_SIZE_MB` environment variable to make the memory limit configurable?

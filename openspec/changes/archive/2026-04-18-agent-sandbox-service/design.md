## Context

Internal users need access to an AI agent that can autonomously perform research, write code, and generate reports. The service must:

- Provide **complete Linux environment isolation** per user session
- Allow agents to use any available tools (Node.js, Python, git, compilers, etc.)
- Be simple to operate (no Docker, no database, single EC2)
- Require zero setup from users (open web UI, start chatting)

**Current state**: A proof-of-concept exists at `fastapi/` with basic session management and bwrap sandboxing, but it lacks:
- Full filesystem isolation (agent could affect host)
- Workspace persistence and visibility
- File browsing API

**Constraints**:
- No Docker (bwrap only)
- No database (in-memory sessions)
- No authentication (MVP)
- Single EC2 instance

## Goals / Non-Goals

**Goals:**
- Provide true Linux namespace isolation via bwrap (user, PID, UTS)
- Give each session a persistent `/workspace` visible to users
- Allow agents full access to system tools without host contamination
- Support streaming responses via SSE
- Clean session lifecycle management with TTL

**Non-Goals:**
- User authentication/authorization (MVP)
- Horizontal scaling / container orchestration
- File editing/deletion via API (read-only browsing for MVP)
- Persistent session storage beyond TTL
- Web UI (API only for MVP)

## Decisions

### 1. bwrap sandbox with full root filesystem binding

**Choice**: Bind entire host root filesystem as read-only, then selectively make `/workspace` and `/tmp` writable.

```python
bwrap_args = [
    "bwrap",
    "--unshare-user",        # User namespace isolation
    "--unshare-pid",        # PID namespace isolation
    "--unshare-uts",        # Hostname/network isolation
    "--ro-bind", "/", "/",  # Entire filesystem read-only
    "--bind", workspace, "/workspace",  # Writable workspace
    "--tmpfs", "/tmp",      # Writable tmpfs
    "--tmpfs", "/var/tmp",  # Writable var/tmp
    "--hostname", f"sandbox-{session_id[:8]}",
    "--chdir", "/workspace",
    "node", cli_path,
]
```

**Why not the previous approach (selective ro-binds)?**
- Previous approach only bound `/usr`, `/lib`, `/bin`, `/sbin` — missing `/usr/local` (where node often lives), `/home`, `/opt`
- Required knowing in advance which tools users would need
- New approach gives agents access to **everything** on the system, restricted only by namespace isolation

**Trade-off**: Agent sees the full filesystem, but all writes go only to `/workspace` or `/tmp`. This is the desired behavior.

### 2. Workspace binding via `--bind` with overlay technique

**Challenge**: `--ro-bind / /` makes everything read-only. We need `/workspace` to be writable.

**Solution**: The `--bind` option for `/workspace` is applied AFTER the `--ro-bind /`, so it overrides the read-only binding for that specific path. This is how bwrap's binding precedence works — later bindings take precedence.

**Alternative considered**: Using `--overlay` filesystem. More complex, requires upper/lower directories. `--bind` override is simpler.

### 3. Session-per-subprocess model

**Choice**: Each session spawns one `codenano-cli` subprocess running inside bwrap. The subprocess handles all agent interaction for that session.

**Why not thread pool or worker pool?**
- Simplicity: MVP scope
- Isolation: A crash in one session doesn't affect others
- State: codenano session state stays in-process

**Trade-off**: Each session consumes memory and PID space. Acceptable for MVP with low user count.

### 4. JSON-RPC over stdin/stdout

**Choice**: FastAPI ↔ codenano-cli communication via JSON-RPC through stdin/stdout.

**Why not HTTP?**
- codenano-cli already implements JSON-RPC over stdin/stdout in POC
- Simpler process management (no port conflicts)
- Natural streaming via stdout notification messages

**Extension for file browsing**: Add `read_file` and `list_files` RPC methods to codenano-cli.

### 5. SSE for streaming responses

**Choice**: Server-Sent Events for delivering agent output to clients.

**Why not WebSocket?**
- SSE is simpler for one-way server→client streaming
- Works with standard HTTP/1.1
- Easier to debug (plain HTTP)

**Trade-off**: SSE is one-directional. For bi-directional chat, client would poll or use separate endpoint. MVP uses polling for input.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Agent consumes excessive CPU/memory | bwrap does NOT limit resources — future enhancement: add `--ulimit` or cgroups |
| Agent accesses host sensitive files | Namespace isolation prevents writing; read-only `/` is safe but agent can still read sensitive data |
| Session subprocess hangs indefinitely | TTL timeout (30 min default) + client timeout on SSE |
| bwrap not installed on host | Startup check in `main.py` raises error immediately |

## Migration Plan

1. Deploy to EC2 with `bubblewrap` installed: `sudo apt install bubblewrap`
2. Set environment variables: `ANTHROPIC_API_KEY`, optional `SB_TTL_MINUTES`
3. Start service: `uvicorn fastapi.main:app --host 0.0.0.0 --port 8000`
4. Sessions begin at `/tmp/host_sessions/{session_id}/workspace/`
5. **Rollback**: Stop service, cleanup `/tmp/host_sessions/`

## Open Questions

1. **File browsing granularity**: Should API return raw file contents or directory listings? MVP: directory listing + raw file read.
2. **Session migration**: If service restarts, sessions are lost. Acceptable for MVP? Or persist session metadata?
3. **Maximum concurrent sessions**: No limit enforced. CPU/memory is the natural limit on EC2.

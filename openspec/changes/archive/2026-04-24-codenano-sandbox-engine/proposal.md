## Why

Codenano needs to evolve into a multi-session computer use runtime where each session operates in a secure, isolated workspace. The current architecture has fundamental path leakage: `process.cwd()` is used throughout codenano-sdk for instructions loading, skills discovery, and memory hashing, bypassing the assigned workspace. Additionally, executing agent commands directly on the host without isolation poses security risks.

## What Changes

1. **Docker Sandbox Runtime**: Each session launches an isolated Docker container (`codenano-sandbox-{sessionId}`) with resource limits (0.5 CPU, 512MB RAM) and a nonprivileged user
2. **Path Parallax**: LLM sees only `/workspace` (virtual path), mapped to host's physical workspace directory via `-v` mount
3. **Hybrid File Operations**: SDK reads/writes files directly on host via Node.js `fs` (fast, no escaping issues); commands execute inside Docker container
4. **Secure FileTool**: Path sandboxing with `path.resolve()` + `startsWith()` validation to prevent path traversal attacks
5. **UID/GID Alignment**: Container's `agent` user UID matches host API user to avoid permission conflicts

## Capabilities

### New Capabilities

- `docker-sandbox-runtime`: Docker container lifecycle management (create, start, stop, rm) via dockerode SDK
- `path-parallax`: Virtual-to-physical path mapping with security boundary validation
- `sandbox-bash-tool`: BashTool execution proxied through `docker exec -w /workspace {containerId} bash -c "{cmd}"`
- `secure-file-tool`: FileRead/FileWrite/FileEdit tools with path traversal prevention

### Modified Capabilities

- (none)

## Impact

- **codenano-api**: New `/api/v1/sessions` endpoint creates Docker containers and passes container credentials to SDK
- **codenano-sdk**: New `hostWorkspaceDir` context; FileTool and BashTool execute in different contexts
- **New dependency**: `dockerode` package for Docker API access
- **Build artifact**: Custom Docker image `codenano-sandbox` with python:3.10-slim base and agent user

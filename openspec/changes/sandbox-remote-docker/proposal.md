## Why

Currently, `codenano-api` runs Docker sandbox containers locally, requiring Docker to be installed on the same machine as the API server. This prevents scaling the Agent runtime independently from the API layer and limits deployment flexibility. This change moves the Docker runtime to a remote EC2 instance while keeping the API server decoupled.

## What Changes

- API server connects to Docker daemon on a remote EC2 via SSH (no local Docker required)
- Sandbox workspace uses `tmpfs` (in-memory storage) instead of bind mounts — fully stateless, no host filesystem dependency
- File operations (read/write/edit) route through `docker exec` with stdin/stdout streaming
- Path security validation moves inside the container using `realpath --relative-base`
- `SANDBOX_MODE` dual-mode: `local` uses docker socket, `remote` uses SSH tunnel — switchable via env var
- New `utils/sandbox-exec.ts` executor: all `docker exec` calls routed through one place, no global state pollution

## Capabilities

### New Capabilities

- `sandbox-remote-docker`: Agent sandbox runtime hosted on a remote Docker host. Workspace is isolated in-container tmpfs, accessed exclusively via docker exec. No bind mounts, no shared filesystem with host.

## Impact

- `codenano-api/src/utils/sandbox-exec.ts` — **NEW** unified executor for all docker exec calls
- `codenano-api/src/services/docker-service.ts` — SSH-based dockerode connection, tmpfs mount, `SANDBOX_MODE` dual-mode
- `codenano-api/src/tools/sandbox/*.ts` — All tools use `executeCoreCommand` from executor; no direct `spawnSync` calls
- `codenano-api/src/routes/sessions.ts` — workspace directory creation removed (tmpfs auto-manages)
- New env vars: `SANDBOX_MODE` (`local`|`remote`), `DOCKER_HOST_HOST`, `DOCKER_HOST_USER`, `DOCKER_HOST_KEY_PATH`

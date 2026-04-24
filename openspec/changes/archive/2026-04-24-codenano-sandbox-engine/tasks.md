## 1. Docker Sandbox Image

- [x] 1.1 Create Dockerfile for `codenano-sandbox` image based on `ubuntu:24.04`
- [x] 1.2 Install base tools: curl, git, jq, vim, build-essential, ripgrep
- [x] 1.3 Create `agent` user with UID via `HOST_UID` build arg (default 1000), runtime UID passed via `-e HOST_UID`
- [x] 1.4 Set up `/workspace` directory owned by agent user
- [x] 1.5 Configure container keepalive: `CMD ["tail", "-f", "/dev/null"]`
- [x] 1.6 Build and test image locally (manual verification needed)

## 2. codenano-api: Docker Lifecycle Management

- [x] 2.1 Add `dockerode` dependency to `codenano-api`
- [x] 2.2 Create Docker service module (`docker-service.ts`) for container operations
- [x] 2.3 Implement `createContainer(sessionId, physicalPath)` with volume mount and resource limits
- [x] 2.4 Implement `startContainer(containerId)` function
- [x] 2.5 Implement `stopContainer(containerId)` function
- [x] 2.6 Modify `POST /api/v1/sessions` to start Docker container and pass `containerId` to SDK
- [x] 2.7 Modify `DELETE /api/v1/sessions/{sessionId}` to stop and remove container
- [x] 2.8 Add Docker health check on API startup (verify daemon accessible)
- [x] 2.9 Store `containerId` in session registry alongside `cwd`

## 3. codenano-sdk: Path Parallax Infrastructure

- [x] 3.1 Add `hostWorkspaceDir` and `containerId` to `ToolContext` interface
- [x] 3.2 Implement `resolveSecurePhysicalPath(virtualPath, hostWorkspaceDir)` with `realpath()` + `startsWith()` check
- [x] 3.3 Add path validation error type `PathTraversalViolation`
- [x] 3.4 Modify `detectEnvironment()` to accept `cwd` parameter instead of using `process.cwd()`
- [x] 3.5 Modify `loadInstructions()` call sites to pass `cwd` from config
- [x] 3.6 Modify `getMemoryDir()` to accept `cwd` parameter for hash calculation

## 4. codenano-sdk: SandboxFileTools with Path Sandboxing (Host-executed)

**Category**: Tools that execute directly on host via Node.js `fs`. Fast, no escaping issues.

- [x] 4.1 Create SandboxFileTools (SandboxFileReadTool, SandboxFileWriteTool, SandboxFileEditTool) with path sandboxing via `context.hostWorkspaceDir`
- [x] 4.2 Implement `readFile(input, context)` with path sandboxing (virtual → physical path resolution)
- [x] 4.3 Implement `writeFile(input, context)` with path sandboxing
- [x] 4.4 Implement `editFile(input, context)` with path sandboxing (handle old_string/new_string replacement)
- [x] 4.5 Add `sandboxCoreTools()` function that returns FileTools with sandbox support (separate from `coreTools()`)
- [x] 4.6 Ensure `resolveSecurePhysicalPath` is used by all three operations (read/write/edit)

## 5. codenano-sdk: SandboxTool (Container-executed)

**Category**: Tools that execute inside Docker container via `docker exec`. Requires container runtime.

- [x] 5.1 Modify BashTool to proxy through `docker exec`
- [x] 5.2 Implement `buildDockerExecCommand(containerId, command)` helper
- [x] 5.3 Add `timeout` parameter to `spawnSync` call (default: 120s)
- [x] 5.4 Handle timeout error and return helpful message to LLM
- [x] 5.5 Ensure working directory is `/workspace` via `cd /workspace && {command}` wrapper
- [x] 5.6 Add `run_in_background` support for long-running commands
- [x] 5.7 Modify GlobTool to proxy through `docker exec {containerId} bash -c "cd /workspace && find . -name 'pattern'"` (find is used instead of glob internally)
- [x] 5.8 Modify GrepTool to proxy through `docker exec {containerId} bash -c "cd /workspace && rg -- pattern path"` (use `--` to separate options from arguments, preventing escaping issues with single quotes in pattern)

## 7. Integration Testing

- [x] 7.1 Write test: session creation starts container and workspace is accessible
- [x] 7.2 Write test: FileReadTool reads from correct physical path (via resolveSecurePhysicalPath)
- [x] 7.3 Write test: FileWriteTool writes to correct physical path (via resolveSecurePhysicalPath)
- [x] 7.4 Write test: path traversal is blocked for FileTools
- [x] 7.5 Write test: BashTool executes in container with correct cwd
- [x] 7.6 Write test: GlobTool returns files from container /workspace
- [x] 7.7 Write test: GrepTool searches inside container /workspace
- [x] 7.8 Write test: command timeout returns error to LLM
- [x] 7.9 Write test: session deletion stops container
- [x] 7.10 End-to-end test: LLM creates file, edits, runs it via BashTool, gets correct output

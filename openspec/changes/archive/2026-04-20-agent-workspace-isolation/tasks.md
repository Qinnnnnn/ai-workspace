## 1. codenano SDK: Path Validation

- [x] 1.1 Create `src/tools/path-guard.ts` with path validation utility
  - Function to validate absolute paths are within workspace
  - Function to resolve and validate relative paths
  - Function to extract paths from bash commands
  - Blocklist for dangerous commands (rm -rf /, mkfs, dd, etc.)

- [x] 1.2 Add path validation to `src/tools/FileReadTool.ts`
  - Import path-guard
  - Validate path before `fs.readFileSync`
  - Return error if path outside workspace

- [x] 1.3 Add path validation to `src/tools/FileWriteTool.ts`
  - Import path-guard
  - Validate path before `fs.writeFileSync`
  - Return error if path outside workspace

- [x] 1.4 Add path validation to `src/tools/BashTool.ts`
  - Import path-guard
  - Extract paths from command string
  - Validate all paths before execution
  - Reject dangerous commands

## 2. codenano-api: Workspace Lifecycle

- [x] 2.1 Modify `SessionRegistry.create()` in `src/services/session-registry.ts`
  - Generate workspace path: `~/.codenano/workspaces/{session_id}/`
  - Create workspace directory with `fs.mkdirSync`
  - Spawn bwrap-wrapped agent subprocess instead of in-process agent

- [x] 2.2 Create `src/agent-wrapper.js`
  - Entry point for bwrap-spawned agent
  - Parse CLI args for session_id and config
  - Load codenano SDK
  - Initialize agent with workspace-scoped tools
  - Handle IPC via stdin/stdout

- [x] 2.3 Modify `SessionRegistry.destroy()` in `src/services/session-registry.ts`
  - Kill agent subprocess
  - Recursively delete workspace directory

- [x] 2.4 Implement IPC between Fastify and agent subprocess
  - Stream messages via stdin/stdout
  - Convert WebSocket/SSE events to agent input
  - Convert agent output to SSE events

## 3. codenano-api: Configuration

- [x] 3.1 Add WORKSPACE_ROOT env var support
  - Default: `~/.codenano/workspaces/`
  - Allows overriding workspace base directory

- [x] 3.2 Verify bwrap availability at startup
  - Check `bwrap --version` succeeds
  - Fail fast with clear error if not available

## 4. Testing

- [x] 4.1 Add unit tests for path-guard utility
  - Test absolute path validation
  - Test relative path resolution
  - Test bash command path extraction
  - Test dangerous command detection

- [x] 4.2 Integration test: session creates isolated workspace
  - Create session
  - Verify workspace directory exists
  - Verify agent process has workspace bound to `/`

- [x] 4.3 Integration test: agent cannot escape workspace
  - Agent tries to read `/etc/passwd`
  - Verify operation fails

- [x] 4.4 Integration test: workspace cleaned up on destroy
  - Create session with files in workspace
  - Destroy session
  - Verify workspace directory deleted

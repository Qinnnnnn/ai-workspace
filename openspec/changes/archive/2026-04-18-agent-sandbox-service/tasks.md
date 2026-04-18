## 1. Sandbox Configuration

- [x] 1.1 Update `fastapi/sandbox.py` with full filesystem bwrap configuration (`--ro-bind / /`, `--bind workspace /workspace`, `--tmpfs /tmp`)
- [x] 1.2 Add workspace directory creation (`/tmp/host_sessions/{session_id}/workspace/`)
- [x] 1.3 Verify bwrap check function works correctly

## 2. Session Management Updates

- [x] 2.1 Update `fastapi/session_manager.py` to use new sandbox configuration
- [x] 2.2 Ensure session TTL cleanup works with new sandbox lifecycle
- [x] 2.3 Update `SubprocessRegistry.create_session()` to pass workspace path to `build_bwrap_args`

## 3. codenano-cli RPC Extensions

- [x] 3.1 Add `read_file` RPC method to `codenano-cli/src/index.ts`
- [x] 3.2 Add `list_files` RPC method to `codenano-cli/src/index.ts`
- [x] 3.3 Export new RPC types in `codenano-cli/src/rpc-types.ts`
- [x] 3.4 Rebuild codenano-cli (`npm run build`)

## 4. File Browsing API

- [x] 4.1 Create `fastapi/routes/files.py` with endpoints:
  - `GET /api/v1/sessions/{session_id}/files` - list workspace
  - `GET /api/v1/sessions/{session_id}/files/{path:path}` - read file
- [x] 4.2 Implement path traversal prevention
- [x] 4.3 Add session isolation check (user can only access own workspace)

## 5. Configuration

- [x] 5.1 Add `WORKSPACE_BASE_DIR` to `fastapi/config.py` (default: `/tmp/host_sessions`)
- [x] 5.2 Update `.env.example` with all configuration variables

## 6. Unit Testing

- [x] 6.1 Test sandbox.py - bwrap args building, path validation
- [x] 6.2 Test session_manager.py - SessionInfo, SubprocessRegistry
- [x] 6.3 Test file-browsing API - path traversal prevention, session isolation
- [x] 6.4 Test codenano-cli RPC - read_file, list_files path handling

**Note:** Unit tests created for fastapi (pytest) and codenano-cli (vitest).
Integration tests (6.1-6.6 original) require EC2 environment.

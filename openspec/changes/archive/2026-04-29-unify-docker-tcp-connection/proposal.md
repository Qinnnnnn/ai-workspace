## Why

Current Docker connection implementation has three independent code paths (Unix socket, SSH tunnel, CLI spawn) with duplicated configuration logic. This creates inconsistency risks and increases maintenance burden. Unifying all Docker API communication onto a single TCP connection protocol simplifies the architecture while maintaining full functionality.

## What Changes

- **Remove SSH tunnel connection mode** entirely from the codebase
- **Unify local and remote Docker connections** to use TCP protocol exclusively
- **Create centralized Docker configuration module** eliminating duplicated environment variable parsing across 3 files
- **Update environment variables** from SSH-specific configuration to TCP connection parameters
- **Mark BREAKING**: Local Docker daemon now requires TCP listener enabled on `127.0.0.1:2375` (one-time configuration change)

## Capabilities

### New Capabilities
<!-- None - this is purely an implementation refactor, no new user-facing capabilities -->

### Modified Capabilities
<!-- None - sandbox runtime behavior requirements remain unchanged, only connection implementation differs -->

## Impact

- **Affected files**: `docker-service.ts`, `sandbox-exec.ts`, `SandboxBashTool.ts`, `.env.example`
- **Configuration**: New environment variables for TCP host/port, removal of SSH-related variables
- **Deployment**: Local Docker daemon requires one-time TCP listener configuration
- **No API changes**: All existing APIs and sandbox behaviors remain functionally identical

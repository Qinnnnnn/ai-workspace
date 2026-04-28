## Context

The codenano-api service currently implements Docker sandbox functionality using three independent code modules:

1. **docker-service.ts**: Uses dockerode library with separate paths for Unix socket (local) and SSH tunnel (remote)
2. **sandbox-exec.ts**: Uses spawnSync with docker CLI, setting DOCKER_HOST for SSH mode
3. **SandboxBashTool.ts**: Duplicates SSH environment variable logic for background tasks

This duplication creates:
- Inconsistent configuration validation across files
- Potential for connection mismatches (e.g., container created via SSH but exec via socket)
- Increased maintenance overhead
- SSH-specific code that is not needed for LAN deployments

**Constraints**:
- Sandbox container behavior MUST remain unchanged
- All existing tool capabilities (read/write/bash/glob/grep) MUST work identically
- Local development experience should be minimally impacted
- Must support both local (127.0.0.1) and remote LAN Docker hosts

## Goals / Non-Goals

**Goals:**
- Single TCP connection protocol for all Docker communication
- Single code module (docker-service.ts) containing all Docker operations
- Remove all spawnSync docker CLI calls, use dockerode exclusively
- Support both local (127.0.0.1) and remote TCP connections without TLS
- Eliminate all SSH connection code

**Non-Goals:**
- Changing sandbox container behavior or resource limits
- Adding TLS support (out of scope, LAN-only deployment)
- Modifying any tool-level behavior (read/write/bash etc.)
- Retaining spawnSync docker CLI calls
- Creating separate configuration module (configuration is simple enough for docker-service.ts)

## Decisions

**1. Connection Protocol: TCP Only**
- Decision: Remove Unix socket and SSH connection modes entirely
- Rationale: Single protocol reduces code complexity; TCP performance difference on localhost is negligible (<5ms)
- Alternatives considered: Hybrid socket/TCP (rejected due to code complexity)

**2. No Separate Configuration Module**
- Decision: Do NOT create separate docker-config.ts
- Rationale: Configuration logic is simple enough to live directly in docker-service.ts; avoids over-engineering

**3. Exec: Use dockerode Exclusively**
- Decision: Remove spawnSync entirely, use dockerode for all Docker operations including exec
- Rationale: Single code path, no CLI dependency, easier to test, consistent error handling
- Note: dockerode exec uses HTTP API which supports stdin hijack for file writes

**4. File Consolidation**
- Decision: Merge sandbox-exec.ts into docker-service.ts
- Rationale: All Docker operations should be in one place; eliminates duplicate configuration logic

**5. Breaking Change: TCP Configuration Required**
- Decision: Require local Docker daemon to listen on TCP port 2375
- Rationale: One-time configuration cost enables permanent code simplification
- Mitigation: Provide clear documentation and configuration snippet

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Users forget to enable Docker TCP listener | Clear error message with configuration instructions in health check; updated documentation |
| Remote Docker host not accessible on network | Proper error handling with connection timeout; health check endpoint for diagnostics |
| Existing SSH configuration breaks | Remove SSH env vars entirely; clear migration notes in release documentation |

**Trade-offs**:
- ✅ Code simplicity vs one-time configuration (simplicity wins long-term)
- ✅ Single dockerode API vs mixed CLI/API (maintainability wins)
- ✅ Consolidated module vs distributed code (clarity wins)

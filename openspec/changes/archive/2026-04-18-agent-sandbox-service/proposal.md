## Why

Internal users need a zero-setup agentic AI service where they can interact with an AI agent through conversation to generate content (reports, research, code). Each user requires a fully isolated sandbox environment that behaves like a real Linux machine, while keeping the service simple to operate (no Docker, no database, single EC2).

## What Changes

- **New FastAPI service** exposing REST API for session management and agent communication
- **bwrap-based sandbox isolation** providing complete Linux namespace isolation per session
- **Per-session workspace** (`/workspace`) persisted to host filesystem and visible via API
- **Full tool access** for agents: Node.js, Python, compilers, shell commands — no restrictions within sandbox
- **Session TTL management** with automatic cleanup of inactive sessions
- **SSE streaming** for real-time agent output delivery
- **File browsing API** for users to view/manage workspace contents

## Capabilities

### New Capabilities

- `sandbox-isolation`: bwrap Linux namespace isolation providing each session a complete, isolated Linux environment. Agent can install packages, run scripts, use any system tool without affecting the host.
- `session-management`: CRUD operations for agent sessions with configurable TTL. Sessions track user conversation state via codenano.
- `workspace-persistence`: Per-session `/workspace` directory bound to host path, surviving session restarts, visible to users via API.
- `agent-api`: JSON-RPC bridge between FastAPI and codenano-cli, supporting init, send (streaming), history, and close operations.
- `file-browsing`: REST API to list and read files within a session's workspace.

### Modified Capabilities

- None. This is a greenfield service.

## Impact

- **New**: `fastapi/` directory — FastAPI application with session routes, sandbox management, RPC client
- **Modified**: `codenano-cli/` may need additional RPC methods (file browsing)
- **New**: Host directory `/tmp/host_sessions/{session_id}/workspace/` for persisted workspaces
- **Dependency**: Requires `bubblewrap` (`bwrap`) installed on host system
- **Configuration**: Environment variables for API key, session TTL, paths

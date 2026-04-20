## Why

Currently, each agent session in codenano-api shares the host filesystem - agents can read/write anywhere on the system. We need to isolate each session so agents can only access their own workspace, improving both security and functional isolation between sessions.

## What Changes

- Each session gets an isolated workspace at `~/.codenano/workspaces/{session_id}/`
- Sessions are launched inside a bwrap sandbox, with their workspace bound to `/`
- Path validation in codenano SDK tools prevents access outside workspace
- Session persistence stored within the workspace (`~/.codenano/workspaces/{session_id}/.codenano/`)
- Full lifecycle management: workspace creation, agent startup, cleanup on session destroy

## Capabilities

### New Capabilities

- `session-workspace-isolation`: Each agent session operates in an isolated filesystem sandbox. Agents see only their workspace directory (mapped to `/`) and cannot access host files or other sessions' workspaces.

## Impact

- **codenano-api**: `session-registry.ts` - Modified to spawn bwrap-wrapped agent processes and manage workspace lifecycle
- **codenano SDK**: Tool implementations (`BashTool`, `FileReadTool`, `FileWriteTool`) gain path validation guards
- **New files**: `agent-wrapper.js` in codenano-api for bwrap process spawning

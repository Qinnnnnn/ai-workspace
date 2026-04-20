# Migration Guide: codenano-api Library Refactor

## Overview

This document describes API changes from the codenano-api library refactor that removed the subprocess/bwrap layer in favor of direct SDK integration.

## Breaking Changes

### None

The HTTP API surface remains unchanged. All existing clients should continue to work without modification.

## Removed Components

### Dependencies

- **bwrap**: No longer required. Path isolation is handled by codenano's built-in `path-guard`.

### Files

- `src/agent-wrapper.js` — Removed (was subprocess orchestrator)
- `src/services/session-registry.ts` (old) — Replaced with lightweight version
- `src/services/hook-coordinator.ts` (old) — Moved to `src/hooks/hook-coordinator.ts`

## New API Routes

The following routes were added in this release:

| Route | Method | Description |
|-------|--------|-------------|
| `/api/v1/tools` | POST | Define custom tools |
| `/api/v1/tools` | GET | List custom tools |
| `/api/v1/tools/:name` | GET | Get tool by name |
| `/api/v1/tools/:name` | DELETE | Delete tool |
| `/api/v1/cost/pricing` | GET | Get model pricing |
| `/api/v1/cost/calculate` | POST | Calculate usage cost |
| `/api/v1/git/state` | GET | Get git repository state |
| `/api/v1/skills` | GET | List available skills |
| `/api/v1/skills/:name` | GET | Get skill content |
| `/api/v1/skills/expand` | POST | Expand skill template |

## Internal Changes

### Session Registry

The session registry was simplified:

- `create()` — Now registers a placeholder entry, actual agent/session creation happens in routes
- `register(sessionId, agent, session)` — New method to register actual agent/session

### Agent Factory

Agent creation moved from `agent-wrapper.js` to `src/agent.ts`:

```typescript
import { createAgentInstance } from './agent.js'

const agent = createAgentInstance({
  model: 'claude-sonnet-4-6',
  toolPreset: 'core',
  toolPermissions: {},
  hookCoordinator: null,
})
```

## Deployment Changes

### Before

```bash
# Required: bwrap sandbox
apt install bwrap
```

### After

```bash
# bwrap no longer required
npm install
npm run build
npm start
```

## Testing

Run the test suite to verify the refactor:

```bash
npm test
```

Expected: 41 tests passing

## Verification Checklist

- [x] Session CRUD operations work
- [x] Message streaming (SSE) works
- [x] WebSocket hook callbacks work
- [x] Path-guard blocks workspace escapes
- [x] All new API routes respond correctly
- [x] Memory operations work
- [x] MCP integration works
- [x] API documentation updated
- [x] Migration notes added

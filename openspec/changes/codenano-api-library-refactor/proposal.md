## Why

codenano-api currently wraps codenano as a subprocess with bwrap sandbox, adding unnecessary complexity. codenano's built-in `path-guard` already provides sufficient path validation for workspace isolation, making bwrap and subprocess management overkill. Direct library integration simplifies the architecture, enables full API coverage of codenano's capabilities, and reduces deployment dependencies.

## What Changes

- **Remove** subprocess spawning and bwrap sandbox infrastructure
- **Remove** `agent-wrapper.js`, `session-registry.ts` (process management)
- **Remove** JSON stdin/stdout protocol layer
- **Migrate** to direct TypeScript import of codenano modules
- **Simplify** session management to codenano's built-in `SessionImpl`
- **Maintain** all HTTP API routes with direct library calls
- **Preserve** WebSocket hook coordinator for permission decisions
- **Enhance** API coverage to expose codenano's full capabilities

## Capabilities

### New Capabilities

- `direct-integration`: Direct TypeScript library integration with codenano, replacing subprocess orchestration
- `enhanced-api`: Full API surface exposing codenano capabilities not previously available (custom tools, cost tracking, skills, git integration)
- `stream-management`: Native streaming support using codenano's `StreamingToolExecutor`

### Modified Capabilities

- (none - this is a refactor with no specification-level behavior changes)

## Impact

**Removed components:**
- `codenano-api/src/agent-wrapper.js` - subprocess wrapper
- `codenano-api/src/services/session-registry.ts` - process lifecycle management

**Simplified components:**
- `codenano-api/src/services/hook-coordinator.ts` - becomes simpler without process IPC
- Session routes - direct library calls instead of JSON protocol

**Dependencies reduced:**
- bwrap runtime dependency removed

**New API coverage:**
- `/api/v1/tools` - custom tool definition
- `/api/v1/cost` - cost tracking
- `/api/v1/git` - git integration
- `/api/v1/skills` - skills management
- `/api/v1/prompt` - prompt building

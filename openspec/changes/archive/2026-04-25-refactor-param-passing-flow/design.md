## Context

Currently, runtime context is encoded via scattered optional fields:
```typescript
interface AgentConfig {
  cwd?: string
  hostWorkspaceDir?: string
  containerId?: string
  // ...
}
```

This allows invalid states at type level. Validation must happen at runtime.

## Goals / Non-Goals

**Goals:**
- Compile-time enforcement of runtime context completeness
- Type-safe branching based on discriminator
- Self-documenting call sites
- Eliminate runtime validation for context fields

**Non-Goals:**
- Change codenano's core agent logic
- Modify tool implementations (only tool selection strategy changes)
- Add new runtime modes beyond local/sandbox

## Decisions

1. **Discriminated union with exhaustive branches**
   ```typescript
   type RuntimeContext =
     | { type: 'local'; cwd: string }
     | { type: 'sandbox'; cwd: string; hostWorkspaceDir: string; containerId: string }
   ```

2. **Runtime context in AgentConfig**
   ```typescript
   interface AgentConfig {
     runtime: RuntimeContext
     // ... other config fields
   }
   ```

3. **Type-safe dispatch in createAgentInstance**
   ```typescript
   function createAgentInstance(config: AgentConfig): Agent {
     if (config.runtime?.type === 'sandbox') {
       return createAgent({
         ...config,
         tools: sandboxCoreTools()
         // runtime is passed through; sandbox tools access context.runtime.*
       })
     }
     return createAgent({
       ...config,
       tools: coreTools()
     })
   }
   ```

4. **API layer builds RuntimeContext**
   - Session creation: builds `{ type: 'sandbox', ... }` for Docker containers
   - Direct CLI: builds `{ type: 'local', cwd: process.cwd() }`

## Risks / Trade-offs

- [Risk] All existing call sites must be updated → Mitigation: incremental migration, type errors guide changes
- [Risk] Discriminated union adds indirection → Mitigation: single source of truth in RuntimeContext type
## Why

The current config model scatters runtime context fields (`cwd`, `hostWorkspaceDir`, `containerId`) as optional top-level fields in `AgentConfig`. This allows invalid combinations: e.g., having `containerId` without `hostWorkspaceDir`, or setting `cwd` in sandbox mode. Runtime context determination requires runtime checks and manual validation.

## What Changes

1. **Unified RuntimeContext type**: Replace scattered optional fields with a discriminated union
   - `local` mode: `{ type: 'local', cwd: string }`
   - `sandbox` mode: `{ type: 'sandbox', virtualCwd: string, hostDir: string, containerId: string }`
2. **Compile-time safety**: Missing required fields in a discriminated branch cause TypeScript errors
3. **Type-safe branching**: Runtime context type determines tool selection and context construction at compile time
4. **Self-documenting calls**: Call sites explicitly declare their runtime mode, no implicit assumptions

## Capabilities

### New Capabilities

- `runtime-context-type`: Discriminated union type for runtime context with compile-time safety

### Modified Capabilities

- `agent-api`: AgentConfig includes `runtime: RuntimeContext` instead of scattered cwd/containerId fields

## Impact

- **codenano types**: `AgentConfig.runtime` field added
- **codenano-api**: Session creation builds `runtime` object, passes to `createAgentInstance`
- **All call sites**: Must specify `{ type: 'local' }` or `{ type: 'sandbox', ... }` explicitly
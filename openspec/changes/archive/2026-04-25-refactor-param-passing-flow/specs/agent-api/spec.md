## MODIFIED Requirements

### Requirement: Config passthrough to AgentConfig

**FROM:**
> Config fields are passed directly to `createAgent()` with minimal transformation. Only sandbox-specific fields (`cwd`, `hostWorkspaceDir`, `containerId`) are added by the service layer.

**TO:**
> The service SHALL accept session creation config matching codenano's `AgentConfig` type, which includes a `runtime` field of type `RuntimeContext`. The runtime context is either:
> - `local`: `{ type: 'local', cwd: string }` for direct execution
> - `sandbox`: `{ type: 'sandbox', cwd: string, hostWorkspaceDir: string, containerId: string }` for Docker-isolated execution

#### Scenario: Local runtime config
- **WHEN** caller creates a session with `runtime: { type: 'local', cwd: '/project' }`
- **THEN** `createAgent()` receives `cwd: '/project'` and local tools

#### Scenario: Sandbox runtime config
- **WHEN** caller creates a session with `runtime: { type: 'sandbox', cwd: '/workspace', hostWorkspaceDir: '/host/path', containerId: 'abc' }`
- **THEN** `createAgent()` receives sandbox tools and the runtime context is passed through for sandbox tools to access `runtime.cwd`, `runtime.hostWorkspaceDir`, and `runtime.containerId`

### Requirement: RuntimeContext discriminated union

**FROM:**
> (no such requirement)

**TO:**
> `RuntimeContext` SHALL be a discriminated union with exactly two variants: `local` and `sandbox`. TypeScript MUST enforce that all required fields are present in each variant.

#### Scenario: Sandbox requires containerId
- **WHEN** a config has `runtime.type === 'sandbox'` but missing `containerId`
- **THEN** TypeScript compilation fails with type error

#### Scenario: Local does not allow hostWorkspaceDir
- **WHEN** a config has `runtime.type === 'local'` with `hostWorkspaceDir` field
- **THEN** TypeScript compilation fails with type error

#### Scenario: Exhaustive branching
- **WHEN** a switch case checks `runtime.type`
- **THEN** TypeScript ensures all variants are handled (no implicit 'never' types)

### Requirement: Type-safe runtime dispatch

**FROM:**
> (no such requirement)

**TO:**
> `createAgentInstance` SHALL branch on `runtime.type` to select appropriate tools and build the correct context object.

#### Scenario: Sandbox mode selects sandbox tools
- **WHEN** `config.runtime.type === 'sandbox'`
- **THEN** `createAgent()` is called with sandbox tools and sandbox context fields

#### Scenario: Local mode selects local tools
- **WHEN** `config.runtime.type === 'local'`
- **THEN** `createAgent()` is called with local tools and `cwd` field only
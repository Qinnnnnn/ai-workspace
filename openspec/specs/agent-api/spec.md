## Purpose

Agent API for session creation with tool presets, runtime context configuration, and type-safe dispatching. The agent-service directly wraps codenano SDK via `createAgent()` — no JSON-RPC bridge or external subprocess.

## Requirements

### Requirement: Session accepts toolPreset parameter

The agent-service SHALL accept an optional `toolPreset` field in the session creation config. When provided, the value MUST be one of: `"core"`, `"extended"`, `"all"`. When omitted, the default value `"core"` SHALL be used. The value is passed directly to `createAgent({ toolPreset: "..." })`.

#### Scenario: toolPreset omitted uses core
- **WHEN** caller creates a session with `POST /api/v1/sessions` and no `toolPreset` field in config
- **THEN** the agent is initialized with `coreTools()`

#### Scenario: toolPreset set to extended
- **WHEN** caller creates a session with `POST /api/v1/sessions` and `config.toolPreset: "extended"`
- **THEN** the agent is initialized with `extendedTools()`

#### Scenario: toolPreset set to all
- **WHEN** caller creates a session with `POST /api/v1/sessions` and `config.toolPreset: "all"`
- **THEN** the agent is initialized with `allTools()`

#### Scenario: Invalid toolPreset value
- **WHEN** caller creates a session with `POST /api/v1/sessions` and `config.toolPreset: "invalid"`
- **THEN** the service SHALL return a validation error with message containing "Invalid tool preset"

### Requirement: Tool preset defaults to core

If session creation config omits `toolPreset`, the default value `"core"` is used when calling `createAgent`.

#### Scenario: Default core when not specified
- **WHEN** session creation config has no `toolPreset`
- **THEN** the agent is initialized with `coreTools()`

### Requirement: Config passthrough to AgentConfig

The service SHALL accept session creation config matching codenano's `AgentConfig` type, which includes a `runtime` field of type `RuntimeContext`. The runtime context is either:
- `local`: `{ type: 'local', cwd: string }` for direct execution
- `sandbox`: `{ type: 'sandbox', cwd: string, hostWorkspaceDir: string, containerId: string }` for Docker-isolated execution

#### Scenario: Local runtime config
- **WHEN** caller creates a session with `runtime: { type: 'local', cwd: '/project' }`
- **THEN** `createAgent()` receives `cwd: '/project'` and local tools

#### Scenario: Sandbox runtime config
- **WHEN** caller creates a session with `runtime: { type: 'sandbox', cwd: '/workspace', hostWorkspaceDir: '/host/path', containerId: 'abc' }`
- **THEN** `createAgent()` receives sandbox tools and the runtime context is passed through for sandbox tools to access `runtime.cwd`, `runtime.hostWorkspaceDir`, and `runtime.containerId`

### Requirement: RuntimeContext discriminated union

`RuntimeContext` SHALL be a discriminated union with exactly two variants: `local` and `sandbox`. TypeScript MUST enforce that all required fields are present in each variant.

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

`createAgentInstance` SHALL branch on `runtime.type` to select appropriate tools and build the correct context object.

#### Scenario: Sandbox mode selects sandbox tools
- **WHEN** `config.runtime.type === 'sandbox'`
- **THEN** `createAgent()` is called with sandbox tools and sandbox context fields

#### Scenario: Local mode selects local tools
- **WHEN** `config.runtime.type === 'local'`
- **THEN** `createAgent()` is called with local tools and `cwd` field only

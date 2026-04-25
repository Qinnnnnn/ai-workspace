## Purpose

TBD

## ADDED Requirements

### Requirement: Session accepts toolPreset parameter

codenano-service SHALL accept an optional `toolPreset` field in the session creation request body. When provided, the value MUST be one of: `"core"`, `"extended"`, `"all"`. When omitted, the default value `"core"` SHALL be used.

#### Scenario: toolPreset omitted uses core
- **WHEN** caller creates a session with `POST /api/v1/sessions` and no `toolPreset` field in body
- **THEN** codenano-cli initializes the agent with `coreTools()`

#### Scenario: toolPreset set to core
- **WHEN** caller creates a session with `POST /api/v1/sessions` and `toolPreset: "core"`
- **THEN** codenano-cli initializes the agent with `coreTools()`

#### Scenario: toolPreset set to extended
- **WHEN** caller creates a session with `POST /api/v1/sessions` and `toolPreset: "extended"`
- **THEN** codenano-cli initializes the agent with `extendedTools()`

#### Scenario: toolPreset set to all
- **WHEN** caller creates a session with `POST /api/v1/sessions` and `toolPreset: "all"`
- **THEN** codenano-cli initializes the agent with `allTools()`

#### Scenario: Invalid toolPreset value
- **WHEN** caller creates a session with `POST /api/v1/sessions` and `toolPreset: "invalid"`
- **THEN** codenano-cli SHALL reject the init and return an error with message containing "Invalid tool preset"

### Requirement: Tool preset is passed through init RPC

The `toolPreset` value SHALL be passed from codenano-service to codenano-cli via the `init` RPC call as part of the config object, under the key `toolPreset`.

#### Scenario: toolPreset passed in init config
- **WHEN** codenano-service calls `init` with config containing `toolPreset: "extended"`
- **THEN** codenano-cli receives the config with `toolPreset: "extended"` preserved in the params

### Requirement: Tool preset defaults to core

If codenano-service receives a session creation request without `toolPreset`, it SHALL default to `"core"` when calling codenano-cli's init RPC.

#### Scenario: Default core when not specified
- **WHEN** codenano-service has no toolPreset in session creation request
- **THEN** the init config sent to codenano-cli contains `toolPreset: "core"`

## MODIFIED Requirements

### Requirement: Session accepts toolPreset parameter

**FROM:**
> codenano-service SHALL accept an optional `toolPreset` field in the session creation request body. When provided, the value MUST be one of: `"core"`, `"extended"`, `"all"`. When omitted, the default value `"core"` SHALL be used.

**TO:**
> The agent-service SHALL accept an optional `toolPreset` field in the session creation config. When provided, the value MUST be one of: `"core"`, `"extended"`, `"all"`. When omitted, the default value `"core"` SHALL be used. The value is passed directly to `createAgent({ toolPreset: "..." })`.

#### Scenario: toolPreset omitted uses core
- **WHEN** caller creates a session with `POST /api/v1/sessions` and no `toolPreset` field in config
- **THEN** the agent is initialized with `coreTools()`

#### Scenario: toolPreset set to extended
- **WHEN** caller creates a session with `POST /api/v1/sessions` and `config.toolPreset: "extended"`
- **THEN** the agent is initialized with `extendedTools()`

#### Scenario: Invalid toolPreset value
- **WHEN** caller creates a session with `POST /api/v1/sessions` and `config.toolPreset: "invalid"`
- **THEN** the service SHALL return a validation error with message containing "Invalid tool preset"

### Requirement: Tool preset is passed through AgentConfig

**FROM:**
> The `toolPreset` value SHALL be passed from codenano-service to codenano-cli via the `init` RPC call as part of the config object, under the key `toolPreset`.

**TO:**
> The `toolPreset` value is passed directly to `createAgent({ toolPreset: "..." })` — no intermediate RPC layer.

#### Scenario: toolPreset in AgentConfig
- **WHEN** session creation config contains `toolPreset: "extended"`
- **THEN** `createAgent` receives `toolPreset: "extended"` in its config object

### Requirement: Tool preset defaults to core

**FROM:**
> If codenano-service receives a session creation request without `toolPreset`, it SHALL default to `"core"` when calling codenano-cli's init RPC.

**TO:**
> If session creation config omits `toolPreset`, the default value `"core"` is used when calling `createAgent`.

#### Scenario: Default core when not specified
- **WHEN** session creation config has no `toolPreset`
- **THEN** the agent is initialized with `coreTools()`

## REMOVED Requirements

### Requirement: JSON-RPC init method

**Reason**: The JSON-RPC bridge (codenano-cli) is removed. Agent initialization now happens directly in the Node.js service via `createAgent()`.

### Requirement: JSON-RPC send method with streaming

**Reason**: Replaced by `POST /api/v1/sessions/:id/message` with SSE streaming directly to the HTTP client.

### Requirement: JSON-RPC history method

**Reason**: Replaced by `GET /api/v1/sessions/:id/history`.

### Requirement: JSON-RPC close method

**Reason**: Replaced by `DELETE /api/v1/sessions/:id`.

### Requirement: JSON-RPC list_sessions method

**Reason**: Replaced by `GET /api/v1/sessions`.

### Requirement: Stream notifications

**Reason**: Notifications are now SSE events delivered directly over HTTP, not JSON-RPC stdout notifications.

### Requirement: REST API for session message

**Reason**: This is now handled by the new service directly — requirement remains but implementation changes from codenano-cli to agent-service.

### Requirement: REST API for session history

**Reason**: This is now handled by the new service directly — requirement remains but implementation changes from codenano-cli to agent-service.

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

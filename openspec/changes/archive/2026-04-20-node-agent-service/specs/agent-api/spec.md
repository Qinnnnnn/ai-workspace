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

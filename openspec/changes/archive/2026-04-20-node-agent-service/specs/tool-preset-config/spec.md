## MODIFIED Requirements

### Requirement: Session accepts toolPreset parameter

**FROM:**
> codenano-service SHALL accept an optional `toolPreset` field in the session creation request body. When provided, the value MUST be one of: `"core"`, `"extended"`, `"all"`. When omitted, the default value `"core"` SHALL be used.

**TO:**
> The agent-service SHALL accept `toolPreset` as part of the AgentConfig in `POST /api/v1/sessions` body. When provided, the value MUST be one of: `"core"`, `"extended"`, `"all"`. When omitted, the default value `"core"` SHALL be used. The value is passed directly to `createAgent({ toolPreset: "..." })` which internally selects the appropriate tools array.

#### Scenario: toolPreset omitted uses core
- **WHEN** caller creates a session with no `toolPreset` in config
- **THEN** the agent is initialized with `coreTools()`

#### Scenario: toolPreset set to extended
- **WHEN** caller creates a session with `config.toolPreset: "extended"`
- **THEN** the agent is initialized with `extendedTools()`

#### Scenario: toolPreset set to all
- **WHEN** caller creates a session with `config.toolPreset: "all"`
- **THEN** the agent is initialized with `allTools()`

#### Scenario: Invalid toolPreset value
- **WHEN** caller creates a session with `config.toolPreset: "invalid"`
- **THEN** a validation error is returned with message containing "Invalid tool preset"

### Requirement: Tool preset defaults to core

**FROM:**
> If codenano-service receives a session creation request without `toolPreset`, it SHALL default to `"core"` when calling codenano-cli's init RPC.

**TO:**
> If session creation config omits `toolPreset`, the default value `"core"` is used when calling `createAgent`.

#### Scenario: Default core when not specified
- **WHEN** session creation config has no `toolPreset`
- **THEN** the agent is initialized with `coreTools()`

## REMOVED Requirements

### Requirement: Tool preset is passed through init RPC

**Reason**: codenano-cli JSON-RPC layer is removed. `toolPreset` is passed directly to `createAgent()` in the same Node.js process.

#### Migration: Use direct SDK config
- **FROM**: `codenano-service` → `codenano-cli` via JSON-RPC `init` → `createAgent({ toolPreset })`
- **TO**: `agent-service` calls `createAgent({ toolPreset })` directly

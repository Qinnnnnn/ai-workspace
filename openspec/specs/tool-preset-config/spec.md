## Purpose

Agent tool preset configuration for selecting which tools are available to the agent. Tool presets are passed directly to `createAgent()` — no JSON-RPC bridge or external subprocess.

## Requirements

### Requirement: Session accepts toolPreset parameter

The agent-service SHALL accept `toolPreset` as part of the AgentConfig in `POST /api/v1/sessions` body. When provided, the value MUST be one of: `"core"`, `"extended"`, `"all"`. When omitted, the default value `"core"` SHALL be used. The value is passed directly to `createAgent({ toolPreset: "..." })` which internally selects the appropriate tools array.

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

If session creation config omits `toolPreset`, the default value `"core"` is used when calling `createAgent`.

#### Scenario: Default core when not specified
- **WHEN** session creation config has no `toolPreset`
- **THEN** the agent is initialized with `coreTools()`

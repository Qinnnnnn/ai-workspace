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

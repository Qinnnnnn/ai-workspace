## Purpose

Support creating agent sessions in local mode without Docker isolation. Local mode is intended for development/debugging and uses the host filesystem directly with `toolPreset` controlling tool selection.

## ADDED Requirements

### Requirement: Session creation accepts sandbox config

The system SHALL accept a `sandbox` boolean field in `SessionCreateConfig`. When omitted, the default value `true` SHALL be used for backward compatibility.

#### Scenario: sandbox config defaults to true
- **WHEN** caller creates a session with no `sandbox` field in config
- **THEN** the session is created in sandbox mode (with Docker container)

#### Scenario: sandbox explicitly set to false
- **WHEN** caller creates a session with `config.sandbox: false`
- **THEN** the session is created in local mode (no Docker container)

#### Scenario: sandbox explicitly set to true
- **WHEN** caller creates a session with `config.sandbox: true`
- **THEN** the session is created in sandbox mode (with Docker container)

### Requirement: Local mode skips Docker container creation

When `sandbox: false`, the system SHALL NOT create or start any Docker container for the session.

#### Scenario: Local session does not call Docker
- **WHEN** a session is created with `sandbox: false`
- **THEN** `createContainer()` SHALL NOT be called
- **AND** `startContainer()` SHALL NOT be called

### Requirement: Local mode uses local RuntimeContext

When `sandbox: false`, the system SHALL construct a `RuntimeContext` with `type: 'local'` and `cwd` set to the session's physical workspace directory.

#### Scenario: Local RuntimeContext structure
- **WHEN** a session is created with `sandbox: false`
- **THEN** the RuntimeContext SHALL be `{ type: 'local', cwd: physicalPath }`
- **WHERE** `physicalPath` is `~/.agent-core/workspaces/{sessionId}`

### Requirement: Local mode respects toolPreset config

When `sandbox: false`, the system SHALL use `toolPreset` to select tools (core / extended / all) via `TOOL_PRESETS`.

#### Scenario: Local session with toolPreset core
- **WHEN** a session is created with `sandbox: false` and `toolPreset: 'core'`
- **THEN** the agent is initialized with `coreTools()`

#### Scenario: Local session with toolPreset extended
- **WHEN** a session is created with `sandbox: false` and `toolPreset: 'extended'`
- **THEN** the agent is initialized with `extendedTools()`

#### Scenario: Local session with toolPreset all
- **WHEN** a session is created with `sandbox: false` and `toolPreset: 'all'`
- **THEN** the agent is initialized with `allTools()`

### Requirement: Local mode creates workspace directory

When `sandbox: false`, the system SHALL create the workspace directory at `~/.agent-core/workspaces/{sessionId}` for file operations.

#### Scenario: Local workspace directory created
- **WHEN** a session is created with `sandbox: false`
- **THEN** a workspace directory at `~/.agent-core/workspaces/{sessionId}/` SHALL be created
- **AND** the directory path SHALL be stored in the session registry

### Requirement: Local session returns sandboxEnabled: false

When `sandbox: false`, the API response SHALL include `sandboxEnabled: false` and no `containerId`.

#### Scenario: Local session response
- **WHEN** a session is created with `sandbox: false`
- **THEN** the response SHALL include `sandboxEnabled: false`
- **AND** the response SHALL NOT include `containerId`

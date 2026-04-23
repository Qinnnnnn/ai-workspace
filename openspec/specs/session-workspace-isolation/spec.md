## Purpose

Per-session workspace isolation via explicit `ToolContext.cwd` configuration. Each session has an isolated workspace directory at `~/.agent-core/workspaces/{sessionId}` and tools access workspace through `context.cwd` rather than global state.

## ADDED Requirements

### Requirement: Per-session workspace directory

Each session SHALL have an isolated workspace directory at `~/.agent-core/workspaces/{sessionId}`. The workspace directory SHALL be created when the session is created.

#### Scenario: Workspace created on session creation
- **WHEN** a new session is created via `POST /api/v1/sessions`
- **THEN** a workspace directory at `~/.agent-core/workspaces/{sessionId}/` SHALL be created
- **AND** the workspace path SHALL be stored in the session registry

#### Scenario: Workspace path returned in API response
- **WHEN** session details are retrieved via `GET /api/v1/sessions/{id}` or `GET /api/v1/sessions`
- **THEN** the response SHALL include `cwd` field with the workspace directory path

### Requirement: Workspace isolation in tools

File operation tools SHALL be constrained to operate only within the session's workspace directory. The workspace path SHALL be passed via `ToolContext.cwd` and tools SHALL execute commands with `cwd` set to this value.

#### Scenario: FileReadTool uses context cwd
- **WHEN** FileReadTool executes
- **THEN** it SHALL use `context.cwd` for path validation
- **AND** paths outside `context.cwd` SHALL be rejected with an error

#### Scenario: FileWriteTool uses context cwd
- **WHEN** FileWriteTool executes
- **THEN** it SHALL use `context.cwd` for path validation
- **AND** write operations outside `context.cwd` SHALL be rejected with an error

#### Scenario: BashTool uses context cwd for execution
- **WHEN** BashTool executes
- **THEN** it SHALL use `context.cwd` for command validation via path-guard
- **AND** `execSync`/`exec` SHALL be called with `cwd: context.cwd` option
- **AND** commands referencing paths outside `context.cwd` SHALL be rejected with an error

#### Scenario: GlobTool uses context cwd for search directory
- **WHEN** GlobTool executes
- **THEN** it SHALL use `context.cwd` as the default search directory
- **AND** `execSync` SHALL be called with `cwd: context.cwd` option

#### Scenario: GrepTool uses context cwd for search path
- **WHEN** GrepTool executes
- **THEN** it SHALL use `context.cwd` as the default search path
- **AND** `execSync` SHALL be called with `cwd: context.cwd` option

### Requirement: Workspace cleanup on session deletion

When a session is deleted via `DELETE /api/v1/sessions/{id}`, the workspace directory SHALL be recursively deleted along with the session data.

#### Scenario: Workspace deleted with session
- **WHEN** a session is deleted via `DELETE /api/v1/sessions/{id}`
- **THEN** the workspace directory at `~/.agent-core/workspaces/{sessionId}/` SHALL be deleted
- **AND** any files within the workspace SHALL be removed

#### Scenario: Concurrent sessions have isolated workspaces
- **WHEN** two sessions are active simultaneously
- **THEN** each session SHALL have a separate workspace directory
- **AND** file operations in one session SHALL NOT affect files in another session

### Requirement: ToolContext uses cwd field

The `ToolContext` interface SHALL include a `cwd` field of type `string`. This field SHALL be populated by the tool executor from `AgentConfig.cwd` and SHALL be used by tools as the session's working directory.

#### Scenario: ToolContext contains cwd
- **WHEN** a tool's execute function is called
- **THEN** the `ToolContext` SHALL contain `cwd: string`
- **AND** the value SHALL match `AgentConfig.cwd`

#### Scenario: Tool executor sets cwd from config
- **WHEN** the tool executor builds `ToolContext`
- **THEN** the `cwd` field SHALL be set to `config.cwd ?? ''`

### Requirement: AgentConfig uses cwd parameter

The `AgentConfig` interface SHALL include a `cwd` field of type `string`. This field is optional and defaults to empty string, allowing tools to fall back to process default behavior.

#### Scenario: AgentConfig accepts cwd
- **WHEN** `createAgent()` is called with `cwd` parameter
- **THEN** the `cwd` value SHALL be passed to tools via `ToolContext.cwd`
- **AND** tools SHALL execute commands in the specified directory

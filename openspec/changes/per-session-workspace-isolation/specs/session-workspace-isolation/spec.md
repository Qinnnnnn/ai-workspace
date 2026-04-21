# Session Workspace Isolation

## ADDED Requirements

### Requirement: Per-session workspace directory

Each session SHALL have an isolated workspace directory at `~/.agent-core/workspaces/{sessionId}`. The workspace directory SHALL be created when the session is created.

#### Scenario: Workspace created on session creation
- **WHEN** a new session is created via `POST /api/v1/sessions`
- **THEN** a workspace directory at `~/.agent-core/workspaces/{sessionId}/` SHALL be created
- **AND** the workspace path SHALL be stored in the session registry

#### Scenario: Workspace path returned in API response
- **WHEN** session details are retrieved via `GET /api/v1/sessions/{id}` or `GET /api/v1/sessions`
- **THEN** the response SHALL include `workspace` field with the workspace directory path

### Requirement: Workspace isolation in tools

File operation tools SHALL be constrained to operate only within the session's workspace directory. The workspace path SHALL be passed via `ToolContext.workspace` and NOT via global state.

#### Scenario: FileReadTool uses context workspace
- **WHEN** FileReadTool executes
- **THEN** it SHALL use `context.workspace` for path validation
- **AND** paths outside workspace SHALL be rejected with an error

#### Scenario: FileWriteTool uses context workspace
- **WHEN** FileWriteTool executes
- **THEN** it SHALL use `context.workspace` for path validation
- **AND** write operations outside workspace SHALL be rejected with an error

#### Scenario: BashTool uses context workspace
- **WHEN** BashTool executes
- **THEN** it SHALL use `context.workspace` for command validation
- **AND** commands referencing paths outside workspace SHALL be rejected with an error

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

### Requirement: ToolContext includes workspace

The `ToolContext` interface SHALL include a `workspace` field of type `string`. This field SHALL be populated by the tool executor from `AgentConfig.workspace`.

#### Scenario: ToolContext contains workspace
- **WHEN** a tool's execute function is called
- **THEN** the `ToolContext` SHALL contain `workspace: string`
- **AND** the value SHALL match `AgentConfig.workspace`

### Requirement: AgentConfig includes workspace parameter

The `AgentConfig` interface SHALL include a `workspace` field of type `string`. This field is required and SHALL NOT fallback to environment variables or default paths.

#### Scenario: createAgent requires workspace
- **WHEN** `createAgent()` is called without `workspace` parameter
- **THEN** an error SHALL be thrown indicating workspace is required

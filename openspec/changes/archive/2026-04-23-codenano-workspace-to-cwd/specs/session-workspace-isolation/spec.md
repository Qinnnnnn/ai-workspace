## MODIFIED Requirements

### Requirement: Per-session workspace directory

Each session SHALL have an isolated workspace directory at `~/.agent-core/workspaces/{sessionId}`. The workspace directory SHALL be created when the session is created.

#### Scenario: Workspace created on session creation
- **WHEN** a new session is created via `POST /api/v1/sessions`
- **THEN** a workspace directory at `~/.agent-core/workspaces/{sessionId}/` SHALL be created
- **AND** the workspace path SHALL be stored in the session registry

#### Scenario: Workspace path returned in API response
- **WHEN** session details are retrieved via `GET /api/v1/sessions/{id}` or `GET /api/v1/sessions`
- **THEN** the response SHALL include `cwd` field with the workspace directory path

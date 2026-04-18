## Purpose

Provide persistent workspace directories for agent sessions, allowing files to survive session restarts and be accessible to users.

## ADDED Requirements

### Requirement: Workspace bound to host path

Each session SHALL have a `/workspace` directory that is bound to a host path (`/tmp/host_sessions/{session_id}/workspace/`). The workspace SHALL be created automatically when the session is created.

### Requirement: Workspace survives session restarts

Files written to `/workspace` SHALL persist on the host filesystem and remain accessible after the session subprocess restarts.

### Requirement: Workspace is session-specific

Each session SHALL have its own isolated workspace directory. Session A SHALL NOT be able to access Session B's workspace.

### Requirement: Workspace visible to users

The workspace directory and its contents SHALL be accessible via the file browsing API.

### Requirement: Agent uses workspace as working directory

The sandbox SHALL start with `/workspace` as the current working directory (`--chdir /workspace`).

## ADDED Scenarios

#### Scenario: Agent creates file in workspace

- **WHEN** agent creates `/workspace/research.md`
- **THEN** the file is visible on the host at `/tmp/host_sessions/{session_id}/workspace/research.md`

#### Scenario: File persists after session restart

- **WHEN** a session's subprocess restarts (e.g., agent crash)
- **THEN** files in `/workspace` are still present
- **THEN** the agent can continue working with existing files

#### Scenario: Session A cannot access Session B's workspace

- **WHEN** session A attempts to read `/workspace/../{session_B}/important.txt`
- **THEN** the operation fails or returns no such file
- **THEN** session B's workspace remains isolated

#### Scenario: Agent's working directory is workspace

- **WHEN** agent checks current directory with `pwd`
- **THEN** the result is `/workspace`

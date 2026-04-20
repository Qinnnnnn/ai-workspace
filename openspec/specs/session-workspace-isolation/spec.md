## Purpose

Provide filesystem-level isolation for each agent session using bwrap sandboxing. Each session operates in its own workspace directory and cannot access other sessions' data or host system files.

## ADDED Requirements

### Requirement: Session workspace directory

Each session SHALL have a workspace directory at `~/.codenano/workspaces/{session_id}/` on the host. This directory is created automatically when the session is created.

### Requirement: Workspace bound to session root

The session's workspace SHALL be bound to `/` (the session's root directory) via bwrap. The agent sees its workspace as the root filesystem and cannot escape to the host filesystem.

### Requirement: Agent root is workspace

The sandbox SHALL start with `/` as the current working directory, meaning the agent's root directory IS the workspace.

### Requirement: Path validation in file tools

All file-operating tools in the codenano SDK (FileRead, FileWrite, FileEdit, Bash, Glob, Grep) SHALL validate that any path accessed is within the session's workspace. Paths outside the workspace SHALL be rejected with an error.

### Requirement: Path resolution for relative paths

Relative paths in file operations SHALL be resolved relative to the workspace root (`/`). The resolved path MUST be within the workspace.

### Requirement: Bash command path validation

Bash commands SHALL be validated to ensure all paths referenced in the command are within the workspace. Commands referencing paths outside the workspace SHALL be rejected. Dangerous commands SHALL be blocked regardless of path.

### Requirement: Workspace cleanup on session destroy

When a session is destroyed, its workspace directory SHALL be recursively deleted from the host filesystem.

### Requirement: Session persistence in workspace

Session persistence data (history, state) SHALL be stored within the session's workspace at `/.codenano/`.

## Scenarios

#### Scenario: Session workspace created on creation

- **WHEN** a new session is created via `POST /api/v1/sessions`
- **THEN** the workspace directory `~/.codenano/workspaces/{session_id}/` is created on the host
- **THEN** the session's sandbox is started with workspace bound to `/`

#### Scenario: Agent can only access workspace

- **WHEN** agent attempts to read `/etc/passwd`
- **THEN** the operation fails with an access denied error
- **THEN** the host filesystem is not accessible

- **WHEN** agent attempts to read `/workspace/project/main.py`
- **THEN** the file is read successfully if it exists

#### Scenario: Relative paths resolved to workspace

- **WHEN** agent executes `cat file.txt` (relative path)
- **THEN** the path is resolved to `/file.txt` (workspace root)
- **THEN** the file is accessible if it exists

#### Scenario: Workspace deleted on session destroy

- **WHEN** a session is deleted via `DELETE /api/v1/sessions/:id`
- **THEN** the agent process is terminated
- **THEN** the workspace directory `~/.codenano/workspaces/{session_id}/` is recursively deleted

#### Scenario: Session persistence survives restart

- **WHEN** a session with persistence enabled is created
- **THEN** session state is stored in `~/.codenano/workspaces/{session_id}/.codenano/`
- **WHEN** the session is resumed with the same session_id
- **THEN** the agent can access its previous history and state

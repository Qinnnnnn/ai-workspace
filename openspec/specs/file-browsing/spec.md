## Purpose

Provide REST API for browsing and reading files within a session's workspace, with security measures to prevent unauthorized access.

## ADDED Requirements

### Requirement: List workspace directory

The system SHALL provide an API endpoint to list the contents of a session's workspace directory, returning file names, sizes, and modification times.

### Requirement: Read file contents

The system SHALL provide an API endpoint to read the raw contents of a file within a session's workspace.

### Requirement: Session isolation for file access

File browsing API SHALL only allow access to files within the requesting session's workspace. Requests for files outside the workspace SHALL return 403 or 404.

### Requirement: Path traversal prevention

The system SHALL prevent path traversal attacks (e.g., `../`) in file browsing requests.

## ADDED Scenarios

#### Scenario: List workspace contents

- **WHEN** `GET /api/v1/sessions/{session_id}/files` is called
- **THEN** the listing of `/workspace` directory is returned
- **THEN** response includes file names, sizes, and modification times

#### Scenario: Read file in workspace

- **WHEN** `GET /api/v1/sessions/{session_id}/files/research.md` is called
- **THEN** the raw contents of `/workspace/research.md` are returned
- **THEN** response is plain text with Content-Type appropriate for the file

#### Scenario: Attempt to access another session's files

- **WHEN** request is made for `/api/v1/sessions/{session_A}/files/../{session_B}/secret.txt`
- **THEN** the request returns 403 or 404
- **THEN** session B's files are not exposed

#### Scenario: Attempt path traversal

- **WHEN** `GET /api/v1/sessions/{session_id}/files/../../../etc/passwd` is called
- **THEN** the request returns 400 or 403
- **THEN** no host system files are accessible

#### Scenario: Read non-existent file

- **WHEN** `GET /api/v1/sessions/{session_id}/files/nonexistent.md` is called
- **THEN** the request returns 404

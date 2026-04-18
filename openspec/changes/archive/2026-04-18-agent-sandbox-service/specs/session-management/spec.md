## ADDED Requirements

### Requirement: Session creation with unique identifier

The system SHALL create a new session when requested, returning a unique session identifier. Each session SHALL have its own isolated bwrap sandbox and codenano-cli subprocess.

### Requirement: Session TTL with automatic cleanup

Sessions SHALL have a configurable time-to-live (TTL, default 30 minutes). Sessions that exceed the TTL without activity SHALL be automatically terminated and cleaned up.

### Requirement: Session touch on activity

The system SHALL reset the session's last activity timestamp on each user request, extending its TTL.

### Requirement: Session list retrieval

The system SHALL provide an API endpoint to list all active sessions with their creation time and last activity time.

### Requirement: Session retrieval by ID

The system SHALL provide an API endpoint to retrieve details of a specific session by its ID, returning 404 if the session does not exist.

### Requirement: Session deletion

The system SHALL allow explicit deletion of a session, terminating its sandbox subprocess and cleaning up resources.

### Requirement: Session deletion on shutdown

The system SHALL terminate and clean up all sessions during graceful shutdown.

## ADDED Scenarios

#### Scenario: Create new session

- **WHEN** user calls `POST /api/v1/sessions`
- **THEN** a new session is created with a unique ID
- **THEN** a bwrap sandbox is spawned for the session
- **THEN** the session ID is returned in the response

#### Scenario: Session auto-expires after TTL

- **WHEN** a session has no activity for SB_TTL_MINUTES
- **THEN** the session is automatically terminated
- **THEN** resources (subprocess, sandbox) are cleaned up

#### Scenario: Session activity resets TTL

- **WHEN** user sends a message to an existing session
- **THEN** the session's last activity timestamp is updated
- **THEN** the TTL countdown restarts

#### Scenario: Delete existing session

- **WHEN** user calls `DELETE /api/v1/sessions/{session_id}`
- **THEN** the session is terminated immediately
- **THEN** subsequent requests for that session return 404

#### Scenario: Service shutdown cleans up all sessions

- **WHEN** the service receives shutdown signal
- **THEN** all active sessions are terminated
- **THEN** all sandbox subprocesses are cleaned up

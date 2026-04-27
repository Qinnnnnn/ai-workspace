## Purpose

Manage agent sessions with lifecycle support including creation, TTL-based cleanup, and graceful shutdown.

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

## MODIFIED Requirements

### Requirement: Session creation with unique identifier

**FROM:**
> The system SHALL create a new session when requested, returning a unique session identifier. Each session SHALL have its own isolated bwrap sandbox and codenano-cli subprocess.

**TO:**
> The system SHALL create a new session when requested, returning a unique session identifier. Each session has its own `Agent` instance and `Session` instance managed by the SessionRegistry. No bwrap sandbox or external subprocess per session.

#### Scenario: Create new session
- **WHEN** caller calls `POST /api/v1/sessions`
- **THEN** a new session is created with a unique ID
- **THEN** an Agent and Session are created in-memory
- **THEN** the session ID is returned in the response

### Requirement: Session TTL with automatic cleanup

**FROM:**
> Sessions SHALL have a configurable time-to-live (TTL, default 30 minutes). Sessions that exceed the TTL without activity SHALL be automatically terminated and cleaned up.

**TO:**
> Sessions SHALL have a configurable time-to-live (TTL, controlled by `SB_TTL_MINUTES` env var, default 30 minutes). Sessions that exceed the TTL without activity SHALL be automatically terminated and cleaned up. The SessionRegistry runs a cleanup loop every 60 seconds.

#### Scenario: Session auto-expires after TTL
- **WHEN** a session has no activity for `SB_TTL_MINUTES`
- **THEN** the session is automatically terminated
- **THEN** resources (agent, session) are cleaned up

### Requirement: Session touch on activity

**FROM:**
> The system SHALL reset the session's last activity timestamp on each user request, extending its TTL.

**TO:**
> The system SHALL reset the session's last activity timestamp on each message sent to the session, extending its TTL.

#### Scenario: Session activity resets TTL
- **WHEN** caller sends a message to an existing session
- **THEN** the session's last activity timestamp is updated
- **THEN** the TTL countdown restarts

### Requirement: Session list retrieval

**FROM:**
> The system SHALL provide an API endpoint to list all active sessions with their creation time and last activity time.

**TO:**
> The system SHALL provide `GET /api/v1/sessions` to list all active sessions with their creation time and last activity time.

#### Scenario: List all sessions
- **WHEN** caller calls `GET /api/v1/sessions`
- **THEN** all active sessions are returned with metadata

### Requirement: Session retrieval by ID

**FROM:**
> The system SHALL provide an API endpoint to retrieve details of a specific session by its ID, returning 404 if the session does not exist.

**TO:**
> The system SHALL provide `GET /api/v1/sessions/:id` to retrieve details of a specific session, returning 404 if the session does not exist.

#### Scenario: Get existing session
- **WHEN** caller calls `GET /api/v1/sessions/:id`
- **THEN** session metadata is returned

#### Scenario: Session not found
- **WHEN** caller calls `GET /api/v1/sessions/nonexistent`
- **THEN** `404 Not Found` is returned

### Requirement: Session deletion

**FROM:**
> The system SHALL allow explicit deletion of a session, terminating its sandbox subprocess and cleaning up resources.

**TO:**
> The system SHALL allow explicit deletion of a session via `DELETE /api/v1/sessions/:id`, aborting the agent and cleaning up the session from the registry.

#### Scenario: Delete existing session
- **WHEN** caller calls `DELETE /api/v1/sessions/:id`
- **THEN** the session is terminated immediately
- **THEN** subsequent requests for that session return 404

### Requirement: Session deletion on shutdown

**FROM:**
> The system SHALL terminate and clean up all sessions during graceful shutdown.

**TO:**
> The system SHALL terminate and clean up all sessions during graceful shutdown (SIGTERM/SIGINT).

#### Scenario: Service shutdown cleans up all sessions
- **WHEN** the service receives shutdown signal
- **THEN** all active sessions are aborted
- **THEN** SessionRegistry is cleared

## REMOVED Requirements

### Requirement: Session creation with unique identifier (bwrap sandbox)

**Reason**: bwrap sandbox is removed. The service runs without sandbox isolation. MCP servers can provide tool isolation if needed.

### Requirement: Session creation with codenano-cli subprocess

**Reason**: codenano-cli is removed. Session management is handled directly in the Node.js service process.

## ADDED Requirements

### Requirement: Explicit session abort endpoint

The system SHALL provide `POST /api/v1/sessions/:id/abort` to allow clients to explicitly request interruption of an ongoing streaming operation. The endpoint SHALL call `entry.session.abort()` which sets the session's internal AbortController signal.

#### Scenario: Abort active streaming session
- **WHEN** client calls `POST /api/v1/sessions/:id/abort` during active streaming
- **THEN** the session's AbortController signal is set
- **THEN** `runSessionTurn` detects the signal at its next check point
- **THEN** the endpoint returns `{ ok: true }`

#### Scenario: Abort non-existent session
- **WHEN** client calls `POST /api/v1/sessions/:id/abort` for a non-existent session
- **THEN** the endpoint returns `404 Not Found`

#### Scenario: Abort idle session
- **WHEN** client calls `POST /api/v1/sessions/:id/abort` for a session with no active streaming
- **THEN** the session's AbortController signal is set (no-op)
- **THEN** the endpoint returns `{ ok: true }`

### Requirement: HTTP close fallback for abort

The streaming message route SHALL monitor the HTTP connection's `close` event. When the client disconnects (including tab close, browser crash, or network failure), the system SHALL call `entry.session.abort()` as a fallback to ensure the server-side session is interrupted.

#### Scenario: Client disconnects during streaming
- **WHEN** client's HTTP connection closes during active SSE streaming
- **AND** the close was not caused by normal stream completion
- **THEN** the `close` event listener triggers `entry.session.abort()`
- **THEN** the session's `runSessionTurn` detects the abort signal

#### Scenario: Normal stream completion cleans up listener
- **WHEN** streaming completes normally (all events yielded)
- **THEN** the `close` event listener is removed via `request.raw.off('close', onClose)`
- **THEN** no spurious abort is triggered after stream completion

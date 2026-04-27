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

## ADDED Requirements

### Requirement: Session creation

The system SHALL allow users to create a new agent session via `POST /api/v1/sessions`. The response SHALL include a session ID that uniquely identifies the session.

### Requirement: Session message exchange

The system SHALL allow users to send messages to a session via `POST /api/v1/sessions/{id}/message`. The response SHALL be streamed via Server-Sent Events (SSE).

#### Scenario: Stream text output
- **WHEN** the agent produces text output
- **THEN** the system SHALL emit an SSE `event: text` with the text content

#### Scenario: Stream tool use
- **WHEN** the agent calls a tool
- **THEN** the system SHALL emit an SSE `event: tool_use` with tool name, tool use ID, and input

#### Scenario: Stream tool result
- **WHEN** a tool execution completes
- **THEN** the system SHALL emit an SSE `event: tool_result` with the tool use ID, output, and isError flag

#### Scenario: Stream turn boundaries
- **WHEN** a new agent loop turn starts
- **THEN** the system SHALL emit an SSE `event: turn_start` with the turn number
- **WHEN** a turn completes
- **THEN** the system SHALL emit an SSE `event: turn_end` with the stop reason and turn number

#### Scenario: Final result
- **WHEN** the agent completes a response
- **THEN** the system SHALL emit an SSE `event: result` with the final Result object (text, usage, costUSD, numTurns)

#### Scenario: Error handling
- **WHEN** an error occurs during agent execution
- **THEN** the system SHALL emit an SSE `event: error` with the error message

### Requirement: Session closure

The system SHALL allow users to close a session via `DELETE /api/v1/sessions/{id}`. Upon closure, the underlying codenano session SHALL be persisted and the CLI subprocess SHALL exit.

### Requirement: Session history

The system SHALL allow users to retrieve conversation history via `GET /api/v1/sessions/{id}/history`. The response SHALL include all messages in the session.

### Requirement: Session listing

The system SHALL allow users to list all sessions via `GET /api/v1/sessions`. The response SHALL include session ID, created time, and last activity time for each session.

### Requirement: Session TTL

The system SHALL automatically close sessions that have been idle for more than the configured TTL (default: 30 minutes).

### Requirement: Session isolation

The system SHALL ensure that each session operates in an isolated bwrap sandbox. Sessions SHALL NOT be able to access each other's files or processes.

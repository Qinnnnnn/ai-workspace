## Purpose

Provide JSON-RPC bridge between FastAPI and codenano-cli, supporting agent initialization, message streaming, and session history.

## ADDED Requirements

### Requirement: JSON-RPC init method

The system SHALL support an `init` JSON-RPC method to initialize the agent with configuration (model selection, etc.).

### Requirement: JSON-RPC send method with streaming

The system SHALL support a `send` JSON-RPC method that accepts a prompt and streams back events via stdout notifications. The method SHALL return when the agent finishes processing.

### Requirement: JSON-RPC history method

The system SHALL support a `history` JSON-RPC method that returns the conversation history for a session.

### Requirement: JSON-RPC close method

The system SHALL support a `close` JSON-RPC method to explicitly close a session and clean up resources.

### Requirement: JSON-RPC list_sessions method

The system SHALL support a `list_sessions` JSON-RPC method that returns metadata about all active sessions.

### Requirement: Stream notifications

The codenano-cli SHALL emit JSON-RPC notifications with method `stream` for each event during agent processing (thought, tool_use, result, error).

### Requirement: REST API for session message

The system SHALL provide a `POST /api/v1/sessions/{session_id}/message` endpoint that accepts a prompt and returns an SSE stream of agent events.

### Requirement: REST API for session history

The system SHALL provide a `GET /api/v1/sessions/{session_id}/history` endpoint that returns the conversation history.

## ADDED Scenarios

#### Scenario: Initialize agent with model config

- **WHEN** `init` is called with `{"config": {"model": "claude-sonnet-4-6"}}`
- **THEN** the agent is configured with the specified model
- **THEN** `{"ok": true}` is returned

#### Scenario: Send message and receive streaming response

- **WHEN** `send` is called with `{"sessionId": "abc", "prompt": "Write a hello world program"}`
- **THEN** streaming notifications are emitted via stdout
- **THEN** final response `{"ok": true}` is returned when complete

#### Scenario: Receive stream notification

- **WHEN** agent is processing a request
- **THEN** notifications like `{"jsonrpc": "2.0", "method": "stream", "params": {"type": "thought", "data": {...}}}`
- **THEN** are emitted to stdout for capture by the RPC client

#### Scenario: Get session history

- **WHEN** `history` is called with `{"sessionId": "abc"}`
- **THEN** the conversation history for that session is returned
- **THEN** `{"history": [...]}` is returned

#### Scenario: REST API sends message with SSE

- **WHEN** `POST /api/v1/sessions/{id}/message` is called with `{"prompt": "..."}`
- **THEN** SSE stream delivers events as they occur
- **THEN** final event has type `result`

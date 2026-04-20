## Purpose

Node.js Fastify HTTP/WebSocket service that directly wraps the codenano SDK. Provides session management, message streaming (SSE), hook callbacks (WebSocket), and exposes the full AgentConfig surface.

## ADDED Requirements

### Requirement: Service configuration via .env

The service SHALL read configuration from a `.env` file at startup. Required variables: `ANTHROPIC_AUTH_TOKEN`. Optional variables: `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL` (default `claude-sonnet-4-6`), `LOG_LEVEL` (default `INFO`), `AGENT_SERVICE_PORT` (default `8000`).

#### Scenario: Service starts with valid .env
- **WHEN** the service starts with a valid `.env` containing `ANTHROPIC_AUTH_TOKEN`
- **THEN** the service starts and listens on the configured port

#### Scenario: Service starts without required env var
- **WHEN** the service starts without `ANTHROPIC_AUTH_TOKEN`
- **THEN** the service SHALL exit with an error containing "ANTHROPIC_AUTH_TOKEN is required"

### Requirement: Session creation with full AgentConfig

The service SHALL accept a `POST /api/v1/sessions` request with a body containing `config` (AgentConfig) and `hooks` (optional array of hook names to register). The service SHALL create an Agent via `createAgent(config)` and a Session via `agent.session()`, returning the session ID.

#### Scenario: Create session with minimal config
- **WHEN** caller sends `POST /api/v1/sessions` with `{"config": {"model": "claude-sonnet-4-6"}}`
- **THEN** a new session is created with a unique session ID
- **THEN** the response is `{"sessionId": "<uuid>"}`

#### Scenario: Create session with full AgentConfig
- **WHEN** caller sends `POST /api/v1/sessions` with `{"config": {"model": "...", "maxTurns": 50, "mcpServers": [...]}, "hooks": ["onPreToolUse"]}`
- **THEN** the agent is created with all provided config options
- **THEN** the hook coordinator is initialized for registered hook types
- **THEN** the response is `{"sessionId": "<uuid>"}`

#### Scenario: Create session with toolPreset
- **WHEN** caller sends `POST /api/v1/sessions` with `{"config": {"toolPreset": "extended"}}`
- **THEN** the agent is initialized with `extendedTools()`

#### Scenario: Create session with custom tools array
- **WHEN** caller sends `POST /api/v1/sessions` with `{"config": {"tools": [...]}}`
- **THEN** the agent is initialized with the provided tools array (tools must be serializable, execute functions are registered server-side)

### Requirement: Session message with SSE streaming

The service SHALL provide `POST /api/v1/sessions/:id/message` that accepts `{"prompt": "...", "stream": true}`. When `stream: true`, the response SHALL be an SSE stream (`text/event-stream`) yielding JSON events for each stream event from `session.stream(prompt)`.

#### Scenario: Send message and receive SSE stream
- **WHEN** caller sends `POST /api/v1/sessions/:id/message` with `{"prompt": "Hello", "stream": true}`
- **THEN** SSE stream yields events: `data: {"type":"query_start",...}`, `data: {"type":"text",...}`, `data: {"type":"tool_use",...}`, etc.
- **THEN** final event has `type: "result"` with the complete response

#### Scenario: Send message non-streaming
- **WHEN** caller sends `POST /api/v1/sessions/:id/message` with `{"prompt": "Hello", "stream": false}`
- **THEN** response is `{"result": {"text": "...", "usage": {...}, "stopReason": "...", ...}}`

#### Scenario: Session not found
- **WHEN** caller sends `POST /api/v1/sessions/:nonexistent/message`
- **THEN** response is `404 Not Found` with `{"error": "Session not found"}`

### Requirement: Session history retrieval

The service SHALL provide `GET /api/v1/sessions/:id/history` returning `{"history": [...]}` with the session's conversation history.

#### Scenario: Get session history
- **WHEN** caller sends `GET /api/v1/sessions/:id/history`
- **THEN** response is `{"history": [{"role": "user", "content": "..."}, {"role": "assistant", "content": [...]}]}`

### Requirement: Session retrieval and listing

The service SHALL provide `GET /api/v1/sessions/:id` returning session metadata, and `GET /api/v1/sessions` returning all active sessions.

#### Scenario: Get session by ID
- **WHEN** caller sends `GET /api/v1/sessions/:id`
- **THEN** response is `{"sessionId": "...", "createdAt": "...", "lastActivity": "...", "historyLength": N}`

#### Scenario: List all sessions
- **WHEN** caller sends `GET /api/v1/sessions`
- **THEN** response is `{"sessions": [{"sessionId": "...", "createdAt": "...", "lastActivity": "..."}]}`

### Requirement: Session deletion

The service SHALL provide `DELETE /api/v1/sessions/:id` that aborts the session and removes it from the registry. Subsequent requests for that session SHALL return 404.

#### Scenario: Delete existing session
- **WHEN** caller sends `DELETE /api/v1/sessions/:id`
- **THEN** the session is aborted and removed
- **THEN** response is `{"ok": true}`
- **THEN** subsequent `GET /api/v1/sessions/:id` returns 404

### Requirement: Hook WebSocket endpoint

The service SHALL provide `GET /ws/sessions/:id/hooks` as a WebSocket endpoint. Python clients connect to this endpoint to register hooks and receive/respond to hook events.

#### Scenario: Connect hook WebSocket
- **WHEN** Python client opens WebSocket to `/ws/sessions/:id/hooks`
- **THEN** connection is established if session exists
- **THEN** connection is rejected with 404 if session does not exist

#### Scenario: Register hooks via WebSocket
- **WHEN** client sends `{"type": "register_hook", "hooks": ["onPreToolUse", "onTurnEnd"]}`
- **THEN** the hook coordinator registers interest in those hook types
- **THEN** subsequent SDK hook triggers send events to this client

#### Scenario: Receive hook event and respond
- **WHEN** SDK triggers `onPreToolUse` hook
- **THEN** service sends `{"type": "hook_event", "hookId": "<uuid>", "hookType": "onPreToolUse", "data": {"toolName": "...", "toolInput": {...}}}`
- **WHEN** client responds with `{"type": "hook_decision", "hookId": "<uuid>", "decision": {"behavior": "allow"}}`
- **THEN** the hook decision is applied and execution continues

#### Scenario: Hook timeout defaults to allow
- **WHEN** SDK triggers a hook and client does not respond within 30 seconds
- **THEN** the hook decision defaults to `{"behavior": "allow"}`
- **THEN** execution continues

#### Scenario: Hook deny blocks tool execution
- **WHEN** client responds with `{"type": "hook_decision", "hookId": "<uuid>", "decision": {"behavior": "deny", "message": "blocked"}}`
- **THEN** tool execution is blocked
- **THEN** tool result error is returned to the model

### Requirement: Service graceful shutdown

The service SHALL handle SIGTERM/SIGINT gracefully: stop accepting new requests, close all WebSocket connections, abort all sessions, disconnect all MCP servers, then exit.

#### Scenario: Graceful shutdown on SIGTERM
- **WHEN** service receives SIGTERM
- **THEN** HTTP server stops accepting new connections
- **THEN** all WebSocket connections are closed
- **THEN** all active sessions are aborted
- **THEN** all MCP server connections are closed
- **THEN** process exits with code 0

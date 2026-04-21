## Purpose

Node.js Fastify HTTP service that directly wraps the codenano SDK. Provides session management, message streaming (SSE), and exposes the full AgentConfig surface. No external hook coordination - agents operate autonomously.

## ADDED Requirements

### Requirement: Session creation supports resume

The service SHALL accept an optional `resumeSessionId` in the session creation request body. When provided, the service SHALL load persisted messages from that session's JSONL file and create the new session with that message history pre-loaded.

#### Scenario: Create session with resume
- **WHEN** caller sends `POST /api/v1/sessions` with `{"resumeSessionId": "<existing-session-id>"}`
- **THEN** the service loads messages from the persisted session file
- **THEN** a new session is created with the loaded message history
- **THEN** the response is `{"sessionId": "<new-uuid>"}`

#### Scenario: Resume nonexistent session
- **WHEN** caller sends `POST /api/v1/sessions` with `{"resumeSessionId": "<nonexistent>"}`
- **THEN** a new empty session is created (resume is ignored)
- **THEN** the response is `{"sessionId": "<uuid>"}`

## MODIFIED Requirements

### Requirement: Session creation with full AgentConfig

**FROM:**
> The service SHALL accept a `POST /api/v1/sessions` request with a body containing `config` (AgentConfig) and `hooks` (optional array of hook names to register).

**TO:**
> The service SHALL accept a `POST /api/v1/sessions` request with a body containing `config` (AgentConfig), `toolPermissions`, and optional `resumeSessionId`. No hooks are registered - agents run fully autonomously.

#### Scenario: Create session with minimal config
- **WHEN** caller sends `POST /api/v1/sessions` with `{"config": {"model": "claude-sonnet-4-6"}}`
- **THEN** a new session is created with a unique session ID
- **THEN** the response is `{"sessionId": "<uuid>"}`

#### Scenario: Create session with toolPreset
- **WHEN** caller sends `POST /api/v1/sessions` with `{"config": {"toolPreset": "extended"}}`
- **THEN** the agent is initialized with `extendedTools()`

#### Scenario: Create session with MCP servers
- **WHEN** caller sends `POST /api/v1/sessions` with `{"config": {"mcpServers": [...]}}`
- **THEN** the agent connects to the specified MCP servers

## REMOVED Requirements

### Requirement: Hook WebSocket endpoint

**Reason**: Replaced by pure autonomous agent operation. No external hook coordination is provided.

**Migration**: Remove all WebSocket hook client implementations. Agents operate without external hook intervention.

### Requirement: Hook registration via session creation

**Reason**: Hooks are not exposed in this service model.

**Migration**: Remove all `hooks` array from session creation requests.

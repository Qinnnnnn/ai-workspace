## Purpose

Provide a comprehensive HTTP API that exposes codenano's full capabilities. Previously unavailable features (custom tools, cost tracking, git integration, skills management) are now accessible via direct library integration.

## ADDED Requirements

### Requirement: Custom tool definition API

The system SHALL allow registration of custom tools via `defineTool()`:

```
POST /api/v1/tools
```

Request body:
```json
{
  "name": "custom_tool",
  "description": "Tool description",
  "inputSchema": {
    "type": "object",
    "properties": {
      "param1": { "type": "string" }
    },
    "required": ["param1"]
  }
}
```

#### Scenario: Define custom tool
- **WHEN** caller sends `POST /api/v1/tools` with tool definition
- **THEN** the tool is registered with the agent
- **THEN** subsequent agent messages can invoke the tool

#### Scenario: Custom tool receives execution result
- **WHEN** agent invokes a custom tool
- **THEN** the tool function is called with parsed input
- **THEN** return value is sent as tool result to agent

### Requirement: Cost tracking API

The system SHALL expose cost calculation:

```
GET /api/v1/cost/pricing
POST /api/v1/cost/calculate
```

Returns model pricing information and optionally calculates cost for a given usage.

#### Scenario: Get model pricing
- **WHEN** caller requests `GET /api/v1/cost/pricing`
- **THEN** pricing for all supported models is returned

#### Scenario: Calculate cost for usage
- **WHEN** caller sends `POST /api/v1/cost/calculate` with usage data
- **THEN** cost in USD is calculated and returned

### Requirement: Git integration API

The system SHALL expose git state for context injection:

```
GET /api/v1/git/state
```

Returns current git status, branch, and recent commits.

#### Scenario: Get git state
- **WHEN** caller requests `GET /api/v1/git/state`
- **THEN** current branch, status, and diff summary are returned

### Requirement: Skills management API

The system SHALL expose the skills discovery and loading system:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/skills` | List all discovered skills |
| GET | `/api/v1/skills/:name` | Get skill content |
| POST | `/api/v1/skills/expand` | Expand skill content in prompt |

#### Scenario: List available skills
- **WHEN** caller requests `GET /api/v1/skills`
- **THEN** all skills from configured skills directory are listed

### Requirement: Session management API

The system SHALL provide RESTful session management:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/sessions` | Create new session |
| GET | `/api/v1/sessions` | List all sessions |
| GET | `/api/v1/sessions/:id` | Get session by ID |
| DELETE | `/api/v1/sessions/:id` | Delete session |
| POST | `/api/v1/sessions/:id/message` | Send message (SSE streaming) |
| GET | `/api/v1/sessions/:id/history` | Get message history |

#### Scenario: Create session with custom config
- **WHEN** caller sends `POST /api/v1/sessions` with config
- **THEN** a new Agent and Session are created
- **THEN** session ID is returned in response body
- **THEN** streaming endpoint is available at `/api/v1/sessions/:id/message`

#### Scenario: Stream messages via SSE
- **WHEN** caller sends `POST /api/v1/sessions/:id/message` with streaming enabled
- **THEN** responses are streamed as SSE events
- **THEN** tool executions trigger `tool_executing` events
- **THEN** final response triggers `message_complete` event

### Requirement: Memory operations API

The system SHALL provide memory persistence operations:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/memory` | Save memory |
| GET | `/api/v1/memory/:key` | Load memory |
| GET | `/api/v1/memory` | Scan all memories |
| DELETE | `/api/v1/memory/:key` | Delete memory |

#### Scenario: Save and retrieve memory
- **WHEN** caller saves memory via `POST /api/v1/memory`
- **THEN** the memory is persisted to disk
- **THEN** subsequent `GET /api/v1/memory/:key` returns the value

### Requirement: MCP server management API

The system SHALL allow connecting to MCP servers:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/mcp/connect` | Connect to MCP server |
| GET | `/api/v1/mcp/tools` | List available MCP tools |
| POST | `/api/v1/mcp/tools/call` | Call MCP tool |
| DELETE | `/api/v1/mcp/:serverId` | Disconnect MCP server |

#### Scenario: Connect MCP server
- **WHEN** caller sends `POST /api/v1/mcp/connect` with server config
- **THEN** MCP server is connected
- **THEN** its tools are available to the agent

### Requirement: Hook WebSocket coordinator

The system SHALL provide WebSocket endpoint for external permission services:

```
WS /ws/sessions/:id/hooks
```

External services can connect to receive hook events and respond with permission decisions.

#### Scenario: External permission service
- **WHEN** agent is about to execute a tool
- **THEN** hook event is sent over WebSocket
- **THEN** external service responds with allow/deny
- **THEN** tool execution proceeds or is blocked

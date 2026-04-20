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

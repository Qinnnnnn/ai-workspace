## Purpose

Rule-based tool permission configuration. Since `canUseTool` is a function type that cannot cross the HTTP boundary, this service-layer feature provides a declarative permission model: `toolPermissions: Record<string, 'allow' | 'deny' | 'ask'>`.

## ADDED Requirements

### Requirement: Tool permission modes

The service SHALL support three permission modes per tool:
- `"allow"`: Tool executes without prompting
- `"deny"`: Tool is blocked, returns error to model
- `"ask"`: Hook event is sent via WebSocket for Python client to decide

#### Scenario: Allow mode skips hook
- **WHEN** session has `toolPermissions: {"Bash": "allow"}` and tool is called
- **THEN** tool executes immediately without WebSocket hook event

#### Scenario: Deny mode blocks tool
- **WHEN** session has `toolPermissions: {"Bash": "deny"}` and tool is called
- **THEN** tool does not execute
- **THEN** error result `"Tool blocked: denied by policy"` is returned

#### Scenario: Ask mode triggers hook
- **WHEN** session has `toolPermissions: {"Bash": "ask"}` and tool is called
- **THEN** hook event is sent via WebSocket
- **THEN** execution pauses until client responds

### Requirement: Tool permission in AgentConfig

The service SHALL accept `toolPermissions` in the session creation config:

```json
{
  "config": {
    "toolPermissions": {
      "Bash": "deny",
      "FileWrite": "ask",
      "FileRead": "allow"
    }
  }
}
```

#### Scenario: Create session with tool permissions
- **WHEN** caller creates session with `toolPermissions: {"Bash": "deny", "FileRead": "allow"}`
- **THEN** the permission rules are applied to all subsequent tool calls in that session

### Requirement: Default permission is ask

If a tool has no explicit permission rule, the default behavior SHALL be `"ask"` (hook event sent for client decision).

#### Scenario: Unspecified tool uses default ask
- **WHEN** session has no rule for `GrepTool` and tool is called
- **THEN** hook event is sent via WebSocket
- **THEN** client must respond with allow or deny

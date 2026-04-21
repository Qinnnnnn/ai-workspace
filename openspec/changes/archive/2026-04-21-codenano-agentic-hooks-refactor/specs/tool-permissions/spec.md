## Purpose

Rule-based tool permission configuration for autonomous agent operation. Since `canUseTool` is a function type that cannot cross the HTTP boundary, this service-layer feature provides a declarative permission model: `toolPermissions: Record<string, 'allow' | 'deny'>`. There is no external WebSocket coordination - permissions are enforced internally.

## MODIFIED Requirements

### Requirement: Tool permission modes

**FROM:**
> The service SHALL support three permission modes per tool:
> - `"allow"`: Tool executes without prompting
> - `"deny"`: Tool is blocked, returns error to model
> - `"ask"`: Hook event is sent via WebSocket for Python client to decide

**TO:**
> The service SHALL support two permission modes per tool:
> - `"allow"`: Tool executes immediately without external coordination
> - `"deny"`: Tool is blocked, returns error to model

#### Scenario: Allow mode executes tool
- **WHEN** session has `toolPermissions: {"Bash": "allow"}` and tool is called
- **THEN** tool executes immediately

#### Scenario: Deny mode blocks tool
- **WHEN** session has `toolPermissions: {"Bash": "deny"}` and tool is called
- **THEN** tool does not execute
- **THEN** error result `"Tool blocked: denied by policy"` is returned

### Requirement: Tool permission in AgentConfig

**FROM:**
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

**TO:**
```json
{
  "config": {
    "toolPermissions": {
      "Bash": "deny",
      "FileWrite": "allow",
      "FileRead": "allow"
    }
  }
}
```

#### Scenario: Create session with tool permissions
- **WHEN** caller creates session with `toolPermissions: {"Bash": "deny", "FileRead": "allow"}`
- **THEN** the permission rules are applied to all subsequent tool calls in that session

### Requirement: Default permission is allow

**FROM:**
> If a tool has no explicit permission rule, the default behavior SHALL be `"ask"` (hook event sent for client decision).

**TO:**
> If a tool has no explicit permission rule, the default behavior SHALL be `"allow"` (tool executes without external coordination).

#### Scenario: Unspecified tool uses default allow
- **WHEN** session has no rule for `GrepTool` and tool is called
- **THEN** tool executes immediately

## REMOVED Requirements

### Requirement: Ask mode triggers hook

**Reason**: "ask" mode requires external WebSocket coordination which contradicts autonomous agent operation. Replaced by "allow" as default.

**Migration**: Change all `toolPermissions` values of `"ask"` to `"allow"`. Remove all WebSocket hook client implementations that rely on "ask" mode.

### Requirement: Default permission is ask

**Reason**: Replaced by "allow" as default per the modified requirement above.

**Migration**: Existing sessions relying on implicit "ask" behavior will now default to "allow".

## Purpose

Direct TypeScript library integration with codenano, replacing the subprocess orchestration layer. The service imports codenano modules directly rather than spawning external processes.

## ADDED Requirements

### Requirement: Direct codenano module imports

The service SHALL import codenano modules directly via TypeScript imports:

```typescript
import { createAgent, defineTool, coreTools, Session } from 'codenano'
```

No subprocess spawning, JSON-RPC, or IPC bridge.

#### Scenario: Agent creation via library import
- **WHEN** service initializes a new agent
- **THEN** `createAgent(config)` is called directly
- **THEN** the agent runs within the same Node.js process

#### Scenario: Tool preset selection via library
- **WHEN** session config specifies `toolPreset: "extended"`
- **THEN** `extendedTools()` is called and passed to `createAgent`
- **THEN** no external process is spawned

### Requirement: Workspace path validation via path-guard

All file operations SHALL be validated by codenano's built-in `path-guard`:

- `FileReadTool` calls `validatePath(file_path, workspace)`
- `FileWriteTool` calls `validatePath(file_path, workspace)`
- `FileEditTool` calls `validatePath(file_path, workspace)`
- `BashTool` calls `validateBashCommand(command, workspace)`

Workspace is configured via `CODENANO_WORKSPACE` environment variable (default: `/`).

#### Scenario: Path escape attempt blocked
- **WHEN** agent requests `FileRead` for `/etc/passwd`
- **AND** workspace is set to `/home/user/project`
- **THEN** the request is rejected with validation error

#### Scenario: Bash command with dangerous operations blocked
- **WHEN** agent executes `rm -rf /` via BashTool
- **THEN** `validateBashCommand` rejects the command
- **THEN** an error is returned without execution

### Requirement: Session persistence via codenano-native JSONL

Sessions SHALL use codenano's built-in session persistence:

- Sessions are stored in `~/.agent-core/sessions/` by default
- Format: one JSON object per line (JSONL)
- `SessionImpl` handles appending message history
- `listSessions()` and `loadSession()` provide access

#### Scenario: Session persists message history
- **WHEN** user sends a message to a session with persistence enabled
- **THEN** the message is appended to `~/.agent-core/sessions/{sessionId}.jsonl`

#### Scenario: Session resumes from disk
- **WHEN** session is created with `resumeSessionId` or existing session ID
- **THEN** `loadSession()` populates message history from JSONL file
- **THEN** conversation continues from persisted state

### Requirement: Hook system via direct callbacks

Hook callbacks SHALL be registered directly on the agent:

```typescript
const agent = createAgent({
  hooks: {
    onPreToolUse: async (tool, input) => { /* ... */ },
    onPostToolUse: async (tool, input, result) => { /* ... */ },
    onTurnEnd: async (messages) => { /* ... */ },
  }
})
```

#### Scenario: Pre-tool permission check via hook
- **WHEN** agent is about to execute a tool
- **THEN** `onPreToolUse` hook is called
- **THEN** hook can allow or reject the tool execution

#### Scenario: Post-tool logging via hook
- **WHEN** tool execution completes
- **THEN** `onPostToolUse` hook is called with tool name, input, and result

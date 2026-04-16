## ADDED Requirements

### Requirement: JSON-RPC server interface

The codenano CLI SHALL run as a long-running JSON-RPC 2.0 server over stdin/stdout. It SHALL support the following methods:

| Method | Params | Description |
|--------|--------|-------------|
| `init` | `{ config: AgentConfig }` | Initialize the codenano Agent with given config |
| `send` | `{ sessionId: string, prompt: string }` | Send a message to a session, stream events back |
| `close` | `{ sessionId: string }` | Close a session and persist state |
| `list_sessions` | `{}` | List active session IDs |
| `history` | `{ sessionId: string }` | Get session conversation history |

### Requirement: Streaming event notification

For `send` requests, the CLI SHALL stream events back to FastAPI as JSON-RPC notifications:

```json
{"jsonrpc":"2.0","method":"stream","params":{"type":"event","data":{...}}}
{"jsonrpc":"2.0","method":"stream","params":{"type":"result","data":{...}}}
```

The `type` field within `data` SHALL match the codenano StreamEvent type (`turn_start`, `tool_use`, `tool_result`, `text`, `thinking`, `result`, `error`).

### Requirement: Session lifecycle management

The CLI SHALL maintain an in-memory map of `sessionId → codenano Session`. When `send` is called with a new sessionId, it SHALL create a new codenano Session. When `send` is called with an existing sessionId, it SHALL resume that session.

### Requirement: Graceful shutdown

On receiving `close` for a session, the CLI SHALL persist the session state (via codenano's JSONL persistence) before removing the session from memory.

### Requirement: Process exit

The CLI process SHALL exit cleanly (exit code 0) when stdin is closed or when a shutdown signal is received.

## Purpose

Native streaming support using codenano's `StreamingToolExecutor` for concurrent tool execution and real-time progress updates.

## ADDED Requirements

### Requirement: Concurrent tool execution

The system SHALL execute independent tools concurrently when safe:

- Tools without dependencies can run in parallel
- Read-only tools (`ls`, `cat`, `grep`) are marked concurrency-safe
- Write tools are serialized to prevent conflicts

#### Scenario: Independent tools execute in parallel
- **WHEN** agent requests `Glob` and `Grep` in same turn
- **AND** neither depends on the other's output
- **THEN** both tools execute concurrently
- **THEN** results are aggregated for agent

#### Scenario: Write tools are serialized
- **WHEN** agent requests `FileWrite` twice in same turn
- **THEN** writes execute sequentially
- **THEN** each write completes before next begins

### Requirement: Real-time SSE streaming

The system SHALL stream events to HTTP clients via Server-Sent Events:

```
POST /api/v1/sessions/:id/message
Accept: text/event-stream
```

Event types:
- `text`: Text content delta
- `thinking`: Thinking content delta
- `tool_use`: Tool invocation with name, id, and input
- `tool_result`: Tool execution result
- `turn_start`: Turn begins
- `turn_end`: Turn ends with stop reason
- `query_start`: Query begins with tracking info
- `result`: Final result with usage and metadata
- `error`: Error occurred
- `aborted`: User-initiated interrupt with `partialText` containing text generated so far

#### Scenario: Streaming tool execution progress
- **WHEN** agent executes a tool during message processing
- **THEN** `tool_use` event is sent with tool name, id, and input
- **THEN** when complete, `tool_result` event is sent with result
- **THEN** client receives real-time updates

#### Scenario: Streaming response chunks
- **WHEN** agent generates a text response
- **THEN** `text` events stream partial content
- **THEN** `result` signals end of response with usage and metadata

#### Scenario: User-initiated abort produces aborted event
- **WHEN** user triggers abort during streaming
- **THEN** the system yields `{ type: 'aborted', partialText: <string> }` event
- **THEN** the event is sent to the client via SSE before the stream closes
- **THEN** the `partialText` field contains all text content generated before the abort

#### Scenario: Abort signal detected during model streaming
- **WHEN** abort signal is set while `callModelStreamingWithRetry` is running
- **THEN** the Anthropic API call is cancelled via its AbortSignal
- **THEN** `runSessionTurn` catches the error in its try-catch block
- **THEN** `streamingExecutor.discard()` is called to cancel pending tools
- **THEN** cancel tool_results are appended to `messages[]` and persisted
- **THEN** `{ type: 'aborted' }` event is yielded

#### Scenario: Abort signal detected during tool execution
- **WHEN** abort signal is set while `streamingExecutor.getRemainingResults()` is running
- **THEN** tool execution is interrupted via AbortSignal passed to tool context
- **THEN** `streamingExecutor.discard()` is called for any remaining tools
- **THEN** cancel tool_results are appended to `messages[]` and persisted
- **THEN** `{ type: 'aborted' }` event is yielded

### Requirement: Tool result truncation

The system SHALL truncate large tool results to prevent token overflow:

- `DEFAULT_MAX_RESULT_SIZE_CHARS`: 100,000 characters
- `MAX_RESULTS_PER_MESSAGE_CHARS`: 500,000 characters
- `PREVIEW_SIZE_BYTES`: 2,000 characters for truncated preview

#### Scenario: Large output is truncated
- **WHEN** tool returns 500KB of output
- **THEN** output is truncated to configured limit
- **THEN** truncated preview is provided to agent
- **THEN** agent can request full result via follow-up

### Requirement: Token budget management

The system SHALL manage token budget for context window:

- `estimateTokens()` calculates message token count
- `shouldAutoCompact()` determines when compaction needed
- `compactMessages()` reduces context history

#### Scenario: Context auto-compacts when near limit
- **WHEN** message history approaches token limit
- **THEN** `shouldAutoCompact()` returns true
- **THEN** `compactMessages()` summarization reduces history
- **THEN** agent continues with compacted context

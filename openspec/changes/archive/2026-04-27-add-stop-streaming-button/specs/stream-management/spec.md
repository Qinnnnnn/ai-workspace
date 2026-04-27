## MODIFIED Requirements

### Requirement: Real-time SSE streaming

**FROM:**
> The system SHALL stream events to HTTP clients via Server-Sent Events:
>
> ```
> POST /api/v1/sessions/:id/message
> Accept: text/event-stream
> ```
>
> Event types:
> - `tool_executing`: Tool execution started
> - `tool_complete`: Tool execution finished
> - `tool_error`: Tool execution failed
> - `message_delta`: Partial response update
> - `message_complete`: Response fully generated
> - `error`: Error occurred

**TO:**
> The system SHALL stream events to HTTP clients via Server-Sent Events:
>
> ```
> POST /api/v1/sessions/:id/message
> Accept: text/event-stream
> ```
>
> Event types:
> - `text`: Text content delta
> - `thinking`: Thinking content delta
> - `tool_use`: Tool invocation with name, id, and input
> - `tool_result`: Tool execution result
> - `turn_start`: Turn begins
> - `turn_end`: Turn ends with stop reason
> - `query_start`: Query begins with tracking info
> - `result`: Final result with usage and metadata
> - `error`: Error occurred
> - `aborted`: User-initiated interrupt with `partialText` containing text generated so far

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

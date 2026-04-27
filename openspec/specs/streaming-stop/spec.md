## Purpose

Support user-initiated interruption of ongoing streaming responses, allowing users to stop text generation and tool execution at any point while maintaining message consistency.

## ADDED Requirements

### Requirement: User can interrupt streaming response

The system SHALL allow users to interrupt an ongoing streaming response at any point, including during text generation, thinking, or tool execution. When interrupted, the system SHALL emit an `{ type: 'aborted'; partialText: string }` event to the client, then safely terminate the streaming session.

#### Scenario: Interrupt during text generation
- **WHEN** user clicks Stop button while model is generating text
- **THEN** frontend calls `POST /api/v1/sessions/:id/abort` and breaks SSE reading
- **THEN** backend `runSessionTurn` detects abort signal
- **THEN** backend yields `{ type: 'aborted', partialText: <text generated so far> }` event
- **THEN** backend safely exits the turn loop
- **THEN** frontend receives the `aborted` event and displays "已停止生成"

#### Scenario: Interrupt during tool execution
- **WHEN** user clicks Stop button while a tool is executing
- **THEN** frontend calls `POST /api/v1/sessions/:id/abort`
- **THEN** backend abort signal interrupts tool execution
- **THEN** backend discards pending tools via `streamingExecutor.discard()`
- **THEN** backend generates cancel tool_results for uncompleted tool_use blocks
- **THEN** backend persists the cancel tool_results to maintain message consistency
- **THEN** backend yields `{ type: 'aborted', partialText: <text generated so far> }` event

#### Scenario: Interrupt between assistant message and tool execution
- **WHEN** abort signal is received after assistant message with tool_use is persisted but before tool_results are added
- **THEN** backend detects the inconsistency in `messages[]`
- **THEN** backend generates cancel tool_results for each unpaired tool_use block
- **THEN** backend appends `{ role: 'user', content: [cancel tool_results] }` to `messages`
- **THEN** backend persists the cancel tool_results
- **THEN** next turn sends consistent messages to Anthropic API without 400 error

### Requirement: Message consistency after interrupt

The system SHALL ensure that `messages[]` in the session is always in a consistent state after an interrupt, such that subsequent API calls to the Anthropic Messages API will not fail with validation errors.

#### Scenario: No orphaned tool_use after interrupt
- **WHEN** an interrupt occurs at any point during `runSessionTurn`
- **AND** the last assistant message in `messages[]` contains tool_use blocks
- **THEN** the system SHALL ensure each tool_use has a corresponding tool_result in `messages[]`
- **THEN** uncompleted tools receive cancel tool_result with `content: 'Tool execution cancelled'` and `is_error: true`

#### Scenario: Session is immediately usable after interrupt
- **WHEN** user sends a new message after an interrupted session
- **THEN** `runSessionTurn` starts with the repaired `messages[]` history
- **THEN** the Anthropic API call succeeds without validation errors
- **THEN** the model receives context indicating prior tools were cancelled (via `is_error: true` tool_results)

### Requirement: Interrupt preserves generated content

The system SHALL preserve all content generated before the interrupt point, including partial text, thinking blocks, and completed tool results. Only incomplete tool executions are marked as cancelled.

#### Scenario: Partial text is preserved
- **WHEN** model has generated "Here is the function:" before interrupt
- **THEN** the partial text "Here is the function:" is included in the `aborted` event's `partialText`
- **THEN** frontend displays the partial text in the message bubble

#### Scenario: Completed tool results are preserved
- **WHEN** tool A has completed (tool_result received) and tool B is still executing at interrupt time
- **THEN** tool A's result is preserved in the message history
- **THEN** tool B receives a cancel tool_result
- **THEN** frontend shows tool A as completed and tool B as "已取消"

#### Scenario: Thinking blocks are preserved
- **WHEN** thinking content has been streamed before interrupt
- **THEN** thinking blocks remain in the message content
- **THEN** frontend displays thinking in collapsible section as normal

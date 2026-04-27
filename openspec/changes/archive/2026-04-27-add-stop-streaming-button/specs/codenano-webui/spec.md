## ADDED Requirements

### Requirement: Stop button replaces send button during streaming

The Composer component SHALL replace the send button (arrow-up icon) with a stop button (square icon) when the session is streaming. Clicking the stop button SHALL trigger an `onStop` callback.

#### Scenario: Stop button appears during streaming
- **WHEN** `isStreaming` is true
- **THEN** the send button is replaced with a stop button showing a Square icon
- **THEN** the stop button is clickable and not disabled
- **THEN** the textarea remains enabled for typing next message

#### Scenario: Stop button triggers abort
- **WHEN** user clicks the stop button
- **THEN** `onStop` callback is invoked
- **THEN** the frontend aborts the SSE connection and calls `POST /abort`

#### Scenario: Send button returns after streaming stops
- **WHEN** streaming ends (either by abort, completion, or error)
- **THEN** the stop button is replaced by the send button
- **THEN** normal send behavior resumes

### Requirement: Frontend handles aborted event

The `useStream` hook SHALL process `{ type: 'aborted' }` events from the SSE stream and invoke an `onAborted` callback with the partial text. The `abort()` method SHALL both break the SSE reading loop AND call the server-side abort API.

#### Scenario: Abort method calls server API
- **WHEN** `useStream.abort()` is called
- **THEN** the client-side AbortController aborts SSE reading
- **THEN** `POST /api/v1/sessions/:id/abort` is called
- **THEN** errors from the abort API call are silently ignored (best-effort)

#### Scenario: Aborted event is processed
- **WHEN** the SSE stream delivers `{ type: 'aborted', partialText: 'some text' }`
- **THEN** the `onAborted` callback is invoked with `partialText`
- **THEN** the stream loop terminates

#### Scenario: Aborted event distinguishes from error
- **WHEN** an `aborted` event is received
- **THEN** the UI shows "已停止生成" (not "连接中断" or an error message)
- **AND** no error bubble is displayed

### Requirement: Interrupted message preserves content with cancel markers

When a streaming message is interrupted, the frontend SHALL preserve all content generated before the interrupt point. Uncompleted tool_use blocks SHALL display "已取消" status instead of "运行中…".

#### Scenario: Partial text is displayed after abort
- **WHEN** model generated "Here is the code:" before abort
- **THEN** the message bubble shows "Here is the code:" as text content
- **THEN** the message is marked `isStreaming: false`

#### Scenario: Uncompleted tool shows cancelled status
- **WHEN** a tool_use block has no result at abort time
- **THEN** the tool card displays "已取消" instead of "运行中…"
- **THEN** the tool card uses a cancelled visual style (muted color, no spinner)

#### Scenario: Completed tool shows result after abort
- **WHEN** a tool_use block has a result at abort time
- **THEN** the tool card displays the result as normal (no change from non-aborted behavior)

#### Scenario: User can send new message immediately after abort
- **WHEN** an `aborted` event is received
- **THEN** `isStreaming` is set to false for the session
- **THEN** the Composer is re-enabled
- **THEN** the user can type and send a new message without waiting

### Requirement: Abort API client function

The `sessions.ts` API module SHALL export an `abortSession(sessionId: string)` function that calls `POST /api/v1/sessions/:id/abort`.

#### Scenario: Call abort API
- **WHEN** `abortSession('session-123')` is called
- **THEN** a POST request is sent to `/api/v1/sessions/session-123/abort`
- **THEN** the function returns without throwing on success
- **THEN** network errors are silently ignored (best-effort, fire-and-forget)

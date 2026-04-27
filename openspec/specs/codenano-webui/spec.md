## Purpose

React WebUI for interacting with codenano-api. Provides a chat interface for creating sessions, sending messages, and receiving streaming responses with tool call visualization.

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

### Requirement: Session list displays all sessions

The webui SHALL fetch and display a list of all sessions from `GET /api/v1/sessions`. Each session SHALL show its sessionId, createdAt, and lastActivity timestamp.

#### Scenario: Display session list on load
- **WHEN** user opens the webui
- **THEN** the sidebar displays a list of all existing sessions
- **THEN** each session shows a preview (first message or "New conversation")

#### Scenario: Empty session list
- **WHEN** no sessions exist
- **THEN** sidebar shows "No conversations yet"
- **THEN** a "New Chat" button is prominent

### Requirement: User can create a new session

The webui SHALL create a new session via `POST /api/v1/sessions` with default config `{"config": {"model": "claude-sonnet-4-6"}}`. The new session SHALL become the active session.

#### Scenario: Create new session
- **WHEN** user clicks "New Chat" button
- **THEN** webui sends `POST /api/v1/sessions` with `{"config": {"model": "claude-sonnet-4-6"}}`
- **THEN** the new sessionId is stored and selected
- **THEN** chat pane shows empty composer

#### Scenario: Create session with custom config
- **WHEN** user provides custom model or toolPreset in config
- **THEN** webui sends `POST /api/v1/sessions` with the provided config
- **THEN** the response sessionId is stored

### Requirement: User can send a message and receive streaming response

The webui SHALL send messages via `POST /api/v1/sessions/:id/message` with `stream: true`. The SSE stream SHALL be parsed and rendered in real-time.

#### Scenario: Send message and receive text stream
- **WHEN** user types "Hello" and presses Send
- **THEN** webui sends `POST /api/v1/sessions/:id/message` with `{"prompt": "Hello", "stream": true}`
- **THEN** text events appear character-by-character in the chat
- **THEN** message is marked as complete when `result` event arrives

#### Scenario: Stream displays thinking
- **WHEN** model is configured with thinking
- **THEN** `type: "thinking"` events render in a collapsible section
- **THEN** thinking text is visually distinguished (e.g., italic, muted color)

### Requirement: Tool calls are displayed as cards

The webui SHALL render `tool_use` and `tool_result` events as visual tool call cards.

#### Scenario: Display tool call in progress
- **WHEN** stream emits `{"type": "tool_use", "toolName": "Bash", "toolUseId": "abc", "input": {"command": "ls"}}`
- **THEN** a tool card appears showing tool name and input
- **THEN** card shows loading state while executing

#### Scenario: Display tool result
- **WHEN** stream emits `{"type": "tool_result", "toolUseId": "abc", "output": "file1.txt\nfile2.txt", "isError": false}`
- **THEN** the tool card expands to show the output
- **THEN** if `isError: true`, output is shown in error styling

#### Scenario: Multiple tool calls in sequence
- **WHEN** stream emits multiple `tool_use` events
- **THEN** each tool card appears in sequence
- **THEN** tool cards can be collapsed or expanded individually

### Requirement: User can delete a session

The webui SHALL delete a session via `DELETE /api/v1/sessions/:id`. After deletion, the session SHALL be removed from the list and if it was active, the UI SHALL show the empty state.

#### Scenario: Delete session from sidebar
- **WHEN** user clicks delete icon on a session in the sidebar
- **THEN** webui sends `DELETE /api/v1/sessions/:id`
- **THEN** session is removed from the list
- **THEN** if it was active, chat pane shows empty state

### Requirement: Session history persists and loads on demand

The webui SHALL maintain a mapping of sessionId to messages in React state. When switching to a session that has no cached messages, the webui SHALL fetch history from `GET /api/v1/sessions/:id/history` and render it. Existing sessions continue to accept new messages via `POST /api/v1/sessions/:id/message`.

#### Scenario: Load history when switching to a past session
- **WHEN** user clicks on a session in the sidebar that has no cached messages
- **THEN** webui fetches `GET /api/v1/sessions/:id/history`
- **THEN** the response messages are formatted and displayed in the chat pane
- **THEN** subsequent messages are sent to the same session

#### Scenario: Switch between sessions
- **WHEN** user clicks on a different session in the sidebar
- **THEN** the chat pane switches to show that session's messages
- **THEN** new messages go to the newly selected session

#### Scenario: Continue conversation in same session
- **WHEN** user sends additional messages in an existing session
- **THEN** messages are appended to the same conversation
- **THEN** `POST /api/v1/sessions/:id/message` continues the existing session

### Requirement: Error states are handled gracefully

The webui SHALL handle API errors and display user-friendly error messages.

#### Scenario: API returns error
- **WHEN** API returns `{"type": "error", "error": "..."}`
- **THEN** error message is displayed in the chat
- **THEN** streaming state is reset
- **THEN** user can continue using the app

#### Scenario: Network failure during stream
- **WHEN** network connection drops during SSE stream
- **THEN** connection error is displayed
- **THEN** user can retry sending the message

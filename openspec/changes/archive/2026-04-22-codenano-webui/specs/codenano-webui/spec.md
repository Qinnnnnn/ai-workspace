## Purpose

React WebUI for interacting with codenano-api. Provides a chat interface for creating sessions, sending messages, and receiving streaming responses with tool call visualization.

## ADDED Requirements

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
- **THEN** tool cards can be collapsed/expanded individually

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

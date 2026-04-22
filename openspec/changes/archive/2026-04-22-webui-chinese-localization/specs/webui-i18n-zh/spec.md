## ADDED Requirements

### Requirement: All user-facing UI strings display in Simplified Chinese

The codenano-webui SHALL display all visible user-facing strings in Simplified Chinese. No English strings shall be visible to users in the default experience.

#### Scenario: Sidebar new chat button
- **WHEN** user views the sidebar
- **THEN** the button to start a new conversation shows "新建对话"

#### Scenario: Sidebar recent sessions label
- **WHEN** user views the sidebar
- **THEN** the label above the session list shows "最近"

#### Scenario: Delete conversation dialog title
- **WHEN** user requests deletion of a session
- **THEN** the dialog title displays "删除对话？"

#### Scenario: Delete conversation dialog confirm message
- **WHEN** user views the delete confirmation dialog
- **THEN** the message reads "确定要删除「{label}」吗？此操作无法撤销。"
- **AND** the cancel button reads "取消"
- **AND** the delete button reads "删除"

#### Scenario: Empty session list state
- **WHEN** user has no sessions
- **THEN** the sidebar displays "暂无会话"

#### Scenario: Session list loading state
- **WHEN** session list is being fetched
- **THEN** the sidebar displays "加载中…"

#### Scenario: Chat list delete menu item
- **WHEN** user opens the action menu on a session
- **THEN** the menu item to delete the session reads "删除"

#### Scenario: Welcome page heading
- **WHEN** user opens the app with no active session
- **THEN** the main area shows heading "有什么想问的？"

#### Scenario: Welcome page description
- **WHEN** user opens the app with no active session
- **THEN** the main area shows description "对话内容保存在服务器上，输入内容开始对话。"

#### Scenario: Composer placeholder — idle thread
- **WHEN** user has an active session and is not waiting for a response
- **THEN** the composer input placeholder reads "输入消息…"

#### Scenario: Composer placeholder — waiting for response
- **WHEN** user has sent a message and is waiting for a streaming response
- **THEN** the composer input placeholder reads "等待回复…"

#### Scenario: Composer placeholder — hero/compoh origin
- **WHEN** user is on the welcome page (no active session)
- **THEN** the composer placeholder reads "输入消息…"

#### Scenario: Composer placeholder — opening new chat
- **WHEN** user has sent a message from the welcome page and a new session is being created
- **THEN** the composer placeholder reads "正在开启新对话…"

#### Scenario: Loading conversation history
- **WHEN** user selects a session with uncached history
- **THEN** the chat area displays "加载对话中…"

#### Scenario: Tool call running state
- **WHEN** a tool call is in progress
- **THEN** the tool card displays "运行中…"

#### Scenario: Tool call failed state
- **WHEN** a tool call returns an error
- **THEN** the tool card displays "失败"

#### Scenario: Tool call input label
- **WHEN** a tool call card shows the input section
- **THEN** the label before the JSON input reads "输入："

### Requirement: Relative time displays in Chinese

The codenano-webui SHALL format relative time spans in Chinese using `Intl.RelativeTimeFormat` with the `'zh'` locale.

#### Scenario: Recent session timestamps
- **WHEN** a session shows its last activity time
- **THEN** the time span is formatted in Chinese (e.g., "3 分钟前", "2 小时前", "1 天前")

#### Scenario: Old session timestamps
- **WHEN** a session has no recent activity
- **THEN** timestamps still display in Chinese locale format

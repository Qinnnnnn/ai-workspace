## ADDED Requirements

### Requirement: Text events create assistant message if none exists
当 `onText` 回调被触发时，如果当前没有正在流式传输的 assistant 消息（`last.role !== 'assistant'` 或 `!last.isStreaming`），系统 SHALL 创建一个新的 assistant 消息，其 content 包含一个空的 text block。

#### Scenario: 内网 API 不输出 thinking，text 正常显示
- **WHEN** 用户发送消息后，收到 `text` 事件但没有任何 `thinking` 事件
- **THEN** 前端正确创建 assistant 消息并显示 text 内容

#### Scenario: 公网 API 输出 thinking，text 正常显示
- **WHEN** 用户发送消息后，收到 `thinking` 事件后收到 `text` 事件
- **THEN** `text` 事件复用到现有的 assistant 消息，不创建新的空消息

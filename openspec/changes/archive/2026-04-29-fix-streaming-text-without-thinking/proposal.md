## Why

当内网部署的模型 API 不输出 thinking 内容时，前端无法显示 agent 的响应。用户发送的消息后，只有 user prompt 显示，assistant 的文本回复完全丢失。这是因为前端假定 `thinking` 事件会先于 `text` 事件触发，assistant 消息只在 `onThinking` 回调中创建。

## What Changes

- 修改 `onText` 回调：当没有正在流式传输的 assistant 消息时，先创建一个空的消息对象再处理文本
- 确保 `text` 事件的处理不依赖于 `thinking` 事件的存在

## Capabilities

### New Capabilities
- `streaming-text-fallback`: 当模型 API 不输出 thinking 内容时，仍能正确显示 text 内容

### Modified Capabilities
- 无

## Impact

- **受影响代码**: `codenano-webui/src/App.tsx` 中的 `onText` 回调
- **测试场景**: 内网 API（不输出 thinking）和公网 API（输出 thinking）两种情况

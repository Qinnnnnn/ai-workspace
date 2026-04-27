## Why

用户在流式响应期间无法中断生成。当模型产生过长输出或触发了不希望执行的工具时，只能等待完成或刷新页面。中断后 session 消息状态可能不一致（assistant 含 tool_use 但无 tool_result），导致 next turn 发送时 Anthropic API 返回 400。

## What Changes

- 新增 `{ type: 'aborted' }` StreamEvent，显式区分"用户主动中断"与"网络错误"
- `runSessionTurn` 在 abort 信号触发时修复消息一致性：为未配对的 tool_use 补充 cancel tool_result 并持久化，然后 yield `aborted` 事件安全退出
- 新增 `POST /api/v1/sessions/:id/abort` API endpoint，前端主动调用触发服务端 abort
- streaming route 监听 HTTP `close` 事件作为兜底，防止网络层漏发 abort
- `useStream.abort()` 同时中断 SSE 读取 + 调用 abort API
- Composer 在流式时将发送按钮替换为 Stop 按钮（Square icon）
- App 收到 `aborted` 事件后保留已有内容、将未完成 tool_use 标记为"已取消"、允许立即发送新消息

## Capabilities

### New Capabilities
- `streaming-stop`: 流式响应中断能力——用户可随时中断流式生成，系统确保消息一致性并保留中断痕迹

### Modified Capabilities
- `stream-management`: 新增 `aborted` 事件类型；abort 信号在 `runSessionTurn` 多点检测并触发消息修复
- `session-management`: 新增 `POST /abort` endpoint；streaming route 增加 HTTP close 兜底
- `codenano-webui`: Composer 增加 Stop 按钮；useStream 支持服务端 abort；MessageBubble 显示"已取消"状态

## Impact

- **codenano/src/session.ts**: `runSessionTurn` 增加 abort 检测点和消息修复逻辑；`StreamEvent` 类型新增 `aborted`
- **codenano/src/types.ts**: `StreamEvent` 联合类型新增 `aborted` 成员
- **codenano-api/src/routes/sessions.ts**: 新增 abort endpoint；streaming route 增加 close 监听
- **codenano-webui/src/lib/types.ts**: 前端 `StreamEvent` 新增 `aborted`
- **codenano-webui/src/hooks/useStream.ts**: `abort()` 调用 abort API；处理 `aborted` 事件
- **codenano-webui/src/components/Composer.tsx**: 流式时显示 Stop 按钮
- **codenano-webui/src/App.tsx**: 处理 `onAborted` 回调，保留已有内容并标记中断
- **codenano-webui/src/components/MessageBubble.tsx**: 未完成 tool_use 显示"已取消"
- **codenano-webui/src/api/sessions.ts**: 新增 `abortSession()` API 调用
- **codenano-webui/src/lib/i18n.ts**: 新增中断相关文案

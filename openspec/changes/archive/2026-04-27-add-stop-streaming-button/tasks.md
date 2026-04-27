## 1. Backend: StreamEvent 类型扩展

- [x] 1.1 在 `codenano/src/types.ts` 的 `StreamEvent` 联合类型中新增 `{ type: 'aborted'; partialText: string }` 成员
- [x] 1.2 在 `codenano-webui/src/lib/types.ts` 的 `StreamEvent` 联合类型中新增对应 `{ type: 'aborted'; partialText: string }` 成员

## 2. Backend: runSessionTurn abort 修复逻辑

- [x] 2.1 在 `codenano/src/session.ts` 的模型调用 catch 块中增加 abort 检测：当 `abortController.signal.aborted` 时，调用 `streamingExecutor.discard()`，为未配对 tool_use 补 cancel tool_result 并持久化，yield `{ type: 'aborted', partialText }` 后 return
- [x] 2.2 在工具执行阶段（`streamingExecutor.getRemainingResults()` 循环）外增加 try-catch，捕获 abort 导致的工具中断，执行 discard → 补 tool_result → persist → yield `aborted` → return
- [x] 2.3 提取消息一致性修复为私有方法 `repairMessagesAfterAbort()`：检查 `messages` 尾部 assistant 是否含未配对 tool_use，若有则生成 cancel tool_result user message 并持久化

## 3. Backend: Abort API Endpoint

- [x] 3.1 在 `codenano-api/src/routes/sessions.ts` 新增 `POST /api/v1/sessions/:id/abort` 路由，调用 `entry.session.abort()` 并返回 `{ ok: true }`
- [x] 3.2 在 streaming message route 中添加 `request.raw.on('close', onClose)` 监听，关闭时调用 `entry.session.abort()`；stream 循环结束后 `off('close')` 清理

## 4. Frontend: API 客户端

- [x] 4.1 在 `codenano-webui/src/api/sessions.ts` 新增 `abortSession(sessionId: string)` 函数，调用 `POST /api/v1/sessions/:id/abort`，fire-and-forget（网络错误静默忽略）

## 5. Frontend: useStream Hook 改造

- [x] 5.1 在 `UseStreamCallbacks` 接口新增 `onAborted?: (partialText: string) => void` 回调
- [x] 5.2 在 `send()` 的 SSE 事件循环中处理 `aborted` 事件：调用 `callbacks.onAborted(event.partialText)` 并 break 循环
- [x] 5.3 改造 `abort()` 方法：先调用 `abortRef.current?.abort()` 断 SSE，再调用 `abortSession(sessionId)` 通知后端（需在 send 中保存当前 sessionId）

## 6. Frontend: Composer Stop 按钮

- [x] 6.1 在 `ComposerProps` 接口新增 `isStreaming?: boolean` 和 `onStop?: () => void`
- [x] 6.2 当 `isStreaming` 为 true 时，将 ArrowUp 发送按钮替换为 Square Stop 按钮，点击触发 `onStop`
- [x] 6.3 流式期间 textarea 保持可用（用户可提前输入下一条消息）

## 7. Frontend: App 状态处理

- [x] 7.1 在 `streamCallbacks` 中实现 `onAborted` 回调：drain 剩余文本 → 标记当前 streaming 消息 `isStreaming: false` → 设置 `sessionStreaming[sessionId] = false`
- [x] 7.2 在 `ThreadShell` 中传递 `onStop` 回调给 Composer，触发 `useStream.abort()`
- [x] 7.3 确保 aborted 事件不触发 `onError`（不在 UI 上显示错误气泡）

## 8. Frontend: MessageBubble 取消状态

- [x] 8.1 在 `ToolActionBlock` 组件中新增 `cancelled` 状态判断：当 `isPending` 且消息 `isStreaming === false`（即已终止但仍无 result）时显示"已取消"
- [x] 8.2 "已取消"状态使用 CancelledCircle 或 XCircle 图标 + 灰色样式，无 spinner

## 9. Frontend: 国际化文案

- [x] 9.1 在 `codenano-webui/src/lib/i18n.ts` 新增：`stopped: '已停止生成'`、`cancelled: '已取消'`、`stop: '停止'`

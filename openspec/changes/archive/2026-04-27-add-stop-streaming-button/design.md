## Context

codenano 的流式响应链路：前端 `useStream` → `POST /message` (SSE) → `session.stream()` → `runSessionTurn` async generator。当前 `useStream.abort()` 仅中断客户端 SSE 读取，服务端 `runSessionTurn` 继续运行，可能导致：
1. 用户已点 Stop，但模型仍在输出、工具仍在执行、消息仍在持久化
2. 中断后 `messages[]` 中 assistant 含 tool_use 但无对应 tool_result，next turn 触发 Anthropic API 400 错误
3. 前端无法区分"用户主动中断"与"网络错误"

## Goals / Non-Goals

**Goals:**
- 用户可随时中断流式响应，包括模型生成和工具执行阶段
- 中断后 `messages[]` 保持一致状态，session 可立即用于 next turn
- 前端收到显式 `aborted` 事件，精确区分中断与错误
- 中断痕迹保留：已有内容正常展示，未完成 tool 标记"已取消"

**Non-Goals:**
- 不支持中断单个工具（保留其他工具继续执行）——全量中断
- 不在中断后自动重试或恢复——用户主动发新消息
- 不修改 Anthropic SDK 的 stream 中断行为——依赖其 signal 支持
- 不处理多 tab 同时操作同一 session 的场景

## Decisions

### Decision 1: abort 触发方式 — 显式 API + HTTP close 兜底

**选择**：方案 C，`POST /abort` 为主要路径，`request.raw.on('close')` 为兜底。

**替代方案**：
- A) 仅 HTTP close → 网络波动误触发、不可靠
- B) 仅显式 API → 前端崩溃时服务端无感知

**理由**：显式 API 语义明确、可靠；close 兜底覆盖前端异常退出的边缘场景。两者结合确保服务端始终能收到中断信号。

### Decision 2: 消息修复由 `runSessionTurn` 自身完成

**选择**：不在 `gracefulAbort()` 中直接修改 `messages`，而是在 `runSessionTurn` 的 abort 检测点中执行修复。

**替代方案**：
- 在 `abort()` 方法中直接修复 → 与 `runSessionTurn` 并发访问 `messages`，竞态风险
- 新增独立修复方法 → 调用时机难以确定

**理由**：async generator 自己清理自己的状态最安全。`abort()` 只设 signal，`runSessionTurn` 在检测到 signal 后自行补齐 tool_result 并退出，无竞态。

### Decision 3: 新增 `{ type: 'aborted'; partialText: string }` 事件

**选择**：新增显式事件类型。

**替代方案**：
- 前端推断（没收到 `result` 就 SSE 断开）→ 脆弱，无法区分中断与网络错误

**理由**：`partialText` 让前端知道中断时已生成了多少文本，用于保留已有内容。显式事件让 UI 可给出精准提示。

### Decision 4: Stop 按钮放在 Composer 内替换发送按钮

**选择**：复用发送按钮位置，流式时图标变为 Square、点击触发 `onStop`。

**替代方案**：
- 放在消息流中（ChatGPT 早期风格）→ UI 复杂度高、需处理滚动定位

**理由**：操作点固定，符合 ChatGPT/Gemini 主流交互范式，肌肉记忆友好。

### Decision 5: 中断后保留所有已生成内容

**选择**：已完成的 text、thinking、tool_result 全部保留；未完成 tool_use 由后端补 cancel tool_result。

**理由**：
- 保留上下文让用户理解"中断前发生了什么"
- 补 cancel tool_result 确保 Anthropic API 不会因 tool_use 无 tool_result 而 400
- cancel tool_result 中的 `is_error: true` 让模型在 next turn 知道该工具未成功

## Risks / Trade-offs

- **[竞态] abort 后 SSE 事件乱序** → `runSessionTurn` yield `aborted` 后立即 return，后续不会再 yield 事件。前端收到 `aborted` 后忽略后续任何事件。
- **[延迟] 工具执行中的 abort 可能等待当前操作完成** → 工具的 `signal` 传递到 RuntimeContext，Docker 执行等操作需检查 signal 支持程度。最坏情况工具执行完才退出，但 `aborted` 事件确保前端立即响应。
- **[兜底] HTTP close 在正常流式完成时也会触发** → streaming route 在循环结束后 `off('close')` 监听；且 `session.abort()` 在 `abortController.signal.aborted` 为 false 时无害（只是创建新 controller）。
- **[一致性] 修复逻辑仅在 `runSessionTurn` 内** → 如果 abort 发生在 `runSessionTurn` 之外（理论上不可能，因为 abort 只在 stream 期间有意义），不会有修复。但 `POST /abort` endpoint 只在 stream 活跃时有意义。

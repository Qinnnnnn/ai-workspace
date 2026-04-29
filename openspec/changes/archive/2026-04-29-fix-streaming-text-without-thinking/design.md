## Context

当前 `onText` 回调的实现假设 `thinking` 事件会先于 `text` 事件到达，因此只在 `onThinking` 中创建 assistant 消息。当内网 API 不输出 thinking 时，`onText` 触发时没有可更新的 assistant 消息，导致文本丢失。

## Goals / Non-Goals

**Goals:**
- 确保在没有任何 thinking 事件的情况下，text 内容也能正确显示
- 保持公网 API（输出 thinking）的现有行为不变

**Non-Goals:**
- 不修改 thinking 事件的处理逻辑
- 不改变消息的最终数据结构

## Decisions

### Decision: 在 onText 中创建空消息作为 fallback

**Options Considered:**

1. **在 onText 中创建空消息（Selected）**
   - Pros: 改动最小，只修改 onText 一个地方
   - Pros: 逻辑简单，当没有正在流式传输的 assistant 消息时，先创建一个带空 text 的消息
   - Cons: 需要访问 sessionId 和 uuid，需要确保 streamSessionRef.current 存在

2. **把消息创建逻辑提取到独立的 helper**
   - Pros: 更清晰的关注点分离
   - Cons: 改动更大，需要重构多个回调

**Rationale**: 选择方案 1，因为这是一个 localized fix，不需要大规模重构。

**Implementation approach:**

```typescript
onText: (text: string) => {
  thinkingActiveRef.current = false
  if (!streamSessionRef.current) return

  // 如果没有正在流式传输的 assistant 消息，先创建一个
  setSessionMessages((prev) => {
    const msgs = prev[streamSessionRef.current!] ?? []
    const last = msgs[msgs.length - 1]
    if (!last || last.role !== 'assistant' || !last.isStreaming) {
      // 创建新的 assistant 消息
      return {
        ...prev,
        [streamSessionRef.current!]: [
          ...msgs,
          { id: uuid(), role: 'assistant', content: [{ type: 'text', text: '' }], isStreaming: true, createdAt: Date.now() },
        ],
      }
    }
    return prev
  })

  pendingTextRef.current += text
  if (!drainingRef.current) {
    drainPendingText()
  }
}
```

## Risks / Trade-offs

- **Risk**: 多余的空消息创建（公网 API）
  - **Mitigation**: 公网 API 会先触发 onThinking，此时会复用或创建带 thinking 的消息，不会走到空消息分支

- **Risk**: 状态更新顺序问题
  - **Mitigation**: 使用 setSessionMessages 的函数式更新确保状态正确

import type { UIMessage, ContentBlock, ToolResultBlock } from './types'

/**
 * 核心逻辑：将分散在不同 Role 里的 tool_use 和 tool_result 按照 ID 缝合，并清理历史结构
 */
export function normalizeChatHistory(messages: UIMessage[]): UIMessage[] {
  const normalized: UIMessage[] = []
  const toolUseMap = new Map<string, Extract<ContentBlock, { type: 'tool_use' }>>()

  for (const msg of messages) {
    let blocks: ContentBlock[] = []
    if (Array.isArray(msg.content)) {
      blocks = msg.content
    } else if (typeof msg.content === 'string') {
      try {
        const trimmed = msg.content.trim()
        blocks = trimmed.startsWith('[') ? JSON.parse(trimmed) : [{ type: 'text', text: msg.content }]
      } catch {
        blocks = [{ type: 'text', text: msg.content }]
      }
    }

    const newBlocks: ContentBlock[] = []

    for (const block of blocks) {
      if (block.type === 'tool_use') {
        toolUseMap.set(block.id, block)
        newBlocks.push(block)
      } else if (block.type === 'tool_result') {
        const targetToolUse = toolUseMap.get(block.tool_use_id)
        if (targetToolUse) {
          // 💡 核心修改 1：缝合成功后，不要再把 tool_result push 到 newBlocks 里了
          targetToolUse.result = block as ToolResultBlock
        } else {
          // 边缘保护：只有找不到配对的 tool_use 时，才勉强保留它防止数据丢失
          newBlocks.push(block)
        }
      } else {
        newBlocks.push(block)
      }
    }

    // 💡 核心修改 2：如果过滤后当前消息变空了（说明它全是被成功缝合拿走的 tool_result）
    // 直接 continue 丢弃整条消息，从根源上消灭“幽灵节点”
    if (newBlocks.length === 0) {
      continue
    }

    const newMsg = { ...msg, content: newBlocks }

    // 合并连续的 Assistant 消息，避免同一回合内产生割裂的气泡
    const lastMsg = normalized[normalized.length - 1]
    if (msg.role === 'assistant' && lastMsg && lastMsg.role === 'assistant') {
      lastMsg.content = [...(lastMsg.content as ContentBlock[]), ...newMsg.content]
    } else {
      normalized.push(newMsg)
    }
  }

  return normalized
}
import type { UIMessage, ContentBlock, ToolResultBlock } from './types'

/**
 * 核心逻辑：将分散在不同 Role 里的 tool_use 和 tool_result 按照 ID 缝合
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
    let isOnlyToolResult = true

    for (const block of blocks) {
      if (block.type === 'tool_use') {
        toolUseMap.set(block.id, block)
        newBlocks.push(block)
        isOnlyToolResult = false
      } else if (block.type === 'tool_result') {
        const targetToolUse = toolUseMap.get(block.tool_use_id)
        if (targetToolUse) {
          targetToolUse.result = block as ToolResultBlock
        }
        // 保留 tool_result 以防它是独立的（没有配对的 tool_use）
        newBlocks.push(block)
        isOnlyToolResult = false
      } else {
        newBlocks.push(block)
        isOnlyToolResult = false
      }
    }

    if (!isOnlyToolResult || newBlocks.length > 0) {
      normalized.push({ ...msg, content: newBlocks })
    }
  }

  return normalized
}

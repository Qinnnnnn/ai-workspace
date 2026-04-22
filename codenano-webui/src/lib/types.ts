// Types aligned with codenano-api StreamEvent

export type StreamEvent =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'tool_use'; toolName: string; toolUseId: string; input: unknown }
  | { type: 'tool_result'; toolUseId: string; output: string; isError: boolean }
  | { type: 'turn_start'; turnNumber: number }
  | { type: 'turn_end'; stopReason: string; turnNumber: number }
  | { type: 'query_start'; queryTracking: { chainId: string; depth: number } }
  | { type: 'result'; result: Result }
  | { type: 'error'; error: { message?: string } }

export interface Result {
  text: string
  messages: MessageParam[]
  usage: Usage
  stopReason: string
  numTurns: number
  durationMs: number
  costUSD: number
  queryTracking: { chainId: string; depth: number }
}

export interface Usage {
  inputTokens: number
  outputTokens: number
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
}

export type MessageParam = { role: 'user' | 'assistant' | 'tool' | 'system'; content: string | ContentBlock[] }

export interface ToolResultBlock {
  tool_use_id: string
  content: string
  is_error?: boolean
}

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown; result?: ToolResultBlock }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }
  | { type: 'thinking'; thinking: string }

export interface SessionSummary {
  sessionId: string
  createdAt: string | null
  lastActivity: string | null
  workspace?: string
  active?: boolean
}

export interface HistoryMessage {
  role: string
  content: string | ContentBlock[]
}

// UI state types
export type Role = 'user' | 'assistant' | 'tool' | 'system'

export interface UIMessage {
  id: string
  role: Role
  // ✨ 核心：让 UI 状态支持渲染富文本 Block 数组
  content: string | ContentBlock[]
  isStreaming?: boolean
  createdAt: number
  traces?: string[]
}
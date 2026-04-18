import type { AgentConfig, StreamEvent, MessageParam } from 'codenano'

export interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: number | string | null
  method: string
  params?: Record<string, unknown>
}

export interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: number | string | null
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

export interface JsonRpcNotification {
  jsonrpc: '2.0'
  method: 'stream'
  params: { type: string; data: unknown }
}

export interface InitParams {
  config: AgentConfig
}

export interface SendParams {
  sessionId: string
  prompt: string
  // Per-message overrides (merged with agent config)
  model?: string
  systemPrompt?: string
  overrideSystemPrompt?: string
  appendSystemPrompt?: string
  maxOutputTokens?: number
  thinkingConfig?: 'adaptive' | 'disabled'
}

export interface CloseParams {
  sessionId: string
}

export interface HistoryParams {
  sessionId: string
}

export interface StreamData {
  type: StreamEvent['type']
  data: Omit<StreamEvent, 'type'> & { type?: never }
}

export type SessionInfo = {
  sessionId: string
  createdAt: string
  lastActivity: string
}

export interface ReadFileParams {
  sessionId: string
  path: string
}

export interface ListFilesParams {
  sessionId: string
  path?: string
}

export interface FileInfo {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modified: string
}

export interface ReadFileResult {
  content: string
  path: string
}

export interface ListFilesResult {
  files: FileInfo[]
  path: string
}

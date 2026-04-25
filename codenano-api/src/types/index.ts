import type { Agent, Session, StreamEvent, RuntimeContext } from 'codenano'

export type { Agent, Session, StreamEvent, RuntimeContext }

export type ToolPermission = 'allow' | 'deny'

export interface MCPServerConfig {
  name: string
  transport: 'stdio' | 'sse' | 'http'
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
  headers?: Record<string, string>
}

export interface SessionEntry {
  agent: Agent
  session: Session
  createdAt: Date
  lastActivity: Date
  toolPermissions: Record<string, ToolPermission>
}

export interface SessionCreateConfig {
  // Model config
  model?: string
  apiKey?: string
  baseURL?: string
  provider?: 'anthropic' | 'bedrock'
  awsRegion?: string
  fallbackModel?: string

  // Tool config
  toolPreset?: 'core' | 'extended' | 'all'

  // Prompt config
  systemPrompt?: string
  identity?: string
  language?: string
  overrideSystemPrompt?: string
  appendSystemPrompt?: string

  // Execution config
  sandbox?: boolean
  maxTurns?: number
  thinkingConfig?: 'adaptive' | 'disabled'
  maxOutputTokens?: number
  maxOutputRecoveryAttempts?: number

  // Advanced config
  autoCompact?: boolean
  autoLoadInstructions?: boolean
  toolResultBudget?: boolean
  maxOutputTokensCap?: boolean
  streamingToolExecution?: boolean
}

export interface SessionCreateBody {
  config: SessionCreateConfig
  resumeSessionId?: string
  toolPermissions?: Record<string, ToolPermission>
}

export interface ServiceAgentConfig {
  // Model config
  model?: string
  apiKey?: string
  baseURL?: string
  provider?: 'anthropic' | 'bedrock'
  awsRegion?: string
  fallbackModel?: string

  // Tool config
  toolPreset?: 'core' | 'extended' | 'all'
  tools?: unknown[]

  // Prompt config
  systemPrompt?: string
  identity?: string
  language?: string
  overrideSystemPrompt?: string
  appendSystemPrompt?: string

  // Execution config
  maxTurns?: number
  thinkingConfig?: 'adaptive' | 'disabled'
  maxOutputTokens?: number
  maxOutputRecoveryAttempts?: number

  // Advanced config
  autoCompact?: boolean
  autoLoadInstructions?: boolean
  toolResultBudget?: boolean
  maxOutputTokensCap?: boolean
  streamingToolExecution?: boolean

  // MCP
  mcpServers?: MCPServerConfig[]

  // Persistence
  persistence?: {
    enabled?: boolean
    storageDir?: string
    resumeSessionId?: string
  }

  // Memory
  memory?: {
    memoryDir?: string
    autoLoad?: boolean
    extractStrategy?: 'disabled' | 'auto' | { interval: number }
    extractMaxTurns?: number
    useForkedAgent?: boolean
  }
}

export interface SendMessageBody {
  prompt: string
  stream?: boolean
}

export interface SaveMemoryBody {
  key: string
  content: string
  type?: string
  description?: string
}

import type { Agent, Session, StreamEvent } from 'codenano'

export type { Agent, Session, StreamEvent }

export type ToolPermission = 'allow' | 'deny' | 'ask'

export interface MCPServerConfig {
  name: string
  transport: 'stdio' | 'sse' | 'http'
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
  headers?: Record<string, string>
}

export interface HookCoordinator {
  registerHooks(hooks: HookType[]): void
  isHookRegistered(hookType: HookType): boolean
  emitAndWait(hookType: HookType, data: Record<string, unknown>): Promise<HookDecision>
  onDecision(hookId: string, decision: HookDecision): void
  setSocket(socket: unknown): void
  close(): void
}

export interface SessionEntry {
  agent: Agent
  session: Session
  createdAt: Date
  lastActivity: Date
  toolPermissions: Record<string, ToolPermission>
  hookCoordinator: HookCoordinator | null
}

export interface HookDecision {
  behavior: 'allow' | 'deny'
  message?: string
  continueWith?: string
}

export type HookType =
  | 'onPreToolUse'
  | 'onPostToolUse'
  | 'onTurnEnd'
  | 'onTurnStart'
  | 'onError'
  | 'onCompact'
  | 'onMaxTurns'
  | 'onSessionStart'

export interface HookEvent {
  type: 'hook_event'
  hookId: string
  hookType: HookType
  data: Record<string, unknown>
}

export interface SessionCreateBody {
  config: ServiceAgentConfig
  hooks?: HookType[]
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

export interface ConnectMCPServerBody {
  serverId?: string
  config: {
    command: string
    args?: string[]
    env?: Record<string, string>
  }
}

export interface CallMCPToolBody {
  serverId: string
  toolName: string
  toolInput: Record<string, unknown>
}

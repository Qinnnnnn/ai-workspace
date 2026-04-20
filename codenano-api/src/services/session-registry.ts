import type { Agent, Session } from 'codenano'
import { createAgent, coreTools, extendedTools, allTools } from 'codenano'
import type { SessionEntry, ToolPermission, HookType, ServiceAgentConfig, MCPServerConfig } from '../types/index.js'
import { HookCoordinator } from './hook-coordinator.js'
import type { MCPConnection } from 'codenano'

const SB_TTL_MINUTES = parseInt(process.env.SB_TTL_MINUTES ?? '30', 10)
const CLEANUP_INTERVAL_MS = 60000

export class SessionRegistry {
  private sessions = new Map<string, SessionEntry>()
  private cleanupTask: NodeJS.Timeout | null = null
  private mcpConnections = new Map<string, MCPConnection>()

  constructor() {
    this.startCleanupLoop()
  }

  private startCleanupLoop(): void {
    this.cleanupTask = setInterval(() => {
      this.cleanup()
    }, CLEANUP_INTERVAL_MS)
  }

  private cleanup(): void {
    const ttl = SB_TTL_MINUTES * 60 * 1000
    const now = Date.now()

    for (const [sessionId, entry] of this.sessions) {
      if (now - entry.lastActivity.getTime() > ttl) {
        this.destroy(sessionId)
      }
    }
  }

  async create(
    config: ServiceAgentConfig,
    toolPermissions: Record<string, ToolPermission> = {},
    hooks: HookType[] = []
  ): Promise<string> {
    // Resolve tools from preset or custom
    const tools = this.resolveTools(config)

    // Build agent config (without toolPreset since SDK doesn't use it)
    const agentConfig = {
      model: config.model,
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      maxTurns: config.maxTurns,
      thinkingConfig: config.thinkingConfig,
      maxOutputTokens: config.maxOutputTokens,
      identity: config.identity,
      language: config.language,
      overrideSystemPrompt: config.overrideSystemPrompt,
      appendSystemPrompt: config.appendSystemPrompt,
      provider: config.provider,
      awsRegion: config.awsRegion,
      autoCompact: config.autoCompact,
      fallbackModel: config.fallbackModel,
      maxOutputRecoveryAttempts: config.maxOutputRecoveryAttempts,
      autoLoadInstructions: config.autoLoadInstructions,
      toolResultBudget: config.toolResultBudget,
      maxOutputTokensCap: config.maxOutputTokensCap,
      streamingToolExecution: config.streamingToolExecution,
      mcpServers: config.mcpServers,
      persistence: config.persistence,
      memory: config.memory,
      tools,
    }

    const agent = createAgent(agentConfig as any)
    const session = agent.session()

    const hookCoordinator = hooks.length > 0 ? new HookCoordinator() : null
    if (hookCoordinator) {
      hookCoordinator.registerHooks(hooks)
    }

    const sessionId = session.id
    this.sessions.set(sessionId, {
      agent,
      session,
      createdAt: new Date(),
      lastActivity: new Date(),
      toolPermissions,
      hookCoordinator,
    })

    return sessionId
  }

  private resolveTools(config: ServiceAgentConfig): any[] {
    if (config.tools && config.tools.length > 0) {
      return config.tools as any[]
    }

    const preset = config.toolPreset ?? 'core'
    switch (preset) {
      case 'core':
        return coreTools()
      case 'extended':
        return extendedTools()
      case 'all':
        return allTools()
      default:
        return coreTools()
    }
  }

  get(sessionId: string): SessionEntry | undefined {
    return this.sessions.get(sessionId)
  }

  touch(sessionId: string): void {
    const entry = this.sessions.get(sessionId)
    if (entry) {
      entry.lastActivity = new Date()
    }
  }

  list(): Array<{
    sessionId: string
    createdAt: string
    lastActivity: string
    historyLength: number
  }> {
    const result = []
    for (const [sessionId, entry] of this.sessions) {
      result.push({
        sessionId,
        createdAt: entry.createdAt.toISOString(),
        lastActivity: entry.lastActivity.toISOString(),
        historyLength: entry.session.history.length,
      })
    }
    return result
  }

  async destroy(sessionId: string): Promise<void> {
    const entry = this.sessions.get(sessionId)
    if (entry) {
      entry.agent.abort()
      entry.hookCoordinator?.close()
      this.sessions.delete(sessionId)
    }
  }

  async destroyAll(): Promise<void> {
    for (const sessionId of this.sessions.keys()) {
      await this.destroy(sessionId)
    }

    // Disconnect all MCP servers
    for (const [, connection] of this.mcpConnections) {
      try {
        await connection.close()
      } catch {
        // Ignore errors during shutdown
      }
    }
    this.mcpConnections.clear()

    if (this.cleanupTask) {
      clearInterval(this.cleanupTask)
      this.cleanupTask = null
    }
  }

  // MCP server management
  async connectMCPServer(
    serverId: string,
    config: MCPServerConfig
  ): Promise<void> {
    const { connectMCPServer } = await import('codenano')
    const connection = await connectMCPServer(config)
    this.mcpConnections.set(serverId, connection)
  }

  getMCPConnection(serverId: string): MCPConnection | undefined {
    return this.mcpConnections.get(serverId)
  }

  async disconnectMCPServer(serverId: string): Promise<void> {
    const connection = this.mcpConnections.get(serverId)
    if (connection) {
      await connection.close()
      this.mcpConnections.delete(serverId)
    }
  }

  listMCPServers(): Array<{ serverId: string }> {
    return Array.from(this.mcpConnections.keys()).map((serverId) => ({ serverId }))
  }
}

// Singleton instance
let registry: SessionRegistry | null = null

export function getSessionRegistry(): SessionRegistry {
  if (!registry) {
    registry = new SessionRegistry()
  }
  return registry
}

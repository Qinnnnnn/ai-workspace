import type { Agent, Session, StreamEvent } from 'codenano'
import { HookCoordinator } from '../hooks/hook-coordinator.js'
import type { ToolPermission } from '../types/index.js'
import type { MCPServerConfig } from 'codenano'

const SB_TTL_MINUTES = parseInt(process.env.SB_TTL_MINUTES ?? '30', 10)
const CLEANUP_INTERVAL_MS = 60000

export interface SessionEntry {
  agent: Agent
  session: Session
  sessionId: string
  createdAt: Date
  lastActivity: Date
  toolPermissions: Record<string, ToolPermission>
  hookCoordinator: HookCoordinator | null
}

export class SessionRegistry {
  private sessions = new Map<string, SessionEntry>()
  private cleanupTask: NodeJS.Timeout | null = null
  private mcpConnections = new Map<string, Awaited<ReturnType<typeof import('codenano').connectMCPServer>>>()

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

  /**
   * Register a new session with agent and session instances.
   */
  register(sessionId: string, agent: Agent, session: Session, options: {
    toolPermissions?: Record<string, ToolPermission>
    hookCoordinator?: HookCoordinator | null
  } = {}): void {
    const entry: SessionEntry = {
      agent,
      session,
      sessionId,
      createdAt: new Date(),
      lastActivity: new Date(),
      toolPermissions: options.toolPermissions ?? {},
      hookCoordinator: options.hookCoordinator ?? null,
    }

    this.sessions.set(sessionId, entry)
  }

  /**
   * Create a new session (generates UUID).
   */
  create(options: {
    toolPermissions?: Record<string, ToolPermission>
    hookCoordinator?: HookCoordinator | null
  } = {}): string {
    const sessionId = crypto.randomUUID()
    // Note: Actual agent/session creation happens in routes, this just registers
    this.sessions.set(sessionId, {
      agent: null as any,
      session: null as any,
      sessionId,
      createdAt: new Date(),
      lastActivity: new Date(),
      toolPermissions: options.toolPermissions ?? {},
      hookCoordinator: options.hookCoordinator ?? null,
    })
    return sessionId
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
  }> {
    return Array.from(this.sessions.values()).map((entry) => ({
      sessionId: entry.sessionId,
      createdAt: entry.createdAt.toISOString(),
      lastActivity: entry.lastActivity.toISOString(),
    }))
  }

  async destroy(sessionId: string): Promise<void> {
    const entry = this.sessions.get(sessionId)
    if (!entry) return

    // Abort any ongoing session operation
    try {
      entry.session.abort()
    } catch {
      // Ignore abort errors
    }

    entry.hookCoordinator?.close()
    this.sessions.delete(sessionId)
  }

  async destroyAll(): Promise<void> {
    for (const sessionId of this.sessions.keys()) {
      await this.destroy(sessionId)
    }

    // Close all MCP connections
    for (const [, connection] of this.mcpConnections) {
      try {
        await connection.close()
      } catch {
        // Ignore close errors
      }
    }
    this.mcpConnections.clear()

    if (this.cleanupTask) {
      clearInterval(this.cleanupTask)
      this.cleanupTask = null
    }
  }

  // MCP management
  async connectMCPServer(serverId: string, config: MCPServerConfig): Promise<void> {
    const { connectMCPServer } = await import('codenano')
    const connection = await connectMCPServer(config)
    this.mcpConnections.set(serverId, connection)
  }

  getMCPConnection(serverId: string): Awaited<ReturnType<typeof import('codenano').connectMCPServer>> | undefined {
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

let registry: SessionRegistry | null = null

export function getSessionRegistry(): SessionRegistry {
  if (!registry) {
    registry = new SessionRegistry()
  }
  return registry
}

export function resetSessionRegistry(): void {
  registry = null
}

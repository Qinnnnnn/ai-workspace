import type { Agent, Session } from 'codenano'
import { getSessionStorageDir } from 'codenano'
import type { ToolPermission } from '../types/index.js'
import fs from 'fs'
import path from 'path'
import { stopContainer } from './docker-service.js'

const SB_TTL_MINUTES = parseInt(process.env.SB_TTL_MINUTES ?? '30', 10)
const CLEANUP_INTERVAL_MS = 60000

export interface SessionEntry {
  agent: Agent
  session: Session
  sessionId: string
  createdAt: Date
  lastActivity: Date
  toolPermissions: Record<string, ToolPermission>
  cwd: string
  containerId: string | null
}

export class SessionRegistry {
  private sessions = new Map<string, SessionEntry>()
  private cleanupTask: NodeJS.Timeout | null = null

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
    cwd: string
    containerId: string | null
  }): void {
    const entry: SessionEntry = {
      agent,
      session,
      sessionId,
      createdAt: new Date(),
      lastActivity: new Date(),
      toolPermissions: options.toolPermissions ?? {},
      cwd: options.cwd,
      containerId: options.containerId,
    }

    this.sessions.set(sessionId, entry)
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
    cwd: string
    containerId: string | null
  }> {
    return Array.from(this.sessions.values()).map((entry) => ({
      sessionId: entry.sessionId,
      createdAt: entry.createdAt.toISOString(),
      lastActivity: entry.lastActivity.toISOString(),
      cwd: entry.cwd,
      containerId: entry.containerId,
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

    // Stop and remove Docker container
    if (entry.containerId) {
      try {
        await stopContainer(entry.containerId)
      } catch {
        // Ignore container cleanup errors
      }
    }

    // Delete session JSONL file
    try {
      fs.rmSync(path.join(getSessionStorageDir(), `${sessionId}.jsonl`), { force: true })
    } catch {
      // Ignore cleanup errors
    }

    // Delete workspace directory
    try {
      fs.rmSync(entry.cwd, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }

    this.sessions.delete(sessionId)
  }

  async destroyAll(): Promise<void> {
    for (const sessionId of this.sessions.keys()) {
      await this.destroy(sessionId)
    }

    if (this.cleanupTask) {
      clearInterval(this.cleanupTask)
      this.cleanupTask = null
    }
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

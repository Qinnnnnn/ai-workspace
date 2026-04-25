import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { loadSession, listSessions as codenanoListSessions, getSessionStorageDir } from 'codenano'
import { createAgentInstance } from '../agent.js'
import { getSessionRegistry } from '../services/session-registry.js'
import { createContainer, startContainer } from '../services/docker-service.js'
import type {
  SessionCreateBody,
  SendMessageBody,
  ToolPermission,
} from '../types/index.js'
import type { RuntimeContext } from 'codenano'
import { homedir } from 'os'
import { mkdirSync, rmSync } from 'fs'
import { join } from 'path'

const SSE_DELIMITER = '\n\n'

const sseWrite = (res: any, event: object) => {
  res.write(`data: ${JSON.stringify(event)}${SSE_DELIMITER}`)
}

export async function sessionsRoutes(fastify: FastifyInstance): Promise<void> {
  const registry = getSessionRegistry()
  const WORKSPACE_BASE = join(homedir(), '.agent-core', 'workspaces')

  // Create session with direct library call
  fastify.post('/api/v1/sessions', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as SessionCreateBody
    const { config = {}, toolPermissions = {}, resumeSessionId } = body

    if (config.toolPreset && !['core', 'extended', 'all'].includes(config.toolPreset)) {
      return reply.status(400).send({ error: 'Invalid tool preset. Must be "core", "extended", or "all".' })
    }

    // Create session ID and workspace
    const sessionId = resumeSessionId ?? crypto.randomUUID()
    const physicalPath = join(WORKSPACE_BASE, sessionId)

    // Create workspace directory
    mkdirSync(physicalPath, { recursive: true })

    // Determine runtime mode
    const isSandbox = config.sandbox !== false

    let containerId: string | null = null
    let runtime: RuntimeContext

    if (isSandbox) {
      // Create and start Docker container (sandbox mode)
      // Docker is required - fail fast if unavailable
      try {
        containerId = await createContainer(sessionId, physicalPath)
        await startContainer(containerId)
      } catch (err) {
        // Clean up workspace directory on failure
        try { rmSync(physicalPath, { recursive: true, force: true }) } catch { /* ignore */ }
        const message = err instanceof Error ? err.message : String(err)
        return reply.status(503).send({
          error: 'Docker unavailable',
          message: `Cannot create session: ${message}. Sandbox mode requires Docker.`,
        })
      }

      // Build runtime context for sandbox mode
      runtime = {
        type: 'sandbox',
        cwd: '/workspace',
        hostWorkspaceDir: physicalPath,
        containerId,
      }
    } else {
      // Local mode - no Docker, use local filesystem
      runtime = {
        type: 'local',
        cwd: physicalPath,
      }
    }

    // Build persistence config
    const persistence: { enabled: boolean; storageDir?: string; resumeSessionId?: string } = {
      enabled: true,
      storageDir: getSessionStorageDir(),
    }
    if (resumeSessionId) {
      persistence.resumeSessionId = resumeSessionId
    }

    // Passthrough config with runtime context added
    const agentConfig: any = {
      ...config,
      runtime,
      model: config.model ?? process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
      apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
      baseURL: config.baseURL ?? process.env.ANTHROPIC_BASE_URL,
    }

    // Create agent with direct library call
    const agent = createAgentInstance({
      ...agentConfig,
      toolPermissions: toolPermissions as Record<string, ToolPermission>,
    })

    // Create session
    const session = agent.session(sessionId)

    // Register in registry
    registry.register(sessionId, agent, session, {
      toolPermissions: toolPermissions as Record<string, ToolPermission>,
      cwd: physicalPath,
      containerId,
    })

    return reply.send({
      sessionId,
      cwd: isSandbox ? '/workspace' : physicalPath,
      sandboxEnabled: isSandbox,
      containerId: containerId ?? undefined,
    })
  })

  // List all sessions
  fastify.get('/api/v1/sessions', async (_request: FastifyRequest, reply: FastifyReply) => {
    // Get persisted sessions from codenano
    const persistedSessions = codenanoListSessions({ storageDir: getSessionStorageDir() })

    // Get active in-memory sessions
    const activeSessions = registry.list()

    // Merge - active sessions take precedence for metadata
    const sessionMap = new Map<string, any>()

    for (const session of persistedSessions) {
      sessionMap.set(session.sessionId, session)
    }

    for (const entry of activeSessions) {
      const isSandbox = entry.containerId !== null
      const virtualCwd = isSandbox ? '/workspace' : entry.cwd
      if (sessionMap.has(entry.sessionId)) {
        const existing = sessionMap.get(entry.sessionId) as any
        sessionMap.set(entry.sessionId, {
          ...existing,
          lastActivity: entry.lastActivity,
          cwd: virtualCwd,
          sandboxEnabled: isSandbox,
          containerId: entry.containerId ?? undefined,
          active: true,
        })
      } else {
        sessionMap.set(entry.sessionId, {
          sessionId: entry.sessionId,
          createdAt: entry.createdAt,
          lastActivity: entry.lastActivity,
          cwd: virtualCwd,
          sandboxEnabled: isSandbox,
          containerId: entry.containerId ?? undefined,
          active: true,
        })
      }
    }

    return reply.send({ sessions: Array.from(sessionMap.values()) })
  })

  // Get session by ID
  fastify.get('/api/v1/sessions/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const entry = registry.get(id)

    if (!entry) {
      return reply.status(404).send({ error: 'Session not found' })
    }

    registry.touch(id)

    return reply.send({
      sessionId: id,
      cwd: entry.containerId ? '/workspace' : entry.cwd,
      sandboxEnabled: entry.containerId !== null,
      containerId: entry.containerId,
      createdAt: entry.createdAt.toISOString(),
      lastActivity: entry.lastActivity.toISOString(),
    })
  })

  // Delete session
  fastify.delete('/api/v1/sessions/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const entry = registry.get(id)

    if (!entry) {
      return reply.status(404).send({ error: 'Session not found' })
    }

    await registry.destroy(id)
    return reply.send({ ok: true })
  })

  // Get session history using codenano's loadSession
  fastify.get('/api/v1/sessions/:id/history', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const entry = registry.get(id)

    if (!entry) {
      return reply.status(404).send({ error: 'Session not found' })
    }

    registry.touch(id)

    // Load history from codenano's session persistence
    const loadedSession = loadSession(id, { storageDir: getSessionStorageDir() })

    if (!loadedSession) {
      return reply.send({ history: [], message: 'No history found' })
    }

    return reply.send({ history: loadedSession.messages })
  })

  // Send message (streaming or non-streaming)
  fastify.post('/api/v1/sessions/:id/message', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const body = request.body as SendMessageBody
    const { prompt, stream = true } = body

    const entry = registry.get(id)
    if (!entry) {
      return reply.status(404).send({ error: 'Session not found' })
    }

    registry.touch(id)

    if (!stream) {
      try {
        const result = await entry.session.send(prompt)
        return reply.send({ result })
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        return reply.status(500).send({ error })
      }
    }

    // Streaming SSE - directly stream codenano events
    reply.raw!.setHeader('Content-Type', 'text/event-stream')
    reply.raw!.setHeader('Cache-Control', 'no-cache')
    reply.raw!.setHeader('Connection', 'keep-alive')

    try {
      for await (const event of entry.session.stream(prompt)) {
        sseWrite(reply.raw!, event)
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      sseWrite(reply.raw!, { type: 'error', error })
    }

    reply.raw!.end()
  })
}

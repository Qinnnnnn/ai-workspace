import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { loadSession, listSessions as codenanoListSessions, getSessionStorageDir } from 'codenano'
import { createAgentInstance } from '../agent.js'
import { getSessionRegistry, type SessionEntry } from '../services/session-registry.js'
import { HookCoordinator } from '../hooks/hook-coordinator.js'
import type {
  SessionCreateBody,
  SendMessageBody,
  HookType,
  ToolPermission,
} from '../types/index.js'
import type { Agent, Session, ToolDef } from 'codenano'

const SSE_DELIMITER = '\n\n'

const sseWrite = (res: any, event: object) => {
  res.write(`data: ${JSON.stringify(event)}${SSE_DELIMITER}`)
}

export async function sessionsRoutes(fastify: FastifyInstance): Promise<void> {
  const registry = getSessionRegistry()

  // Create session with direct library call
  fastify.post('/api/v1/sessions', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as SessionCreateBody
    const { config, hooks = [], toolPermissions = {} } = body

    if (config.toolPreset && !['core', 'extended', 'all'].includes(config.toolPreset)) {
      return reply.status(400).send({ error: 'Invalid tool preset. Must be "core", "extended", or "all".' })
    }

    // Create hook coordinator if hooks are registered
    const hookCoordinator = hooks.length > 0 ? new HookCoordinator() : null
    if (hookCoordinator) {
      hookCoordinator.registerHooks(hooks as HookType[])
    }

    // Set workspace environment variable (if provided in config)
    const workspace = (config as any).workspace
    if (workspace) {
      process.env.CODENANO_WORKSPACE = workspace
    }

    // Build agent config (excluding workspace which is handled separately)
    const { workspace: _ws, ...configWithoutWorkspace } = config as any

    const agentConfig = {
      model: configWithoutWorkspace.model ?? process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
      apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
      baseURL: configWithoutWorkspace.baseURL ?? process.env.ANTHROPIC_BASE_URL,
      maxTurns: configWithoutWorkspace.maxTurns,
      thinkingConfig: configWithoutWorkspace.thinkingConfig,
      maxOutputTokens: configWithoutWorkspace.maxOutputTokens,
      identity: configWithoutWorkspace.identity,
      language: configWithoutWorkspace.language,
      overrideSystemPrompt: configWithoutWorkspace.overrideSystemPrompt,
      appendSystemPrompt: configWithoutWorkspace.appendSystemPrompt,
      provider: configWithoutWorkspace.provider,
      awsRegion: configWithoutWorkspace.awsRegion,
      autoCompact: configWithoutWorkspace.autoCompact,
      fallbackModel: configWithoutWorkspace.fallbackModel,
      maxOutputRecoveryAttempts: configWithoutWorkspace.maxOutputRecoveryAttempts,
      autoLoadInstructions: configWithoutWorkspace.autoLoadInstructions,
      toolResultBudget: configWithoutWorkspace.toolResultBudget,
      maxOutputTokensCap: configWithoutWorkspace.maxOutputTokensCap,
      streamingToolExecution: configWithoutWorkspace.streamingToolExecution,
      mcpServers: configWithoutWorkspace.mcpServers,
      persistence: configWithoutWorkspace.persistence,
      memory: configWithoutWorkspace.memory,
      toolPreset: configWithoutWorkspace.toolPreset,
      tools: configWithoutWorkspace.tools as ToolDef[],
    }

    // Create agent with direct library call
    const agent = createAgentInstance({
      ...agentConfig,
      toolPermissions: toolPermissions as Record<string, ToolPermission>,
      hookCoordinator,
    })

    // Create session
    const sessionId = crypto.randomUUID()
    const session = agent.session(sessionId)

    // Register in registry
    registry.register(sessionId, agent, session, {
      toolPermissions: toolPermissions as Record<string, ToolPermission>,
      hookCoordinator,
    })

    return reply.send({ sessionId })
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
      if (sessionMap.has(entry.sessionId)) {
        const existing = sessionMap.get(entry.sessionId)
        sessionMap.set(entry.sessionId, {
          ...existing,
          lastActivity: entry.lastActivity,
          active: true,
        })
      } else {
        sessionMap.set(entry.sessionId, {
          sessionId: entry.sessionId,
          createdAt: entry.createdAt,
          lastActivity: entry.lastActivity,
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

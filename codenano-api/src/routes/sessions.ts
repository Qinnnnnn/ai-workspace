import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { getSessionRegistry } from '../services/session-registry.js'
import type {
  SessionCreateBody,
  SendMessageBody,
  ServiceAgentConfig,
  HookType,
  ToolPermission,
} from '../types/index.js'

const SSE_DELIMITER = '\n\n'
const sseWrite = (res: any, event: object) => {
  res.write(`data: ${JSON.stringify(event)}${SSE_DELIMITER}`)
}

// Schema for validation
const sessionCreateSchema = {
  type: 'object',
  required: ['config'],
  properties: {
    config: { type: 'object' },
    hooks: { type: 'array', items: { type: 'string' } },
    toolPermissions: { type: 'object', additionalProperties: { type: 'string', enum: ['allow', 'deny', 'ask'] } },
  },
}

const sendMessageSchema = {
  type: 'object',
  required: ['prompt'],
  properties: {
    prompt: { type: 'string' },
    stream: { type: 'boolean', default: true },
  },
}

export async function sessionsRoutes(fastify: FastifyInstance): Promise<void> {
  const registry = getSessionRegistry()

  // Create session
  fastify.post('/api/v1/sessions', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as SessionCreateBody
    const { config, hooks = [], toolPermissions = {} } = body

    // Validate toolPreset if provided
    if (config.toolPreset && !['core', 'extended', 'all'].includes(config.toolPreset)) {
      return reply.status(400).send({ error: 'Invalid tool preset. Must be "core", "extended", or "all".' })
    }

    // Build agent config from .env + body overrides
    const agentConfig = {
      model: config.model ?? process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
      apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
      baseURL: config.baseURL ?? process.env.ANTHROPIC_BASE_URL,
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
      toolPreset: config.toolPreset,
      tools: config.tools,
    }

    const sessionId = await registry.create(
      agentConfig as ServiceAgentConfig,
      toolPermissions,
      hooks as HookType[]
    )

    return reply.send({ sessionId })
  })

  // List all sessions
  fastify.get('/api/v1/sessions', async (_request: FastifyRequest, reply: FastifyReply) => {
    const sessions = registry.list()
    return reply.send({ sessions })
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
      historyLength: entry.session.history.length,
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

  // Get session history
  fastify.get('/api/v1/sessions/:id/history', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const entry = registry.get(id)

    if (!entry) {
      return reply.status(404).send({ error: 'Session not found' })
    }

    registry.touch(id)
    return reply.send({ history: entry.session.history })
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
      // Non-streaming response
      try {
        const result = await entry.session.send(prompt)
        return reply.send({ result })
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        return reply.status(500).send({ error })
      }
    }

    // Streaming SSE
    reply.raw!.setHeader('Content-Type', 'text/event-stream')
    reply.raw!.setHeader('Cache-Control', 'no-cache')
    reply.raw!.setHeader('Connection', 'keep-alive')

    try {
      for await (const event of entry.session.stream(prompt)) {
        // Check tool permission if this is a tool_use event
        if (event.type === 'tool_use') {
          const permission = entry.toolPermissions[event.toolName] ?? 'ask'

          if (permission === 'deny') {
            sseWrite(reply.raw!, {
              type: 'tool_result',
              toolUseId: event.toolUseId,
              output: 'Tool blocked: denied by policy',
              isError: true,
            })
            continue
          }

          if (permission === 'ask' && entry.hookCoordinator) {
            const decision = await entry.hookCoordinator.emitAndWait('onPreToolUse', {
              toolName: event.toolName,
              toolInput: event.input,
            })

            if (decision.behavior === 'deny') {
              sseWrite(reply.raw!, {
                type: 'tool_result',
                toolUseId: event.toolUseId,
                output: decision.message ?? 'Tool blocked by hook',
                isError: true,
              })
              continue
            }
          }
        }

        sseWrite(reply.raw!, event)
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      sseWrite(reply.raw!, { type: 'error', error })
    }

    reply.raw!.end()
  })
}

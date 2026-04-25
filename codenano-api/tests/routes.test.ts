import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'

// Mock docker-service
const dockerMocks = vi.hoisted(() => ({
  checkDockerHealth: vi.fn().mockResolvedValue(true),
  createContainer: vi.fn().mockResolvedValue('mock-container-id'),
  startContainer: vi.fn().mockResolvedValue(undefined),
  stopContainer: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../src/services/docker-service.js', () => dockerMocks)

// Mock codenano
vi.mock('codenano', async () => {
  const actual = await vi.importActual('codenano')
  return {
    ...actual as any,
    coreTools: vi.fn().mockReturnValue([]),
    extendedTools: vi.fn().mockReturnValue([]),
    allTools: vi.fn().mockReturnValue([]),
    createAgent: vi.fn().mockImplementation(() => ({
      session: vi.fn().mockImplementation(() => ({
        id: `session-${Math.random().toString(36).slice(2)}`,
        history: [],
        send: vi.fn().mockResolvedValue({
          text: 'Hello',
          messages: [],
          usage: { inputTokens: 10, outputTokens: 20, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 },
          stopReason: 'end_turn',
          numTurns: 1,
          durationMs: 100,
          costUSD: 0.001,
          queryTracking: { chainId: 'test', depth: 0 },
        }),
        stream: vi.fn().mockReturnValue({
          [Symbol.asyncIterator]: vi.fn().mockReturnValue({
            next: vi.fn().mockResolvedValue({
              value: { type: 'text', text: 'Hello' },
              done: false,
            }),
          }),
        }),
        abort: vi.fn(),
      })),
      abort: vi.fn(),
    })),
    listSessions: vi.fn().mockReturnValue([]),
    loadSession: vi.fn().mockReturnValue(null),
    getSessionStorageDir: vi.fn().mockReturnValue('/tmp/test-storage'),
    getMemoryDir: vi.fn().mockReturnValue('/tmp/test-memory'),
    saveMemory: vi.fn().mockReturnValue('/tmp/test-memory/test.md'),
    loadMemory: vi.fn().mockReturnValue(null),
    scanMemories: vi.fn().mockReturnValue([]),
    connectMCPServer: vi.fn().mockResolvedValue({
      close: vi.fn(),
    }),
    listMCPTools: vi.fn().mockResolvedValue([]),
    callMCPTool: vi.fn().mockResolvedValue({ result: 'ok' }),
    calculateCostUSD: vi.fn().mockReturnValue(0.01),
    getModelPricing: vi.fn().mockReturnValue({ input: 0.003, output: 0.015 }),
    getGitState: vi.fn().mockResolvedValue({ branch: 'main', clean: true }),
    findGitRoot: vi.fn().mockResolvedValue('/test/repo'),
    loadSkills: vi.fn().mockReturnValue([]),
    discoverSkillFiles: vi.fn().mockReturnValue([]),
    expandSkillContent: vi.fn().mockImplementation((skill, args) => skill.content),
    parseSkillFile: vi.fn().mockReturnValue(null),
  }
})

// Import routes after mock setup
import { sessionsRoutes } from '../src/routes/sessions.js'
import { memoryRoutes } from '../src/routes/memory.js'
import { costRoutes } from '../src/routes/cost.js'
import { gitRoutes } from '../src/routes/git.js'
import { skillsRoutes } from '../src/routes/skills.js'
import { getSessionRegistry } from '../src/services/session-registry.js'

describe('API Routes', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = Fastify()
    await app.register(cors)

    await app.register(sessionsRoutes)
    await app.register(memoryRoutes)
    await app.register(costRoutes)
    await app.register(gitRoutes)
    await app.register(skillsRoutes)

    await app.ready()
  })

  afterEach(async () => {
    const registry = getSessionRegistry()
    await registry.destroyAll()
    await app.close()
  })

  describe('Sessions Routes', () => {
    it('POST /api/v1/sessions - creates session', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/sessions',
        payload: {
          config: { model: 'claude-sonnet-4-6' },
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.sessionId).toBeDefined()
      expect(body.cwd).toBeDefined()
    })

    it('GET /api/v1/sessions - lists sessions', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/sessions',
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.sessions).toBeDefined()
    })

    it('POST /api/v1/sessions - validates tool preset', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/sessions',
        payload: {
          config: { model: 'claude-sonnet-4-6', toolPreset: 'invalid' },
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('GET /api/v1/sessions/:id - returns 404 for unknown session', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/sessions/unknown-id',
      })

      expect(response.statusCode).toBe(404)
    })

    it('DELETE /api/v1/sessions/:id - returns 404 for unknown session', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/sessions/unknown-id',
      })

      expect(response.statusCode).toBe(404)
    })

    it('POST /api/v1/sessions - sandbox:false skips Docker and returns sandboxEnabled:false', async () => {
      // Reset mocks
      dockerMocks.createContainer.mockClear()
      dockerMocks.startContainer.mockClear()

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/sessions',
        payload: {
          config: { sandbox: false },
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.sandboxEnabled).toBe(false)
      expect(body.containerId).toBeUndefined()
      expect(body.cwd).toContain('.agent-core/workspaces/')
      // Docker should not be called
      expect(dockerMocks.createContainer).not.toHaveBeenCalled()
      expect(dockerMocks.startContainer).not.toHaveBeenCalled()
    })

    it('POST /api/v1/sessions - sandbox:true (default) calls Docker', async () => {
      // Reset mocks
      dockerMocks.createContainer.mockClear()
      dockerMocks.startContainer.mockClear()

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/sessions',
        payload: {
          config: { sandbox: true },
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.sandboxEnabled).toBe(true)
      expect(body.containerId).toBe('mock-container-id')
      expect(body.cwd).toBe('/workspace')
      // Docker should be called
      expect(dockerMocks.createContainer).toHaveBeenCalled()
      expect(dockerMocks.startContainer).toHaveBeenCalled()
    })

    it('POST /api/v1/sessions - default (no sandbox field) calls Docker for backward compat', async () => {
      // Reset mocks
      dockerMocks.createContainer.mockClear()
      dockerMocks.startContainer.mockClear()

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/sessions',
        payload: {
          config: {},
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.sandboxEnabled).toBe(true)
      // Docker should be called (backward compatible)
      expect(dockerMocks.createContainer).toHaveBeenCalled()
      expect(dockerMocks.startContainer).toHaveBeenCalled()
    })
  })

  describe('Cost Routes', () => {
    it('GET /api/v1/cost/pricing - returns pricing for all models', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/cost/pricing',
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.models).toBeDefined()
    })

    it('GET /api/v1/cost/pricing - returns pricing for specific model', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/cost/pricing?model=claude-sonnet-4-6',
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.pricing).toBeDefined()
    })

    it('POST /api/v1/cost/calculate - calculates cost', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/cost/calculate',
        payload: {
          model: 'claude-sonnet-4-6',
          usage: { inputTokens: 100, outputTokens: 50 },
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.costUSD).toBeDefined()
    })

    it('POST /api/v1/cost/calculate - validates required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/cost/calculate',
        payload: {},
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe('Git Routes', () => {
    it('GET /api/v1/git/state - returns git state', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/git/state',
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.branch).toBeDefined()
    })

    it('GET /api/v1/git/state - handles path query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/git/state?path=/test/path',
      })

      expect(response.statusCode).toBe(200)
    })
  })

  describe('Skills Routes', () => {
    it('GET /api/v1/skills - lists skills', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/skills',
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.skills).toBeDefined()
    })

    it('GET /api/v1/skills/:name - returns 404 for unknown skill', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/skills/unknown-skill',
      })

      expect(response.statusCode).toBe(404)
    })

    it('POST /api/v1/skills/expand - expands skill content', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/skills/expand',
        payload: {
          content: 'Hello {{name}}',
          args: 'name=World',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.expanded).toBeDefined()
    })

    it('POST /api/v1/skills/expand - validates content required', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/skills/expand',
        payload: {},
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe('Memory Routes', () => {
    it('POST /api/v1/memory - saves memory', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/memory',
        payload: {
          key: 'test-memory',
          content: 'Test content',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.ok).toBe(true)
    })

    it('POST /api/v1/memory - validates required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/memory',
        payload: {},
      })

      expect(response.statusCode).toBe(400)
    })

    it('GET /api/v1/memory - lists memories', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/memory',
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.memories).toBeDefined()
    })

    it('GET /api/v1/memory/:key - returns 404 for unknown memory', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/memory/unknown-key',
      })

      expect(response.statusCode).toBe(404)
    })

    it('DELETE /api/v1/memory/:key - returns 404 for unknown memory', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/memory/unknown-key',
      })

      expect(response.statusCode).toBe(404)
    })
  })
})

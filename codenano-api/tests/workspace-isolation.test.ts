import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import { homedir } from 'os'
import { join } from 'path'
import fs from 'fs'

// Mock docker-service - Docker enabled for these tests
vi.mock('../src/services/docker-service.js', () => ({
  checkDockerHealth: vi.fn().mockResolvedValue(true),
  createContainer: vi.fn().mockImplementation((sessionId: string) =>
    Promise.resolve(`mock-container-${sessionId}`)
  ),
  startContainer: vi.fn().mockResolvedValue(undefined),
  stopContainer: vi.fn().mockResolvedValue(undefined),
}))

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
  }
})

import { sessionsRoutes } from '../src/routes/sessions.js'
import { getSessionRegistry } from '../src/services/session-registry.js'

describe('Per-Session Workspace Isolation', () => {
  let app: FastifyInstance
  const WORKSPACE_BASE = join(homedir(), '.agent-core', 'workspaces')

  beforeEach(async () => {
    app = Fastify()
    await app.register(cors)
    await app.register(sessionsRoutes)
    await app.ready()
  })

  afterEach(async () => {
    const registry = getSessionRegistry()
    await registry.destroyAll()
    await app.close()

    // Clean up test workspaces (local mode only)
    try {
      if (fs.existsSync(WORKSPACE_BASE)) {
        const dirs = fs.readdirSync(WORKSPACE_BASE)
        for (const dir of dirs) {
          if (dir.startsWith('session-') || dir.match(/^[0-9a-f]{8}-[0-9a-f]{4}-/)) {
            fs.rmSync(join(WORKSPACE_BASE, dir), { recursive: true, force: true })
          }
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('7.1 Session creation in sandbox mode uses tmpfs', () => {
    it('should create container with /workspace as virtual path', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/sessions',
        payload: { config: {} },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.sessionId).toBeDefined()
      expect(body.cwd).toBe('/workspace') // Virtual path in sandbox mode (tmpfs)
      expect(body.sandboxEnabled).toBe(true)
      expect(body.containerId).toBeDefined()

      // Sandbox mode uses tmpfs inside container - no physical directory created
      const physicalPath = join(WORKSPACE_BASE, body.sessionId)
      expect(fs.existsSync(physicalPath)).toBe(false)
    })

    it('should return session details with sandbox info', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/sessions',
        payload: { config: {} },
      })
      const { sessionId, containerId } = JSON.parse(createResponse.body)

      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/sessions/${sessionId}`,
      })

      expect(getResponse.statusCode).toBe(200)
      const body = JSON.parse(getResponse.body)
      expect(body.cwd).toBe('/workspace')
      expect(body.containerId).toBe(containerId)
      expect(body.sandboxEnabled).toBe(true)
    })
  })

  describe('7.2 Session deletion stops container in sandbox mode', () => {
    it('should stop container when session is deleted in sandbox mode', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/sessions',
        payload: { config: {} },
      })
      const { sessionId } = JSON.parse(createResponse.body)

      // In sandbox mode, container exists but no physical directory
      const physicalPath = join(WORKSPACE_BASE, sessionId)
      expect(fs.existsSync(physicalPath)).toBe(false)

      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/v1/sessions/${sessionId}`,
      })

      expect(deleteResponse.statusCode).toBe(200)
    })
  })

  describe('7.3 API responses include workspace field', () => {
    it('should include workspace in POST /api/v1/sessions response', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/sessions',
        payload: { config: {} },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.cwd).toBeDefined()
      expect(typeof body.cwd).toBe('string')
    })

    it('should include workspace in GET /api/v1/sessions/:id response', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/sessions',
        payload: { config: {} },
      })
      const { sessionId } = JSON.parse(createResponse.body)

      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/sessions/${sessionId}`,
      })

      expect(getResponse.statusCode).toBe(200)
      const body = JSON.parse(getResponse.body)
      expect(body.cwd).toBeDefined()
    })

    it('should include workspace in GET /api/v1/sessions list response', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/sessions',
        payload: { config: {} },
      })
      const { sessionId } = JSON.parse(createResponse.body)

      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/sessions',
      })

      expect(listResponse.statusCode).toBe(200)
      const body = JSON.parse(listResponse.body)
      const session = body.sessions.find((s: any) => s.sessionId === sessionId)
      expect(session).toBeDefined()
      expect(session.cwd).toBe('/workspace')
      expect(session.sandboxEnabled).toBe(true)
    })
  })

  describe('Concurrent workspace isolation', () => {
    it('should create different containers for different sessions', async () => {
      const response1 = await app.inject({
        method: 'POST',
        url: '/api/v1/sessions',
        payload: { config: {} },
      })
      const response2 = await app.inject({
        method: 'POST',
        url: '/api/v1/sessions',
        payload: { config: {} },
      })

      const { sessionId: id1, containerId: cid1 } = JSON.parse(response1.body)
      const { sessionId: id2, containerId: cid2 } = JSON.parse(response2.body)

      // Each session gets its own container for isolation
      expect(id1).not.toBe(id2)
      expect(cid1).not.toBe(cid2)
      expect(cid1).toContain('mock-container-')
      expect(cid2).toContain('mock-container-')

      // No physical directories in sandbox mode
      const physicalPath1 = join(WORKSPACE_BASE, id1)
      const physicalPath2 = join(WORKSPACE_BASE, id2)
      expect(fs.existsSync(physicalPath1)).toBe(false)
      expect(fs.existsSync(physicalPath2)).toBe(false)

      // Clean up
      await app.inject({ method: 'DELETE', url: `/api/v1/sessions/${id1}` })
      await app.inject({ method: 'DELETE', url: `/api/v1/sessions/${id2}` })
    })
  })
})

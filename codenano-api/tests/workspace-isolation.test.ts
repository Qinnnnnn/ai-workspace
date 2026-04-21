import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import { homedir } from 'os'
import { join } from 'path'
import fs from 'fs'

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

    // Clean up test workspaces
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

  describe('7.1 Session creation creates workspace directory', () => {
    it('should create workspace directory on session creation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/sessions',
        payload: { config: {} },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.sessionId).toBeDefined()
      expect(body.workspace).toBeDefined()
      expect(body.workspace).toContain('.agent-core/workspaces/')

      // Verify workspace directory exists
      expect(fs.existsSync(body.workspace)).toBe(true)
    })

    it('should return workspace path in session details', async () => {
      // Create session first
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/sessions',
        payload: { config: {} },
      })
      const { sessionId, workspace: createdWorkspace } = JSON.parse(createResponse.body)

      // Get session details
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/sessions/${sessionId}`,
      })

      expect(getResponse.statusCode).toBe(200)
      const body = JSON.parse(getResponse.body)
      expect(body.workspace).toBe(createdWorkspace)
    })
  })

  describe('7.2 Session deletion cleans up workspace directory', () => {
    it('should delete workspace directory when session is deleted', async () => {
      // Create session
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/sessions',
        payload: { config: {} },
      })
      const { sessionId, workspace } = JSON.parse(createResponse.body)

      // Verify workspace exists
      expect(fs.existsSync(workspace)).toBe(true)

      // Delete session
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/v1/sessions/${sessionId}`,
      })

      expect(deleteResponse.statusCode).toBe(200)

      // Verify workspace is deleted
      expect(fs.existsSync(workspace)).toBe(false)
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
      expect(body.workspace).toBeDefined()
      expect(typeof body.workspace).toBe('string')
    })

    it('should include workspace in GET /api/v1/sessions/:id response', async () => {
      // Create session
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/sessions',
        payload: { config: {} },
      })
      const { sessionId } = JSON.parse(createResponse.body)

      // Get session
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/sessions/${sessionId}`,
      })

      expect(getResponse.statusCode).toBe(200)
      const body = JSON.parse(getResponse.body)
      expect(body.workspace).toBeDefined()
    })

    it('should include workspace in GET /api/v1/sessions list response', async () => {
      // Create session
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/sessions',
        payload: { config: {} },
      })
      const { sessionId, workspace: createdWorkspace } = JSON.parse(createResponse.body)

      // List sessions
      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/sessions',
      })

      expect(listResponse.statusCode).toBe(200)
      const body = JSON.parse(listResponse.body)
      const session = body.sessions.find((s: any) => s.sessionId === sessionId)
      expect(session).toBeDefined()
      expect(session.workspace).toBe(createdWorkspace)
    })
  })

  describe('Concurrent workspace isolation', () => {
    it('should create different workspaces for different sessions', async () => {
      // Create two sessions
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

      const { sessionId: id1, workspace: ws1 } = JSON.parse(response1.body)
      const { sessionId: id2, workspace: ws2 } = JSON.parse(response2.body)

      expect(id1).not.toBe(id2)
      expect(ws1).not.toBe(ws2)
      expect(fs.existsSync(ws1)).toBe(true)
      expect(fs.existsSync(ws2)).toBe(true)

      // Clean up
      await app.inject({ method: 'DELETE', url: `/api/v1/sessions/${id1}` })
      await app.inject({ method: 'DELETE', url: `/api/v1/sessions/${id2}` })

      expect(fs.existsSync(ws1)).toBe(false)
      expect(fs.existsSync(ws2)).toBe(false)
    })
  })
})

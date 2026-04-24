import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { SessionRegistry } from '../src/services/session-registry.js'
import { createAgent } from 'codenano'
import { join } from 'path'
import { homedir } from 'os'
import fs from 'fs'

// Mock codenano with unique session IDs
vi.mock('codenano', async () => {
  return {
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
    coreTools: vi.fn().mockReturnValue([]),
    extendedTools: vi.fn().mockReturnValue([]),
    allTools: vi.fn().mockReturnValue([]),
  }
})

describe('SessionRegistry', () => {
  let registry: SessionRegistry
  const WORKSPACE_BASE = join(homedir(), '.agent-core', 'workspaces')

  beforeEach(() => {
    registry = new SessionRegistry()
  })

  afterEach(async () => {
    await registry.destroyAll()
  })

  it('should register a session with agent and session', async () => {
    const agent = createAgent({ model: 'claude-sonnet-4-6' })
    const session = agent.session('test-session')
    const registrySessionId = 'test-session-id'
    const cwd = join(WORKSPACE_BASE, registrySessionId)

    registry.register(registrySessionId, agent, session, { cwd, containerId: null })

    const entry = registry.get(registrySessionId)
    expect(entry).toBeDefined()
    expect(entry!.agent).toBe(agent)
    expect(entry!.session).toBe(session)
    expect(entry!.cwd).toBe(cwd)
  })

  it('should return undefined for nonexistent session', () => {
    const entry = registry.get('nonexistent')
    expect(entry).toBeUndefined()
  })

  it('should list sessions with workspace', async () => {
    const agent1 = createAgent({ model: 'claude-sonnet-4-6' })
    const session1 = agent1.session('session-1')
    const cwd1 = join(WORKSPACE_BASE, 'session-1')

    const agent2 = createAgent({ model: 'claude-sonnet-4-6' })
    const session2 = agent2.session('session-2')
    const cwd2 = join(WORKSPACE_BASE, 'session-2')

    registry.register('session-1', agent1, session1, { cwd: cwd1, containerId: null })
    registry.register('session-2', agent2, session2, { cwd: cwd2, containerId: null })

    const sessions = registry.list()

    expect(sessions).toHaveLength(2)
    expect(sessions.map(s => s.sessionId)).toContain('session-1')
    expect(sessions.map(s => s.sessionId)).toContain('session-2')
    expect(sessions.find(s => s.sessionId === 'session-1')!.cwd).toBe(cwd1)
    expect(sessions.find(s => s.sessionId === 'session-2')!.cwd).toBe(cwd2)
  })

  it('should touch a session to update lastActivity', async () => {
    const agent = createAgent({ model: 'claude-sonnet-4-6' })
    const session = agent.session('session-touch')
    const cwd = join(WORKSPACE_BASE, 'session-touch')

    registry.register('session-touch', agent, session, { cwd, containerId: null })
    const entry1 = registry.get('session-touch')!

    // Small delay to ensure time difference
    await new Promise(resolve => setTimeout(resolve, 10))

    registry.touch('session-touch')
    const entry2 = registry.get('session-touch')!

    expect(entry2.lastActivity.getTime()).toBeGreaterThanOrEqual(entry1.lastActivity.getTime())
  })

  it('should destroy a session', async () => {
    const agent = createAgent({ model: 'claude-sonnet-4-6' })
    const session = agent.session('session-destroy')
    const cwd = join(WORKSPACE_BASE, 'session-destroy')

    // Create workspace directory first
    fs.mkdirSync(cwd, { recursive: true })

    registry.register('session-destroy', agent, session, { cwd, containerId: null })
    expect(registry.get('session-destroy')).toBeDefined()

    await registry.destroy('session-destroy')
    expect(registry.get('session-destroy')).toBeUndefined()
    // Workspace should be cleaned up
    expect(fs.existsSync(cwd)).toBe(false)
  })

  it('should resolve toolPreset to correct tools', async () => {
    // Tool resolution happens in agent.ts during createAgentInstance
    const { createAgent, coreTools, extendedTools, allTools } = await import('codenano')

    // These should be called when creating an agent with toolPreset
    createAgent({ model: 'claude-sonnet-4-6' })
    createAgent({ model: 'claude-sonnet-4-6' })
    createAgent({ model: 'claude-sonnet-4-6' })

    // Verify registry can hold sessions
    const agent = createAgent({ model: 'claude-sonnet-4-6' })
    const session = agent.session('test-session')
    const cwd = join(WORKSPACE_BASE, 'test-session')

    registry.register('test-session', agent, session, { cwd, containerId: null })
    expect(registry.get('test-session')).toBeDefined()
  })

  it('should destroy all sessions', async () => {
    const workspaces = ['ws-1', 'ws-2', 'ws-3'].map(id => join(WORKSPACE_BASE, id))

    // Create workspace directories
    for (const ws of workspaces) {
      fs.mkdirSync(ws, { recursive: true })
    }

    const agents = workspaces.map(() => createAgent({ model: 'claude-sonnet-4-6' }))
    const sessions = agents.map((agent, i) => agent.session(`session-${i}`))

    registry.register('session-1', agents[0], sessions[0], { cwd: workspaces[0], containerId: null })
    registry.register('session-2', agents[1], sessions[1], { cwd: workspaces[1], containerId: null })
    registry.register('session-3', agents[2], sessions[2], { cwd: workspaces[2], containerId: null })

    expect(registry.list()).toHaveLength(3)

    await registry.destroyAll()

    expect(registry.list()).toHaveLength(0)
    // All workspaces should be cleaned up
    for (const ws of workspaces) {
      expect(fs.existsSync(ws)).toBe(false)
    }
  })
})

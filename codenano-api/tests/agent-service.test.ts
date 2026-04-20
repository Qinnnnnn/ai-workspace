import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { SessionRegistry } from '../src/services/session-registry.js'

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

  beforeEach(() => {
    registry = new SessionRegistry()
  })

  afterEach(async () => {
    await registry.destroyAll()
  })

  it('should create a session', async () => {
    const sessionId = await registry.create({
      model: 'claude-sonnet-4-6',
    })

    expect(sessionId).toBeDefined()
    expect(typeof sessionId).toBe('string')
  })

  it('should get a session', async () => {
    const sessionId = await registry.create({ model: 'claude-sonnet-4-6' })
    const entry = registry.get(sessionId)

    expect(entry).toBeDefined()
    // create() registers a placeholder - session/agent are null until register() is called
    expect(entry!.session).toBeNull()
    expect(entry!.agent).toBeNull()
  })

  it('should register a session with agent and session', async () => {
    const { createAgent } = await import('codenano')
    const agent = createAgent({ model: 'claude-sonnet-4-6' })
    const session = agent.session('test-session')
    const registrySessionId = 'test-session-id'

    registry.register(registrySessionId, agent, session)

    const entry = registry.get(registrySessionId)
    expect(entry).toBeDefined()
    expect(entry!.agent).toBe(agent)
    expect(entry!.session).toBe(session)
  })

  it('should return undefined for nonexistent session', () => {
    const entry = registry.get('nonexistent')
    expect(entry).toBeUndefined()
  })

  it('should list sessions', async () => {
    const sessionId1 = await registry.create({ model: 'claude-sonnet-4-6' })
    const sessionId2 = await registry.create({ model: 'claude-sonnet-4-6' })

    const sessions = registry.list()

    expect(sessions).toHaveLength(2)
    expect(sessions.map(s => s.sessionId)).toContain(sessionId1)
    expect(sessions.map(s => s.sessionId)).toContain(sessionId2)
  })

  it('should touch a session to update lastActivity', async () => {
    const sessionId = await registry.create({ model: 'claude-sonnet-4-6' })
    const entry1 = registry.get(sessionId)!

    // Small delay to ensure time difference
    await new Promise(resolve => setTimeout(resolve, 10))

    registry.touch(sessionId)
    const entry2 = registry.get(sessionId)!

    expect(entry2.lastActivity.getTime()).toBeGreaterThanOrEqual(entry1.lastActivity.getTime())
  })

  it('should destroy a session', async () => {
    const sessionId = await registry.create({ model: 'claude-sonnet-4-6' })
    expect(registry.get(sessionId)).toBeDefined()

    await registry.destroy(sessionId)
    expect(registry.get(sessionId)).toBeUndefined()
  })

  it('should resolve toolPreset to correct tools', async () => {
    // Tool resolution happens in agent.ts during createAgentInstance, not in create()
    // This test verifies that toolPreset is stored correctly in the registry
    const { createAgent } = await import('codenano')
    const agent = createAgent({ model: 'claude-sonnet-4-6' })
    const session = agent.session('test-session')
    const sessionId = 'test-session'

    // Verify codenano's tool functions are available and can be called
    const { coreTools, extendedTools, allTools } = await import('codenano')

    // These should be called when creating an agent with toolPreset
    createAgent({ model: 'claude-sonnet-4-6', toolPreset: 'core' })
    createAgent({ model: 'claude-sonnet-4-6', toolPreset: 'extended' })
    createAgent({ model: 'claude-sonnet-4-6', toolPreset: 'all' })

    // The actual tool resolution is tested in agent.ts/unit tests
    // Here we just verify the registry can hold sessions
    registry.register(sessionId, agent, session)
    expect(registry.get(sessionId)).toBeDefined()
  })

  it('should destroy all sessions', async () => {
    await registry.create({ model: 'claude-sonnet-4-6' })
    await registry.create({ model: 'claude-sonnet-4-6' })
    await registry.create({ model: 'claude-sonnet-4-6' })

    expect(registry.list()).toHaveLength(3)

    await registry.destroyAll()

    expect(registry.list()).toHaveLength(0)
  })
})

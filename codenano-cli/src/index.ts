#!/usr/bin/env node

import { createAgent, type Agent, type Session, type StreamEvent, listSessions } from 'codenano'
import { RpcServer } from './rpc-server.js'
import type { InitParams, SendParams, CloseParams, HistoryParams, SessionInfo } from './rpc-types.js'

const server = new RpcServer()

let agent: Agent | null = null
const sessions = new Map<string, Session>()
const sessionMeta = new Map<string, { createdAt: string; lastActivity: string }>()

server.register('init', async (params) => {
  const { config } = (params ?? {}) as unknown as InitParams
  agent = createAgent({
    ...config,
    persistence: { enabled: false },
  })
  return { ok: true }
})

server.register('send', async (params) => {
  if (!agent) throw new Error('Agent not initialized. Call init first.')
  const { sessionId, prompt } = (params ?? {}) as unknown as SendParams

  let session = sessions.get(sessionId)
  if (!session) {
    session = agent.session(sessionId)
    sessions.set(sessionId, session)
    const now = new Date().toISOString()
    sessionMeta.set(sessionId, { createdAt: now, lastActivity: now })
  }
  sessionMeta.get(sessionId)!.lastActivity = new Date().toISOString()

  try {
    for await (const event of session.stream(prompt)) {
      server.sendNotification(event.type, event)
    }
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    server.sendNotification('error', { error: message })
    throw err
  }
})

server.register('close', async (params) => {
  const { sessionId } = (params ?? {}) as unknown as CloseParams
  const session = sessions.get(sessionId)
  if (session) {
    sessions.delete(sessionId)
    sessionMeta.delete(sessionId)
  }
  return { ok: true }
})

server.register('history', async (params) => {
  const { sessionId } = (params ?? {}) as unknown as HistoryParams
  const session = sessions.get(sessionId)
  if (!session) throw new Error(`Session not found: ${sessionId}`)
  return { history: session.history }
})

server.register('list_sessions', async () => {
  const result: SessionInfo[] = []
  for (const [sessionId, meta] of sessionMeta) {
    result.push({
      sessionId,
      createdAt: meta.createdAt,
      lastActivity: meta.lastActivity,
    })
  }
  return { sessions: result }
})

async function main(): Promise<void> {
  const decoder = new TextDecoder()

  const handleStdout = () => {
    // stdout is used for JSON-RPC responses/notifications - don't process here
  }

  process.stdin.setEncoding('utf-8')

  let buffer = ''

  for await (const chunk of process.stdin) {
    buffer += chunk
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (line.trim()) {
        await server.handleLine(line)
      }
    }
  }

  // Handle remaining buffer after stdin closes
  if (buffer.trim()) {
    await server.handleLine(buffer.trim())
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32603, message: err.message } }))
  process.exit(1)
})

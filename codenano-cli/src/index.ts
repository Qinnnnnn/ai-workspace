#!/usr/bin/env node

import { createAgent, coreTools, extendedTools, allTools, type Agent, type Session, type StreamEvent, listSessions } from 'codenano'
import { RpcServer } from './rpc/server.js'
import type { InitParams, SendParams, CloseParams, HistoryParams, SessionInfo, ReadFileParams, ListFilesParams, FileInfo } from './types/rpc.js'
import fs from 'fs/promises'
import path from 'path'

const server = new RpcServer()

let agent: Agent | null = null
const sessions = new Map<string, Session>()
const sessionMeta = new Map<string, { createdAt: string; lastActivity: string }>()

server.register('init', async (params) => {
  const { config } = (params ?? {}) as unknown as InitParams
  if (!config) throw new Error('config is required')

  const toolPreset = config.toolPreset ?? 'core'
  let tools
  switch (toolPreset) {
    case 'core':
      tools = coreTools()
      break
    case 'extended':
      tools = extendedTools()
      break
    case 'all':
      tools = allTools()
      break
    default:
      throw new Error(`Invalid tool preset: "${toolPreset}". Must be "core", "extended", or "all".`)
  }

  const { toolPreset: _, ...agentConfig } = config
  agent = createAgent({
    ...agentConfig,
    tools,
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

server.register('read_file', async (params) => {
  const { sessionId, path: filePath } = (params ?? {}) as unknown as ReadFileParams
  if (!sessionId) throw new Error('sessionId is required')
  if (!filePath) throw new Error('path is required')

  const resolvedPath = path.resolve('/workspace', filePath)
  if (!resolvedPath.startsWith('/workspace')) {
    throw new Error('Path traversal detected')
  }

  const content = await fs.readFile(resolvedPath, 'utf-8')
  return { content, path: filePath }
})

server.register('list_files', async (params) => {
  const { sessionId, path: dirPath } = (params ?? {}) as unknown as ListFilesParams
  if (!sessionId) throw new Error('sessionId is required')

  const targetPath = dirPath ? path.resolve('/workspace', dirPath) : '/workspace'
  if (!targetPath.startsWith('/workspace')) {
    throw new Error('Path traversal detected')
  }

  const entries = await fs.readdir(targetPath, { withFileTypes: true })
  const files: FileInfo[] = []

  for (const entry of entries) {
    const fullPath = path.join(targetPath, entry.name)
    try {
      const stat = await fs.stat(fullPath)
      files.push({
        name: entry.name,
        path: path.relative('/workspace', fullPath),
        isDirectory: entry.isDirectory(),
        size: stat.size,
        modified: stat.mtime.toISOString(),
      })
    } catch {
      files.push({
        name: entry.name,
        path: path.relative('/workspace', fullPath),
        isDirectory: entry.isDirectory(),
        size: 0,
        modified: new Date().toISOString(),
      })
    }
  }

  return { files, path: dirPath ?? '' }
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

import { spawn, ChildProcess, execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import os from 'os'
import fs from 'fs'
import type { ToolPermission, HookType, ServiceAgentConfig, MCPServerConfig, StreamEvent } from '../types/index.js'
import { HookCoordinator } from './hook-coordinator.js'
import type { MCPConnection } from 'codenano'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SB_TTL_MINUTES = parseInt(process.env.SB_TTL_MINUTES ?? '30', 10)
const CLEANUP_INTERVAL_MS = 60000
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? path.join(os.homedir(), '.codenano', 'workspaces')

interface SubprocessMessage {
  type: string
  sessionId?: string
  event?: StreamEvent
  error?: string
  toolUseId?: string
  output?: string
  isError?: boolean
  decision?: { behavior: 'allow' | 'deny'; message?: string }
}

interface SessionEntry {
  sessionId: string
  workspace: string
  process: ChildProcess
  createdAt: Date
  lastActivity: Date
  toolPermissions: Record<string, ToolPermission>
  hookCoordinator: HookCoordinator | null
  eventQueue: StreamEvent[]
  currentResolve: ((event: StreamEvent) => void) | null
  pendingToolUseId: string | null
  readyResolve?: () => void
  readyReject?: (err: Error) => void
  readySettled?: boolean
}

export class SessionRegistry {
  private sessions = new Map<string, SessionEntry>()
  private cleanupTask: NodeJS.Timeout | null = null
  private mcpConnections = new Map<string, MCPConnection>()

  constructor() {
    this.checkBwrapAvailability()
    this.startCleanupLoop()
    this.ensureWorkspaceRoot()
  }

  private checkBwrapAvailability(): void {
    try {
      execSync('bwrap --version', { stdio: 'pipe' })
    } catch {
      throw new Error('bwrap is not available. Please install bwrap (bubblewrap) to use workspace isolation.')
    }
  }

  private ensureWorkspaceRoot(): void {
    if (!fs.existsSync(WORKSPACE_ROOT)) {
      fs.mkdirSync(WORKSPACE_ROOT, { recursive: true })
    }
  }

  private startCleanupLoop(): void {
    this.cleanupTask = setInterval(() => {
      this.cleanup()
    }, CLEANUP_INTERVAL_MS)
  }

  private cleanup(): void {
    const ttl = SB_TTL_MINUTES * 60 * 1000
    const now = Date.now()

    for (const [sessionId, entry] of this.sessions) {
      if (now - entry.lastActivity.getTime() > ttl) {
        this.destroy(sessionId)
      }
    }
  }

  async create(
    config: ServiceAgentConfig,
    toolPermissions: Record<string, ToolPermission> = {},
    hooks: HookType[] = []
  ): Promise<string> {
    const sessionId = crypto.randomUUID()
    const workspace = path.join(WORKSPACE_ROOT, sessionId)
    fs.mkdirSync(workspace, { recursive: true })

    const subprocessConfig = {
      model: config.model,
      apiKey: config.apiKey ?? process.env.ANTHROPIC_AUTH_TOKEN,
      baseURL: config.baseURL,
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
      workspace: '/workspace',
    }

    const hookCoordinator = hooks.length > 0 ? new HookCoordinator() : null
    if (hookCoordinator) {
      hookCoordinator.registerHooks(hooks)
    }

    const entry: SessionEntry = {
      sessionId,
      workspace,
      process: null as unknown as ChildProcess,
      createdAt: new Date(),
      lastActivity: new Date(),
      toolPermissions,
      hookCoordinator,
      eventQueue: [],
      currentResolve: null,
      pendingToolUseId: null,
    }

    this.sessions.set(sessionId, entry)

    const agentWrapperPath = path.join(__dirname, '..', 'agent-wrapper.js')
    const nodePath = process.execPath
    const nodeDir = path.dirname(nodePath)
    const codenanoPath = path.resolve(__dirname, '..', '..', 'codenano')
    const codenanoDir = path.dirname(codenanoPath)

    const bwrapArgs = [
      '--bind', workspace, '/workspace',
      '--ro-bind', nodeDir, nodeDir,
      '--ro-bind', codenanoDir, codenanoDir,
      '--ro-bind', '/lib64', '/lib64',
      '--ro-bind', '/usr/lib64', '/usr/lib64',
      '--ro-bind', '/etc/resolv.conf', '/etc/resolv.conf',
      '--tmpfs', '/tmp',
      '--',
      nodePath, agentWrapperPath,
    ]

    let childProcess = spawn('bwrap', bwrapArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let usingSandbox = true

    entry.process = childProcess

    // Handle errors from bwrap process (e.g., execvp failed)
    childProcess.on('error', (err) => {
      console.error(`[agent-subprocess ${sessionId}] bwrap error:`, err.message)
      // If bwrap fails before ready, trigger fallback
      if (entry.readyResolve && !entry.readySettled) {
        triggerFallback()
      }
    })

    const triggerFallback = () => {
      console.log(`[agent-subprocess ${sessionId}] bwrap failed, retrying without sandbox`)
      usingSandbox = false

      // Copy codenano-api into workspace
      const apiSrc = path.resolve(__dirname, '..', '..')
      const apiDest = path.join(workspace, 'codenano-api')
      fs.cpSync(apiSrc, apiDest, { recursive: true })

      // Copy codenano into workspace (agent-wrapper imports ../../codenano/...)
      const codenanoSrc = path.resolve(__dirname, '..', '..', '..', 'codenano')
      const codenanoDest = path.join(workspace, 'codenano')
      fs.cpSync(codenanoSrc, codenanoDest, { recursive: true })

      // Use agent-wrapper from the project copy inside workspace
      const workspaceAgentWrapper = path.join(apiDest, 'dist', 'agent-wrapper.js')

      childProcess = spawn(nodePath, [workspaceAgentWrapper], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, CODENANO_WORKSPACE: workspace },
      })
      entry.process = childProcess

      // Re-setup handlers for new process
      childProcess.stdout?.setEncoding('utf8')
      let buffer = ''
      childProcess.stdout?.on('data', (data: string) => {
        buffer += data
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (line.trim()) {
            this.handleSubprocessMessage(sessionId, line)
          }
        }
      })

      childProcess.stderr?.on('data', (data: string) => {
        console.error(`[agent-subprocess ${sessionId}] stderr:`, data.toString())
      })

      childProcess.on('exit', (code, signal) => {
        console.log(`[agent-subprocess ${sessionId}] exited with code ${code}, signal ${signal}`)
        if (entry.readyReject) {
          entry.readyReject(new Error(`Subprocess exited prematurely with code ${code}`))
        }
        this.sessions.delete(sessionId)
      })

      childProcess.on('error', (err) => {
        console.error(`[agent-subprocess ${sessionId}] error:`, err)
        if (entry.readyReject) {
          entry.readyReject(err)
        }
      })

      this.sendToSubprocess(sessionId, {
        type: 'init',
        config: subprocessConfig,
        sessionId,
      })
    }

    // Wait for subprocess to be ready before returning
    const readyPromise = new Promise<void>((resolve, reject) => {
      entry.readyResolve = resolve
      entry.readyReject = reject

      // Timeout after 30 seconds
      const timeout = setTimeout(() => {
        reject(new Error('Subprocess failed to start within 30 seconds'))
      }, 30000)

      entry.readyResolve = () => {
        clearTimeout(timeout)
        entry.readySettled = true
        resolve()
      }
      entry.readyReject = (err: Error) => {
        clearTimeout(timeout)
        entry.readySettled = true
        reject(err)
      }
    })

    childProcess.stdout?.setEncoding('utf8')
    let buffer = ''
    childProcess.stdout?.on('data', (data: string) => {
      buffer += data
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (line.trim()) {
          this.handleSubprocessMessage(sessionId, line)
        }
      }
    })

    childProcess.stderr?.on('data', (data: string) => {
      console.error(`[agent-subprocess ${sessionId}] stderr:`, data.toString())
    })

    childProcess.on('exit', (code, signal) => {
      console.log(`[agent-subprocess ${sessionId}] exited with code ${code}, signal ${signal}`)

      // If bwrap fails before ready is sent, retry without sandbox
      if (usingSandbox && entry.readyResolve && !entry.readySettled) {
        triggerFallback()
        return
      }

      // Normal exit after ready - clean up
      if (entry.readyReject) {
        entry.readyReject(new Error(`Subprocess exited prematurely with code ${code}`))
      }
      this.sessions.delete(sessionId)
    })

    childProcess.on('error', (err) => {
      console.error(`[agent-subprocess ${sessionId}] error:`, err)
      if (entry.readyReject) {
        entry.readyReject(err)
      }
    })

    this.sendToSubprocess(sessionId, {
      type: 'init',
      config: subprocessConfig,
      sessionId,
    })

    // Wait for ready before returning
    await readyPromise

    return sessionId
  }

  private handleSubprocessMessage(sessionId: string, data: string): void {
    const entry = this.sessions.get(sessionId)
    if (!entry) return

    try {
      const msg: SubprocessMessage = JSON.parse(data)

      switch (msg.type) {
        case 'event':
          if (msg.event) {
            if (msg.event.type === 'tool_use') {
              const toolName = (msg.event as any).toolName || (msg.event as any).tool
              const permission = entry.toolPermissions[toolName] ?? 'ask'

              if (permission === 'deny') {
                this.sendToSubprocess(sessionId, {
                  type: 'tool_result',
                  toolUseId: (msg.event as any).toolUseId,
                  output: 'Tool blocked: denied by policy',
                  isError: true,
                })
                return
              }

              if (permission === 'ask' && entry.hookCoordinator) {
                entry.pendingToolUseId = (msg.event as any).toolUseId
                entry.hookCoordinator.emitAndWait('onPreToolUse', {
                  toolName,
                  toolInput: (msg.event as any).input,
                }).then((decision) => {
                  if (entry.pendingToolUseId === (msg.event as any).toolUseId) {
                    if (decision.behavior === 'deny') {
                      this.sendToSubprocess(sessionId, {
                        type: 'tool_result',
                        toolUseId: (msg.event as any).toolUseId,
                        output: decision.message ?? 'Tool blocked by hook',
                        isError: true,
                      })
                    } else {
                      this.sendToSubprocess(sessionId, {
                        type: 'hook_decision',
                        decision: { behavior: 'allow' },
                      })
                    }
                    entry.pendingToolUseId = null
                  }
                })
                return
              }
            }

            this.enqueueEvent(entry, msg.event)
          }
          break

        case 'error':
          console.error(`[agent-subprocess ${sessionId}] error:`, msg.error)
          this.enqueueEvent(entry, { type: 'error', error: msg.error } as unknown as StreamEvent)
          break

        case 'ready':
          entry.readyResolve?.()
          break
      }
    } catch (err) {
      console.error(`[agent-subprocess ${sessionId}] failed to parse message:`, data, err)
    }
  }

  private enqueueEvent(entry: SessionEntry, event: StreamEvent): void {
    entry.eventQueue.push(event)
    if (entry.currentResolve) {
      const resolve = entry.currentResolve
      entry.currentResolve = null
      resolve(event)
    }
  }

  private async waitForEvent(entry: SessionEntry): Promise<StreamEvent> {
    if (entry.eventQueue.length > 0) {
      return entry.eventQueue.shift()!
    }

    return new Promise<StreamEvent>((resolve) => {
      entry.currentResolve = resolve
    })
  }

  private sendToSubprocess(sessionId: string, msg: object): void {
    const entry = this.sessions.get(sessionId)
    if (!entry || !entry.process.stdin) return
    entry.process.stdin.write(JSON.stringify(msg) + '\n')
  }

  async *streamEvents(sessionId: string): AsyncGenerator<StreamEvent, void, undefined> {
    const entry = this.sessions.get(sessionId)
    if (!entry) return

    while (true) {
      const event = await this.waitForEvent(entry)

      if ((event as any).type === 'result' || event.type === 'error') {
        return
      }

      yield event
    }
  }

  async sendMessage(
    sessionId: string,
    prompt: string,
    stream: boolean = true
  ): Promise<{ result?: unknown; stream?: AsyncGenerator<StreamEvent, void, undefined> }> {
    const entry = this.sessions.get(sessionId)
    if (!entry) {
      throw new Error('Session not found')
    }

    entry.lastActivity = new Date()

    // Send the message to subprocess
    this.sendToSubprocess(sessionId, { type: 'message', prompt, stream })

    if (!stream) {
      const events: StreamEvent[] = []
      for await (const event of this.streamEvents(sessionId)) {
        events.push(event)
      }
      const resultEvent = events.find((e) => (e as any).type === 'result')
      return { result: resultEvent ? (resultEvent as any).result : undefined }
    }

    return { stream: this.streamEvents(sessionId) }
  }

  get(sessionId: string): { sessionId: string; createdAt: Date; lastActivity: Date; historyLength: number; hookCoordinator: HookCoordinator | null } | undefined {
    const entry = this.sessions.get(sessionId)
    if (!entry) return undefined

    return {
      sessionId: entry.sessionId,
      createdAt: entry.createdAt,
      lastActivity: entry.lastActivity,
      historyLength: 0,
      hookCoordinator: entry.hookCoordinator,
    }
  }

  touch(sessionId: string): void {
    const entry = this.sessions.get(sessionId)
    if (entry) {
      entry.lastActivity = new Date()
    }
  }

  list(): Array<{
    sessionId: string
    createdAt: string
    lastActivity: string
    historyLength: number
  }> {
    return Array.from(this.sessions.values()).map((entry) => ({
      sessionId: entry.sessionId,
      createdAt: entry.createdAt.toISOString(),
      lastActivity: entry.lastActivity.toISOString(),
      historyLength: 0,
    }))
  }

  async destroy(sessionId: string): Promise<void> {
    const entry = this.sessions.get(sessionId)
    if (!entry) return

    this.sendToSubprocess(sessionId, { type: 'abort' })

    if (!entry.process.killed) {
      entry.process.kill('SIGTERM')
    }

    setTimeout(() => {
      if (!entry.process.killed) {
        entry.process.kill('SIGKILL')
      }
    }, 5000)

    try {
      fs.rmSync(entry.workspace, { recursive: true, force: true })
    } catch (err) {
      console.error(`Failed to delete workspace ${entry.workspace}:`, err)
    }

    entry.hookCoordinator?.close()
    this.sessions.delete(sessionId)
  }

  async destroyAll(): Promise<void> {
    for (const sessionId of this.sessions.keys()) {
      await this.destroy(sessionId)
    }

    for (const [, connection] of this.mcpConnections) {
      try {
        await connection.close()
      } catch {
        // Ignore errors
      }
    }
    this.mcpConnections.clear()

    if (this.cleanupTask) {
      clearInterval(this.cleanupTask)
      this.cleanupTask = null
    }
  }

  async connectMCPServer(serverId: string, config: MCPServerConfig): Promise<void> {
    const { connectMCPServer } = await import('codenano')
    const connection = await connectMCPServer(config)
    this.mcpConnections.set(serverId, connection)
  }

  getMCPConnection(serverId: string): MCPConnection | undefined {
    return this.mcpConnections.get(serverId)
  }

  async disconnectMCPServer(serverId: string): Promise<void> {
    const connection = this.mcpConnections.get(serverId)
    if (connection) {
      await connection.close()
      this.mcpConnections.delete(serverId)
    }
  }

  listMCPServers(): Array<{ serverId: string }> {
    return Array.from(this.mcpConnections.keys()).map((serverId) => ({ serverId }))
  }
}

let registry: SessionRegistry | null = null

export function getSessionRegistry(): SessionRegistry {
  if (!registry) {
    registry = new SessionRegistry()
  }
  return registry
}

/**
 * agent-wrapper.js - Entry point for bwrap-sandboxed agent
 *
 * Runs as a child process, communicating via stdin/stdout JSON messages.
 *
 * Messages:
 *   In:  { type: 'init', config: AgentConfig, sessionId: string }
 *   In:  { type: 'message', prompt: string, stream: boolean }
 *   In:  { type: 'abort' }
 *
 *   Out: { type: 'event', event: StreamEvent }
 *   Out: { type: 'error', error: string }
 *   Out: { type: 'ready' }
 */

import { createAgent } from '../../codenano/dist/index.js'
import { coreTools, extendedTools, allTools } from '../../codenano/dist/tools/index.js'

let agent = null
let session = null
let currentStream = null

/**
 * Resolve tools from config.toolPreset or config.tools
 */
function resolveTools(config) {
  if (config.tools && config.tools.length > 0) {
    return config.tools
  }

  const preset = config.toolPreset ?? 'core'
  switch (preset) {
    case 'core':
      return coreTools()
    case 'extended':
      return extendedTools()
    case 'all':
      return allTools()
    default:
      return coreTools()
  }
}

/**
 * Send JSON message to parent process
 */
function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n')
}

/**
 * Handle incoming messages from stdin
 */
async function handleMessage(data) {
  try {
    const msg = JSON.parse(data.toString())

    switch (msg.type) {
      case 'init': {
        const { config, sessionId } = msg

        // Set workspace environment variable
        if (config.workspace) {
          process.env.CODENANO_WORKSPACE = config.workspace
        }

        // Build agent config
        const tools = resolveTools(config)
        const agentConfig = {
          model: config.model,
          apiKey: config.apiKey,
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
          tools,
        }

        agent = createAgent(agentConfig)
        session = agent.session()

        send({ type: 'ready', sessionId })
        break
      }

      case 'message': {
        if (!session) {
          send({ type: 'error', error: 'Session not initialized' })
          return
        }

        const { prompt, stream = true } = msg

        if (stream) {
          // Stream response
          for await (const event of session.stream(prompt)) {
            send({ type: 'event', event })
          }
          // Stream complete - no more events will follow
        } else {
          // Non-streaming response
          try {
            const result = await session.send(prompt)
            send({ type: 'event', event: { type: 'result', result } })
          } catch (err) {
            send({ type: 'error', error: err.message })
          }
        }
        break
      }

      case 'abort': {
        if (session) {
          session.abort()
        }
        break
      }

      default:
        send({ type: 'error', error: `Unknown message type: ${msg.type}` })
    }
  } catch (err) {
    send({ type: 'error', error: err.message })
  }
}

// Process stdin line by line
let buffer = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => {
  buffer += chunk
  const lines = buffer.split('\n')
  buffer = lines.pop() // Keep incomplete line in buffer

  for (const line of lines) {
    if (line.trim()) {
      handleMessage(line)
    }
  }
})

process.stdin.on('end', () => {
  if (buffer.trim()) {
    handleMessage(buffer)
  }
})

// Handle errors
process.on('uncaughtException', (err) => {
  send({ type: 'error', error: `Uncaught exception: ${err.message}` })
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  send({ type: 'error', error: `Unhandled rejection: ${reason}` })
  process.exit(1)
})

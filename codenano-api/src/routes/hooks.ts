import type { FastifyInstance, FastifyRequest } from 'fastify'
import { getSessionRegistry } from '../services/session-registry.js'
import { HookCoordinator } from '../hooks/hook-coordinator.js'
import type { HookType, HookDecision } from '../types/index.js'

interface RegisterHookMessage {
  type: 'register_hook'
  hooks: string[]
}

interface HookDecisionMessage {
  type: 'hook_decision'
  hookId: string
  decision: HookDecision
}

type WSMessage = RegisterHookMessage | HookDecisionMessage | { type: string }

export async function hooksRoutes(fastify: FastifyInstance): Promise<void> {
  const registry = getSessionRegistry()

  fastify.get('/ws/sessions/:id/hooks', { websocket: true }, (socket, request: FastifyRequest) => {
    const { id } = request.params as { id: string }
    const entry = registry.get(id)

    if (!entry) {
      socket.send(JSON.stringify({ type: 'error', message: 'Session not found' }))
      socket.close()
      return
    }

    // Get or create hook coordinator for this session
    let coordinator = entry.hookCoordinator
    if (!coordinator) {
      coordinator = new HookCoordinator()
      entry.hookCoordinator = coordinator
    }

    coordinator.setSocket(socket as any)

    socket.on('message', (data) => {
      try {
        const msg: WSMessage = JSON.parse(data.toString())

        if (msg.type === 'register_hook') {
          const registerMsg = msg as RegisterHookMessage
          coordinator!.registerHooks(registerMsg.hooks as HookType[])
          socket.send(JSON.stringify({ type: 'registered', hooks: registerMsg.hooks }))
        } else if (msg.type === 'hook_decision') {
          const decisionMsg = msg as HookDecisionMessage
          coordinator!.onDecision(decisionMsg.hookId, decisionMsg.decision)
        } else if (msg.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }))
        }
      } catch {
        socket.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
      }
    })

    socket.on('close', () => {
      coordinator?.setSocket(null)
    })

    socket.on('error', () => {
      coordinator?.setSocket(null)
    })
  })
}

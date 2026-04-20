import type { WebSocket } from 'ws'
import type { HookType, HookDecision } from '../types/index.js'

const HOOK_TIMEOUT_MS = 30000

interface PendingHook {
  resolve: (decision: HookDecision) => void
  timeout: NodeJS.Timeout
}

export class HookCoordinator {
  private socket: WebSocket | null = null
  private pendingHooks = new Map<string, PendingHook>()
  private registeredHooks = new Set<HookType>()

  setSocket(socket: WebSocket | null): void {
    if (this.socket && this.socket !== socket) {
      for (const [hookId, pending] of this.pendingHooks) {
        clearTimeout(pending.timeout)
        this.pendingHooks.delete(hookId)
      }
    }
    this.socket = socket
  }

  registerHooks(hooks: HookType[]): void {
    for (const hook of hooks) {
      this.registeredHooks.add(hook)
    }
  }

  isHookRegistered(hookType: HookType): boolean {
    return this.registeredHooks.has(hookType)
  }

  async emitAndWait(
    hookType: HookType,
    data: Record<string, unknown>
  ): Promise<HookDecision> {
    if (!this.socket) {
      return { behavior: 'allow' }
    }

    if (!this.isHookRegistered(hookType)) {
      return { behavior: 'allow' }
    }

    const hookId = crypto.randomUUID()

    return new Promise<HookDecision>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingHooks.delete(hookId)
        resolve({ behavior: 'allow' })
      }, HOOK_TIMEOUT_MS)

      this.pendingHooks.set(hookId, { resolve, timeout })

      const event = {
        type: 'hook_event',
        hookId,
        hookType,
        data,
      }

      try {
        this.socket!.send(JSON.stringify(event))
      } catch {
        clearTimeout(timeout)
        this.pendingHooks.delete(hookId)
        resolve({ behavior: 'allow' })
      }
    })
  }

  onDecision(hookId: string, decision: HookDecision): void {
    const pending = this.pendingHooks.get(hookId)
    if (pending) {
      clearTimeout(pending.timeout)
      pending.resolve(decision)
      this.pendingHooks.delete(hookId)
    }
  }

  close(): void {
    for (const [hookId, pending] of this.pendingHooks) {
      clearTimeout(pending.timeout)
      pending.resolve({ behavior: 'allow' })
    }
    this.pendingHooks.clear()
    this.socket = null
    this.registeredHooks.clear()
  }
}

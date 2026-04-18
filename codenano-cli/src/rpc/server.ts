import type { JsonRpcRequest, JsonRpcResponse, JsonRpcNotification } from '../types/rpc.js'

type MethodHandler = (params?: Record<string, unknown>) => Promise<unknown> | never

export class RpcServer {
  private methods = new Map<string, MethodHandler>()
  private pending = new Map<string | number, { resolve: (v: unknown) => void; reject: (e: unknown) => void }>()

  register(name: string, handler: MethodHandler): void {
    this.methods.set(name, handler)
  }

  async handleLine(line: string): Promise<void> {
    const trimmed = line.trim()
    if (!trimmed) return

    let req: JsonRpcRequest
    try {
      req = JSON.parse(trimmed)
    } catch {
      this.sendError(null, -32700, 'Parse error')
      return
    }

    if (req.method === 'stream') {
      return
    }

    if (req.id === null || req.id === undefined) {
      this.sendError(req.id, -32600, 'Invalid Request: missing id')
      return
    }

    const handler = this.methods.get(req.method)
    if (!handler) {
      this.sendError(req.id, -32601, `Method not found: ${req.method}`)
      return
    }

    try {
      const result = await handler(req.params)
      this.sendResponse(req.id, result)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.sendError(req.id, -32603, `Internal error: ${message}`)
    }
  }

  sendResponse(id: string | number | null, result: unknown): void {
    const response: JsonRpcResponse = { jsonrpc: '2.0', id, result }
    console.log(JSON.stringify(response))
  }

  sendError(id: string | number | null, code: number, message: string, data?: unknown): void {
    const response: JsonRpcResponse = { jsonrpc: '2.0', id, error: { code, message, data } }
    console.log(JSON.stringify(response))
  }

  sendNotification(type: string, data: unknown): void {
    const notification: JsonRpcNotification = {
      jsonrpc: '2.0',
      method: 'stream',
      params: { type, data },
    }
    console.log(JSON.stringify(notification))
  }
}

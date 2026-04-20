import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { listMCPTools, callMCPTool } from 'codenano'
import { getSessionRegistry } from '../services/session-registry.js'
import type { ConnectMCPServerBody, CallMCPToolBody, MCPServerConfig } from '../types/index.js'

export async function mcpRoutes(fastify: FastifyInstance): Promise<void> {
  const registry = getSessionRegistry()

  // Connect MCP server
  fastify.post('/api/v1/mcp/connect', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as ConnectMCPServerBody
    const { serverId, config } = body

    if (!config || !config.command) {
      return reply.status(400).send({ error: 'config.command is required' })
    }

    const id = serverId ?? crypto.randomUUID()

    // Build MCPServerConfig with required name and transport fields
    const mcpConfig: MCPServerConfig = {
      name: id,
      transport: 'stdio',
      command: config.command,
      args: config.args,
      env: config.env,
    }

    try {
      await registry.connectMCPServer(id, mcpConfig)
      return reply.send({ ok: true, serverId: id })
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      return reply.status(500).send({ error: `Failed to connect MCP server: ${error}` })
    }
  })

  // List MCP tools from all connected servers
  fastify.get('/api/v1/mcp/tools', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const servers = registry.listMCPServers()
      const allTools: Array<{ serverId: string; tools: unknown[] }> = []

      for (const { serverId } of servers) {
        const conn = registry.getMCPConnection(serverId)
        if (conn) {
          const tools = await listMCPTools(conn)
          allTools.push({ serverId, tools })
        }
      }

      return reply.send({ tools: allTools })
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      return reply.status(500).send({ error })
    }
  })

  // Call MCP tool directly
  fastify.post('/api/v1/mcp/tools/call', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as CallMCPToolBody
    const { serverId, toolName, toolInput } = body

    if (!serverId || !toolName) {
      return reply.status(400).send({ error: 'serverId and toolName are required' })
    }

    const conn = registry.getMCPConnection(serverId)
    if (!conn) {
      return reply.status(404).send({ error: 'MCP server not found' })
    }

    try {
      const result = await callMCPTool(conn, toolName, toolInput)
      return reply.send({ result })
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      return reply.status(500).send({ error: `Failed to call MCP tool: ${error}` })
    }
  })

  // Disconnect MCP server
  fastify.delete('/api/v1/mcp/:serverId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { serverId } = request.params as { serverId: string }

    const conn = registry.getMCPConnection(serverId)
    if (!conn) {
      return reply.status(404).send({ error: 'MCP server not found' })
    }

    await registry.disconnectMCPServer(serverId)
    return reply.send({ ok: true })
  })
}

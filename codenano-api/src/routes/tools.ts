import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { defineTool } from 'codenano'
import { z } from 'zod'
import type { ToolDef, ToolContext, ToolOutput } from 'codenano'

// In-memory store for custom tools (would be per-session in production)
const customTools = new Map<string, ToolDef<any>>()

export async function toolsRoutes(fastify: FastifyInstance): Promise<void> {
  // Define custom tool
  fastify.post('/api/v1/tools', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      name: string
      description: string
      inputSchema: Record<string, unknown>
      execute?: (input: Record<string, unknown>, context: ToolContext) => Promise<ToolOutput>
    }

    const { name, description, inputSchema } = body

    if (!name || !description || !inputSchema) {
      return reply.status(400).send({ error: 'name, description, and inputSchema are required' })
    }

    try {
      // Parse inputSchema with zod
      const properties: Record<string, z.ZodType> = {}
      for (const [key, value] of Object.entries(inputSchema)) {
        if (value && typeof value === 'object' && 'type' in (value as object)) {
          const schemaValue = value as { type: string }
          if (schemaValue.type === 'string') {
            properties[key] = z.string()
          } else if (schemaValue.type === 'number') {
            properties[key] = z.number()
          } else if (schemaValue.type === 'boolean') {
            properties[key] = z.boolean()
          } else {
            properties[key] = z.unknown()
          }
        } else {
          properties[key] = z.unknown()
        }
      }

      const zodSchema = z.object(properties)

      // Default execute function that returns the input as JSON
      const defaultExecute = async (input: Record<string, unknown>): Promise<ToolOutput> => {
        return { content: JSON.stringify(input) }
      }

      const executeFn = body.execute ?? defaultExecute
      const tool = defineTool({
        name,
        description,
        input: zodSchema,
        execute: executeFn,
      })

      customTools.set(name, tool)

      return reply.send({ ok: true, toolName: name })
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      return reply.status(400).send({ error: `Invalid tool definition: ${error}` })
    }
  })

  // List all custom tools
  fastify.get('/api/v1/tools', async (_request: FastifyRequest, reply: FastifyReply) => {
    const tools = Array.from(customTools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
    }))

    return reply.send({ tools })
  })

  // Get custom tool by name
  fastify.get('/api/v1/tools/:name', async (request: FastifyRequest, reply: FastifyReply) => {
    const { name } = request.params as { name: string }
    const tool = customTools.get(name)

    if (!tool) {
      return reply.status(404).send({ error: 'Tool not found' })
    }

    return reply.send({
      name: tool.name,
      description: tool.description,
    })
  })

  // Delete custom tool
  fastify.delete('/api/v1/tools/:name', async (request: FastifyRequest, reply: FastifyReply) => {
    const { name } = request.params as { name: string }

    if (!customTools.has(name)) {
      return reply.status(404).send({ error: 'Tool not found' })
    }

    customTools.delete(name)
    return reply.send({ ok: true })
  })
}

// Export for use by other modules
export function getCustomTools(): ToolDef<any>[] {
  return Array.from(customTools.values())
}

export function clearCustomTools(): void {
  customTools.clear()
}

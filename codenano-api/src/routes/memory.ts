import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { saveMemory, loadMemory, scanMemories, getMemoryDir } from '../codenano/index.js'
import type { Memory } from '../codenano/index.js'
import { join } from 'path'
import { unlinkSync, existsSync } from 'fs'

export async function memoryRoutes(fastify: FastifyInstance): Promise<void> {
  // Save memory
  fastify.post('/api/v1/memory', async (request: FastifyRequest, reply: FastifyReply) => {
    const { key, content, type = 'general', description = '' } = request.body as {
      key: string
      content: string
      type?: string
      description?: string
    }

    if (!key || !content) {
      return reply.status(400).send({ error: 'key and content are required' })
    }

    const memory: Memory = {
      name: key,
      description: description || key,
      type: type as Memory['type'],
      content,
    }

    const filepath = saveMemory(memory)
    return reply.send({ ok: true, filepath })
  })

  // Load memory by key (using scan to find by name)
  fastify.get('/api/v1/memory/:key', async (request: FastifyRequest, reply: FastifyReply) => {
    const { key } = request.params as { key: string }
    const memoryDir = getMemoryDir()

    const memories = scanMemories(memoryDir)
    const memory = memories.find(m => m.name === key)

    if (!memory) {
      return reply.status(404).send({ error: 'Memory not found' })
    }

    return reply.send(memory)
  })

  // Scan memories
  fastify.get('/api/v1/memory', async (request: FastifyRequest, reply: FastifyReply) => {
    const memoryDir = getMemoryDir()
    const memories = scanMemories(memoryDir)

    // Optionally filter by key prefix pattern
    const { pattern } = request.query as { pattern?: string }
    const filtered = pattern
      ? memories.filter(m => m.name.startsWith(pattern))
      : memories

    return reply.send({ memories: filtered })
  })

  // Delete memory
  fastify.delete('/api/v1/memory/:key', async (request: FastifyRequest, reply: FastifyReply) => {
    const { key } = request.params as { key: string }
    const memoryDir = getMemoryDir()

    const memories = scanMemories(memoryDir)
    const memory = memories.find(m => m.name === key)

    if (!memory) {
      return reply.status(404).send({ error: 'Memory not found' })
    }

    // Calculate the filepath matching the SDK's naming convention
    const filename = `${key.replace(/[^a-z0-9_-]/gi, '_')}.md`
    const filepath = join(memoryDir, filename)

    if (existsSync(filepath)) {
      unlinkSync(filepath)
    }

    return reply.send({ ok: true })
  })
}

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { calculateCostUSD, getModelPricing } from 'codenano'
import type { Usage } from 'codenano'

export async function costRoutes(fastify: FastifyInstance): Promise<void> {
  // Get model pricing
  fastify.get('/api/v1/cost/pricing', async (_request: FastifyRequest, reply: FastifyReply) => {
    const { model } = _request.query as { model?: string }

    if (model) {
      const pricing = getModelPricing(model)
      return reply.send({ model, pricing })
    }

    // Return pricing for common models
    const models = ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5-20251001']
    const pricing = models.map(m => ({
      model: m,
      pricing: getModelPricing(m),
    }))

    return reply.send({ models: pricing })
  })

  // Calculate cost for usage
  fastify.post('/api/v1/cost/calculate', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      model: string
      usage: Usage
    }

    if (!body.model || !body.usage) {
      return reply.status(400).send({ error: 'model and usage are required' })
    }

    const { model, usage } = body

    try {
      const cost = calculateCostUSD(model, usage)
      return reply.send({
        model,
        usage,
        costUSD: cost,
      })
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      return reply.status(400).send({ error: `Failed to calculate cost: ${error}` })
    }
  })
}

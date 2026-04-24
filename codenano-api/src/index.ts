import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { sessionsRoutes } from './routes/sessions.js'
import { memoryRoutes } from './routes/memory.js'
import { costRoutes } from './routes/cost.js'
import { gitRoutes } from './routes/git.js'
import { skillsRoutes } from './routes/skills.js'
import { getSessionRegistry } from './services/session-registry.js'
import { checkDockerHealth } from './services/docker-service.js'

// Validate required env vars
if (!process.env.ANTHROPIC_AUTH_TOKEN) {
  console.error('ANTHROPIC_AUTH_TOKEN is required')
  process.exit(1)
}

// Validate Docker is available
const dockerHealthy = await checkDockerHealth()
if (!dockerHealthy) {
  console.warn('Warning: Docker daemon is not accessible. Sandbox features will be disabled.')
}

const PORT = parseInt(process.env.AGENT_SERVICE_PORT ?? '8000', 10)
const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info'

const fastify = Fastify({
  logger: {
    level: LOG_LEVEL,
  },
})

// Register plugins
await fastify.register(cors)

// Register routes
await fastify.register(sessionsRoutes)
await fastify.register(memoryRoutes)
await fastify.register(costRoutes)
await fastify.register(gitRoutes)
await fastify.register(skillsRoutes)

// Graceful shutdown
const registry = getSessionRegistry()

async function shutdown(signal: string): Promise<void> {
  fastify.log.info(`Received ${signal}, shutting down...`)

  // Stop accepting new connections
  await fastify.close()

  // Destroy all sessions
  await registry.destroyAll()

  fastify.log.info('Shutdown complete')
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

// Start server
try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' })
  fastify.log.info(`Agent service listening on port ${PORT}`)
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}

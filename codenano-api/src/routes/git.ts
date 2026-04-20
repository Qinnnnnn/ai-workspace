import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { getGitState, findGitRoot } from 'codenano'
import { resolve } from 'path'

export async function gitRoutes(fastify: FastifyInstance): Promise<void> {
  // Get git state
  fastify.get('/api/v1/git/state', async (request: FastifyRequest, reply: FastifyReply) => {
    const { path: searchPath } = request.query as { path?: string }

    try {
      const workingDir = searchPath ? resolve(searchPath) : process.cwd()
      const gitRoot = await findGitRoot(workingDir)

      if (!gitRoot) {
        return reply.status(404).send({ error: 'Not a git repository' })
      }

      const state = await getGitState(gitRoot)
      return reply.send(state)
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      return reply.status(500).send({ error: `Failed to get git state: ${error}` })
    }
  })
}

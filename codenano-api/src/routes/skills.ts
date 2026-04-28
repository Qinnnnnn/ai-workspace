import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { discoverSkillFiles, loadSkills, expandSkillContent, parseSkillFile } from '../codenano/index.js'
import type { SkillDef } from '../codenano/index.js'

const DEFAULT_SKILLS_DIRS = ['.claude/skills']

export async function skillsRoutes(fastify: FastifyInstance): Promise<void> {
  // List all skills
  fastify.get('/api/v1/skills', async (request: FastifyRequest, reply: FastifyReply) => {
    const { path: skillsPath } = request.query as { path?: string }

    try {
      const dirs = skillsPath ? [skillsPath] : DEFAULT_SKILLS_DIRS
      const skills = loadSkills(dirs)

      return reply.send({
        skills: skills.map(s => ({
          name: s.name,
          description: s.description,
          filePath: s.filePath,
          allowedTools: s.allowedTools,
          arguments: s.arguments,
          context: s.context,
        })),
      })
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      return reply.status(500).send({ error: `Failed to list skills: ${error}` })
    }
  })

  // Get skill content
  fastify.get('/api/v1/skills/:name', async (request: FastifyRequest, reply: FastifyReply) => {
    const { name } = request.params as { name: string }
    const { path: skillsPath } = request.query as { path?: string }

    try {
      const dirs = skillsPath ? [skillsPath] : DEFAULT_SKILLS_DIRS
      const skillFiles = discoverSkillFiles(dirs)

      // Find matching skill
      for (const filePath of skillFiles) {
        const skill = parseSkillFile(filePath)
        if (skill && (skill.name === name || skill.name === name.replace(/-/g, ' '))) {
          return reply.send(skill)
        }
      }

      return reply.status(404).send({ error: 'Skill not found' })
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      return reply.status(500).send({ error: `Failed to get skill: ${error}` })
    }
  })

  // Expand skill content in prompt
  fastify.post('/api/v1/skills/expand', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      content: string
      args?: string
    }

    if (!body.content) {
      return reply.status(400).send({ error: 'content is required' })
    }

    try {
      const skillDef: SkillDef = {
        name: 'temp',
        description: '',
        content: body.content,
        filePath: '',
      }

      const expanded = expandSkillContent(skillDef, body.args)
      return reply.send({ expanded })
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      return reply.status(500).send({ error: `Failed to expand skill content: ${error}` })
    }
  })
}

/**
 * SandboxFileReadTool — Read files from Docker sandbox via docker exec cat.
 * Path validation is done via withPathSandbox wrapper.
 */

import { z } from 'zod'
import { defineTool } from '../../tool-builder.js'
import { execCommand } from '../../../services/docker-service.js'
import { withPathSandbox } from './path-sandbox.js'
import type { ToolContext } from '../../types.js'

const inputSchema = z.object({
  file_path: z.string().describe('Absolute path to file'),
})

export type FileReadInput = z.infer<typeof inputSchema>

const sandboxFileReadTool = defineTool({
  name: 'Read',
  description: 'Read the contents of a file from the Docker sandbox.',
  input: inputSchema,

  async execute(input, context: ToolContext) {
    if (context.runtime?.type !== 'sandbox') {
      return { content: 'Sandbox mode required.', isError: true }
    }

    const { containerId } = context.runtime
    const safePath = input.file_path.replace(/'/g, "'\\''")
    const result = await execCommand(containerId, `cat '${safePath}'`)

    if (result.status === 0) {
      return result.stdout
    }
    return { content: result.stderr || `Read failed with exit code ${result.status}`, isError: true }
  },
})

export const SandboxFileReadTool = withPathSandbox(sandboxFileReadTool)

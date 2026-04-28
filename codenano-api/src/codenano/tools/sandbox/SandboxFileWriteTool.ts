/**
 * SandboxFileWriteTool — Write files to Docker sandbox via stdin streaming.
 * Path validation is done via withPathSandbox wrapper.
 */

import { z } from 'zod'
import { defineTool } from '../../tool-builder.js'
import { execCommandWithStdin } from '../../../services/docker-service.js'
import { withPathSandbox } from './path-sandbox.js'
import type { ToolContext } from '../../types.js'

const inputSchema = z.object({
  file_path: z.string().describe('Absolute path to file'),
  content: z.string().describe('Content to write'),
})

export type FileWriteInput = z.infer<typeof inputSchema>

const sandboxFileWriteTool = defineTool({
  name: 'Write',
  description: 'Write content to a file in the Docker sandbox.',
  input: inputSchema,

  async execute(input, context: ToolContext) {
    if (context.runtime?.type !== 'sandbox') {
      return { content: 'Sandbox mode required.', isError: true }
    }

    const { containerId } = context.runtime
    const safePath = input.file_path.replace(/'/g, "'\\''")
    const cmd = `mkdir -p $(dirname '${safePath}') && cat > '${safePath}'`

    const result = await execCommandWithStdin(containerId, cmd, input.content)

    if (result.status === 0) {
      const lines = input.content.split('\n').length
      return `Successfully wrote ${input.file_path} (${lines} lines)`
    }
    return { content: result.stderr || `Write failed`, isError: true }
  },
})

export const SandboxFileWriteTool = withPathSandbox(sandboxFileWriteTool)

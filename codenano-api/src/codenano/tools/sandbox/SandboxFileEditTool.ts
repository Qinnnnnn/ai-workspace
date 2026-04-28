/**
 * SandboxFileEditTool — Edit files in Docker sandbox via memory replace + stdin write.
 * Path validation is done via withPathSandbox wrapper.
 */

import { z } from 'zod'
import { defineTool } from '../../tool-builder.js'
import { execCommand, execCommandWithStdin } from '../../../services/docker-service.js'
import { withPathSandbox } from './path-sandbox.js'
import type { ToolContext } from '../../types.js'

const inputSchema = z.object({
  file_path: z.string().describe('Absolute path to file'),
  old_string: z.string().describe('Text to replace'),
  new_string: z.string().describe('Replacement text'),
  replace_all: z.boolean().optional().default(false),
})

export type FileEditInput = z.infer<typeof inputSchema>

const sandboxFileEditTool = defineTool({
  name: 'Edit',
  description: 'Perform exact string replacements in a file in the Docker sandbox.',
  input: inputSchema,

  async execute(input, context: ToolContext) {
    if (context.runtime?.type !== 'sandbox') {
      return { content: 'Sandbox mode required.', isError: true }
    }

    const { containerId } = context.runtime
    const safePath = input.file_path.replace(/'/g, "'\\''")

    const readResult = await execCommand(containerId, `cat '${safePath}'`)
    if (readResult.status !== 0) {
      return { content: `Error: File not found: ${input.file_path}`, isError: true }
    }

    const content = readResult.stdout

    if (!content.includes(input.old_string)) {
      return { content: `Error: old_string not found in ${input.file_path}`, isError: true }
    }

    if (!input.replace_all) {
      const firstIdx = content.indexOf(input.old_string)
      const secondIdx = content.indexOf(input.old_string, firstIdx + input.old_string.length)
      if (secondIdx !== -1) {
        return {
          content: `Error: old_string appears multiple times. Use replace_all: true.`,
          isError: true,
        }
      }
    }

    const updated = input.replace_all
      ? content.split(input.old_string).join(input.new_string)
      : content.replace(input.old_string, input.new_string)

    const writeResult = await execCommandWithStdin(containerId, `cat > '${safePath}'`, updated)
    if (writeResult.status !== 0) {
      return { content: writeResult.stderr || `Edit failed`, isError: true }
    }

    const count = input.replace_all
      ? content.split(input.old_string).length - 1
      : 1
    return `Successfully edited ${input.file_path} (${count} replacement${count > 1 ? 's' : ''})`
  },
})

export const SandboxFileEditTool = withPathSandbox(sandboxFileEditTool)

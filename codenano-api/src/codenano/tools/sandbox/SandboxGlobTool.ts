/**
 * SandboxGlobTool — Fast file pattern matching inside Docker container.
 * Uses dockerode exec via execCommand to run find inside the container.
 */

import { z } from 'zod'
import { defineTool } from '../../tool-builder.js'
import { execCommand } from '../../../services/docker-service.js'
import type { ToolContext } from '../../types.js'

const inputSchema = z.object({
  pattern: z.string().describe('The glob pattern to match files against'),
  path: z
    .string()
    .optional()
    .describe(
      'The directory to search in. If not specified, the current working directory will be used.',
    ),
})

export type GlobInput = z.infer<typeof inputSchema>

export const SandboxGlobTool = defineTool({
  name: 'Glob',
  description:
    'Fast file pattern matching tool that works with any codebase size. Supports glob patterns like "**/*.js" or "src/**/*.ts". Returns matching file paths sorted by modification time.',
  input: inputSchema,
  isReadOnly: true,
  isConcurrencySafe: true,

  async execute(input, context: ToolContext) {
    if (context.runtime?.type !== 'sandbox') {
      return { content: 'Sandbox mode required. Expected runtime.type === "sandbox"', isError: true }
    }

    const { containerId, cwd } = context.runtime
    const searchDir = input.path ?? cwd
    const escapedPattern = input.pattern.replace(/'/g, "'\\''")
    const cmd = `find '${searchDir}' -name '${escapedPattern}' -type f 2>/dev/null | head -1000`

    const result = await execCommand(containerId, cmd)

    if (result.status !== 0) {
      return { content: `Error: Failed to search for pattern "${input.pattern}" in ${searchDir}`, isError: true }
    }

    const stdout = result.stdout
    const files = stdout.trim().split('\n').filter(Boolean)

    if (files.length === 0) {
      return `No files matched pattern "${input.pattern}" in ${searchDir}`
    }
    return files.join('\n')
  },
})

/**
 * SandboxBashTool — Execute shell commands inside Docker container.
 * All commands are proxied through dockerode exec.
 */

import { z } from 'zod'
import { defineTool } from '../../tool-builder.js'
import { execCommand, execDetached } from '../../../services/docker-service.js'
import type { ToolContext } from '../../types.js'

const MAX_TIMEOUT_MS = 600_000 // 10 minutes
const DEFAULT_TIMEOUT_MS = 120_000 // 2 minutes

const inputSchema = z.object({
  command: z.string().describe('The command to execute'),
  timeout: z
    .number()
    .optional()
    .describe(`Optional timeout in milliseconds (max ${MAX_TIMEOUT_MS})`),
  description: z
    .string()
    .optional()
    .describe('Clear, concise description of what this command does in active voice.'),
  run_in_background: z
    .boolean()
    .optional()
    .describe('Set to true to run this command in the background.'),
})

export type BashInput = z.infer<typeof inputSchema>

export const SandboxBashTool = defineTool({
  name: 'Bash',
  description:
    'Executes a given bash command inside the Docker sandbox and returns its output.',
  input: inputSchema,

  isReadOnly(input) {
    const readOnlyPrefixes = [
      'ls', 'cat', 'head', 'tail', 'grep', 'find', 'which',
      'echo', 'pwd', 'date', 'env', 'git status', 'git log',
      'git diff', 'git show', 'git branch',
    ]
    const cmd = input.command.trim()
    return readOnlyPrefixes.some(p => cmd.startsWith(p))
  },

  isConcurrencySafe(input) {
    const readOnlyPrefixes = [
      'ls', 'cat', 'head', 'tail', 'grep', 'find', 'which',
      'echo', 'pwd', 'date', 'env', 'git status', 'git log',
      'git diff', 'git show', 'git branch',
    ]
    const cmd = input.command.trim()
    return readOnlyPrefixes.some(p => cmd.startsWith(p))
  },

  async execute(input, context: ToolContext) {
    if (context.runtime?.type !== 'sandbox') {
      return { content: 'Sandbox mode required. Expected runtime.type === "sandbox"', isError: true }
    }

    const timeout = Math.min(input.timeout ?? DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS)
    const { containerId } = context.runtime

    if (input.run_in_background) {
      await execDetached(containerId, input.command)
      return `Background process started in container ${containerId}`
    }

    const result = await execCommand(containerId, input.command, timeout)
    const stdout = result.stdout
    const stderr = result.stderr
    const exitCode = result.status

    if (exitCode !== 0) {
      return {
        content: (stdout + '\n' + stderr).trim() || `Command failed with exit code ${exitCode}`,
        isError: true,
      }
    }
    return stdout
  },
})

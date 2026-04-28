/**
 * SandboxBashTool — Execute shell commands inside Docker container.
 * All commands are proxied through `docker exec` via executeCoreCommand.
 */

import { z } from 'zod'
import { exec } from 'child_process'
import { defineTool } from '../../tool-builder.js'
import { executeCoreCommand } from '../../utils/sandbox-exec.js'
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
      const env = { ...process.env }
      if (process.env.SANDBOX_MODE === 'remote') {
        env.DOCKER_HOST = `ssh://${process.env.DOCKER_HOST_USER}@${process.env.DOCKER_HOST_HOST}`
      }
      const escapedCmd = input.command.replace(/'/g, "'\\''")
      const child = exec(
        `docker exec -d ${containerId} bash -c '${escapedCmd}'`,
        { env },
      )
      child.on('error', (err) => console.error(`Background process error: ${err.message}`))
      child.on('exit', (code) => {
        if (code !== 0) console.error(`Background process exited with code ${code}`)
      })
      return `Background process started in container ${containerId}`
    }

    const result = executeCoreCommand(containerId, input.command, timeout)
    const stdout = result.stdout ?? ''
    const stderr = result.stderr ?? ''
    const exitCode = result.status ?? 0

    if (exitCode !== 0) {
      return {
        content: (stdout + '\n' + stderr).trim() || `Command failed with exit code ${exitCode}`,
        isError: true,
      }
    }
    return stdout
  },
})

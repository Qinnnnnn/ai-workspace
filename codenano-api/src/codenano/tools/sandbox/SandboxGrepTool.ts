/**
 * SandboxGrepTool — Search file contents with regex inside Docker container.
 * Uses execCommand to run ripgrep inside the container's /workspace.
 * Implementation mirrors core GrepTool including fallback to grep.
 */

import { z } from 'zod'
import { defineTool } from '../../tool-builder.js'
import { execCommand } from '../../../services/docker-service.js'
import type { ToolContext } from '../../types.js'

type GrepInput = z.infer<typeof inputSchema>

const inputSchema = z.object({
  pattern: z.string().describe('The regular expression pattern to search for in file contents'),
  path: z
    .string()
    .optional()
    .describe('File or directory to search in. Defaults to current working directory.'),
  glob: z.string().optional().describe('Glob pattern to filter files (e.g. "*.js", "**/*.tsx")'),
  type: z
    .string()
    .optional()
    .describe('File type to search (e.g. "js", "py", "rust", "go", "java")'),
  output_mode: z
    .enum(['content', 'files_with_matches', 'count'])
    .optional()
    .describe(
      'Output mode: "content" shows matching lines, "files_with_matches" shows only file paths (default), "count" shows match counts',
    ),
  '-B': z.number().optional().describe('Number of lines to show before each match'),
  '-A': z.number().optional().describe('Number of lines to show after each match'),
  '-C': z.number().optional().describe('Number of lines to show before and after each match'),
  context: z.number().optional().describe('Alias for -C'),
  '-n': z.boolean().optional().describe('Show line numbers in output (defaults to true)'),
  '-i': z.boolean().optional().describe('Case insensitive search'),
  head_limit: z
    .number()
    .optional()
    .describe('Limit output to first N lines/entries. Defaults to 250.'),
  offset: z.number().optional().describe('Skip first N lines/entries before applying head_limit'),
  multiline: z.boolean().optional().describe('Enable multiline mode where . matches newlines'),
})

export type { GrepInput }

export const SandboxGrepTool = defineTool({
  name: 'Grep',
  description:
    'A powerful search tool built on ripgrep. Supports full regex syntax, file type filtering, and multiple output modes.',
  input: inputSchema,
  isReadOnly: true,
  isConcurrencySafe: true,

  async execute(input, context: ToolContext) {
    if (context.runtime?.type !== 'sandbox') {
      return { content: 'Sandbox mode required. Expected runtime.type === "sandbox"', isError: true }
    }

    const { containerId, cwd } = context.runtime
    const searchPath = input.path ? input.path : cwd
    const result = await executeGrepInSandbox(input, searchPath, containerId)
    return result
  },
})

async function executeGrepInSandbox(input: GrepInput, searchPath: string, containerId: string) {
  const mode = input.output_mode ?? 'files_with_matches'
  const limit = input.head_limit ?? 250

  const rgArgs: string[] = ['rg']

  if (mode === 'files_with_matches') rgArgs.push('-l')
  else if (mode === 'count') rgArgs.push('-c')

  const ctx = input['-C'] ?? input.context
  if (ctx !== undefined) rgArgs.push('-C', String(ctx))
  if (input['-B'] !== undefined) rgArgs.push('-B', String(input['-B']))
  if (input['-A'] !== undefined) rgArgs.push('-A', String(input['-A']))

  if (input['-i']) rgArgs.push('-i')
  if (input['-n'] !== false && mode === 'content') rgArgs.push('-n')
  if (input.multiline) rgArgs.push('-U', '--multiline-dotall')

  if (input.glob) rgArgs.push('--glob', input.glob)
  if (input.type) rgArgs.push('--type', input.type)

  rgArgs.push('--', input.pattern, searchPath)

  const rgCmd = rgArgs.join(' ')
  const result = await execCommand(containerId, rgCmd)

  let output = result.stdout
  const exitCode = result.status

  let lines = output.split('\n')
  if (input.offset) lines = lines.slice(input.offset)
  if (limit > 0) lines = lines.slice(0, limit)
  output = lines.join('\n').trimEnd()

  if (exitCode === 0 || exitCode === 1) {
    return output || `No matches found for pattern "${input.pattern}"`
  }

  if (exitCode === 2) {
    const grepArgs = ['grep', '-r']
    if (input['-i']) grepArgs.push('-i')
    if (input['-n'] !== false && mode === 'content') grepArgs.push('-n')
    if (mode === 'files_with_matches') grepArgs.push('-l')
    if (mode === 'count') grepArgs.push('-c')
    grepArgs.push('--', input.pattern, searchPath)

    const grepCmd = grepArgs.join(' ')
    const fallbackResult = await execCommand(containerId, grepCmd)
    return fallbackResult.stdout?.trimEnd() || `No matches found for pattern "${input.pattern}"`
  }

  return { content: `Error searching: exit code ${exitCode}`, isError: true }
}

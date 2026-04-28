/**
 * Path sandbox helper — wraps a tool that takes file_path and adds
 * container-side path validation via realpath -m.
 * Uses bash [[ ]] for in-line prefix check to reject traversal.
 */

import type { ToolDef, ToolContext, ToolOutput } from '../../types.js'
import { PathTraversalViolation } from '../../path-utils.js'
import { executeCoreCommand } from '../../utils/sandbox-exec.js'

function validatePathInContainer(containerId: string, virtualPath: string): string {
  // realpath -m: resolves path without requiring file existence
  // bash [[ ]]: rejects any path not under /workspace
  const escapedPath = virtualPath.replace(/'/g, "'\\''")
  const cmd = `rp=$(realpath -m '${escapedPath}') && [[ "$rp" == /workspace/* || "$rp" == "/workspace" ]] && echo "$rp" || exit 1`
  const result = executeCoreCommand(containerId, cmd)

  if (result.status !== 0) {
    throw new PathTraversalViolation()
  }

  const resolved = (result.stdout ?? '').trim()
  if (!resolved.startsWith('/workspace/')) {
    throw new PathTraversalViolation()
  }

  return resolved
}

export function withPathSandbox<T extends { file_path: string }>(
  tool: ToolDef<T>,
): ToolDef<T> {
  return {
    ...tool,
    async execute(input: T, context: ToolContext): Promise<ToolOutput> {
      if (context.runtime?.type !== 'sandbox') {
        return { content: 'Sandbox mode required. Expected runtime.type === "sandbox"', isError: true }
      }
      try {
        const safePath = validatePathInContainer(context.runtime.containerId, input.file_path)
        return tool.execute({ ...input, file_path: safePath }, context)
      } catch (e) {
        if (e instanceof PathTraversalViolation) {
          return {
            content: `Security Violation: Path "${input.file_path}" is outside /workspace. ` +
              `All file operations must use paths under /workspace. ` +
              `Use absolute paths like /workspace/src/main.py instead of /etc/passwd or ../etc/passwd.`,
            isError: true,
          }
        }
        throw e
      }
    },
  }
}

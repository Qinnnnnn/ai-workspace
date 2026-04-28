import { createAgent, coreTools, extendedTools, allTools, sandboxCoreTools } from './codenano/index.js'
import type { Agent, ToolDef, AgentConfig, PermissionDecision } from './codenano/index.js'

const TOOL_PRESETS = {
  core: coreTools,
  extended: extendedTools,
  all: allTools,
} as const

export type ToolPreset = keyof typeof TOOL_PRESETS

export interface AgentFactoryConfig extends Omit<AgentConfig, 'tools'> {
  toolPreset?: ToolPreset
  toolPermissions?: Record<string, 'allow' | 'deny'>
}

/**
 * Create an agent with codenano direct library integration.
 * Replaces subprocess spawning with in-process agent creation.
 *
 * Dispatches based on RuntimeContext type for compile-time safety.
 */
export function createAgentInstance(config: AgentFactoryConfig): Agent {
  const { toolPreset = 'core', toolPermissions, runtime } = config

  // Type-safe branching based on runtime context
  const isSandbox = runtime?.type === 'sandbox'
  const tools = isSandbox
    ? sandboxCoreTools()
    : TOOL_PRESETS[toolPreset]?.() ?? coreTools()

  // Build agent config with tool permission check
  const finalConfig: AgentConfig = {
    ...config,
    tools,
    canUseTool: (toolName: string): PermissionDecision => {
      const permission = toolPermissions?.[toolName] ?? 'allow'
      if (permission === 'deny') {
        return { behavior: 'deny', message: 'Tool blocked: denied by policy' }
      }
      return { behavior: 'allow' }
    },
  }

  // Create agent with direct library call
  const agent = createAgent(finalConfig)

  return agent
}

export type { ToolDef, Agent }

import { createAgent, coreTools, extendedTools, allTools, sandboxCoreTools } from 'codenano'
import type { Agent, ToolDef, AgentConfig, PermissionDecision } from 'codenano'

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
 */
export function createAgentInstance(config: AgentFactoryConfig): Agent {
  const { toolPreset = 'core', toolPermissions, ...agentConfig } = config

  // Determine tools based on containerId
  let tools: ToolDef[]
  if ((agentConfig as any).containerId) {
    // Sandbox mode: use sandbox tools
    tools = sandboxCoreTools()
  } else {
    // Non-sandbox mode: use preset
    const presetFn = TOOL_PRESETS[toolPreset] ?? coreTools
    tools = presetFn()
  }

  // Build agent config with tool permission check
  const finalConfig: AgentConfig = {
    ...agentConfig,
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

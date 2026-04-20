import { createAgent, coreTools, extendedTools, allTools, defineTool } from 'codenano'
import type { Agent, ToolDef, AgentConfig, HookContext, PreToolUseResult, PostToolUseHookFn, StopHookFn, StopHookResult, MessageParam } from 'codenano'
import { HookCoordinator } from './hooks/hook-coordinator.js'

const TOOL_PRESETS = {
  core: coreTools,
  extended: extendedTools,
  all: allTools,
} as const

export type ToolPreset = keyof typeof TOOL_PRESETS

export interface AgentFactoryConfig extends Omit<AgentConfig, 'tools'> {
  toolPreset?: ToolPreset
  tools?: ToolDef[]
  toolPermissions?: Record<string, 'allow' | 'deny' | 'ask'>
  hookCoordinator?: HookCoordinator | null
}

/**
 * Create an agent with codenano direct library integration.
 * Replaces subprocess spawning with in-process agent creation.
 */
export function createAgentInstance(config: AgentFactoryConfig): Agent {
  const { toolPreset = 'core', tools: customTools, toolPermissions, hookCoordinator, ...agentConfig } = config

  // Resolve tools - custom tools take precedence
  let tools: ToolDef[] = customTools ?? []

  // If no custom tools, use preset
  if (tools.length === 0) {
    const presetFn = TOOL_PRESETS[toolPreset] ?? coreTools
    tools = presetFn()
  }

  // Build agent config with hooks
  const finalConfig: AgentConfig = {
    ...agentConfig,
    tools,
  }

  // Wire up hook callbacks
  if (hookCoordinator) {
    finalConfig.onPreToolUse = async (context: HookContext & { toolName: string; toolInput: Record<string, unknown>; toolUseId: string }): Promise<PreToolUseResult> => {
      const { toolName, toolInput } = context

      // Check tool permission
      const permission = toolPermissions?.[toolName] ?? 'ask'

      if (permission === 'deny') {
        return { block: 'Tool blocked: denied by policy' }
      }

      if (permission === 'ask' && hookCoordinator.isHookRegistered('onPreToolUse')) {
        const decision = await hookCoordinator.emitAndWait('onPreToolUse', {
          toolName,
          toolInput,
        })

        if (decision.behavior === 'deny') {
          return { block: decision.message ?? 'Tool blocked by hook' }
        }
      }

      return undefined // Allow
    }

    finalConfig.onPostToolUse = async (context: HookContext & { toolName: string; toolInput: Record<string, unknown>; toolUseId: string; output: string; isError: boolean }): Promise<void> => {
      if (hookCoordinator.isHookRegistered('onPostToolUse')) {
        await hookCoordinator.emitAndWait('onPostToolUse', {
          toolName: context.toolName,
          toolInput: context.toolInput,
          output: context.output,
          isError: context.isError,
        })
      }
    }

    finalConfig.onTurnEnd = async (context: { messages: readonly MessageParam[]; lastResponse: string }): Promise<StopHookResult> => {
      if (hookCoordinator.isHookRegistered('onTurnEnd')) {
        await hookCoordinator.emitAndWait('onTurnEnd', { messages: context.messages })
      }
      return {} // Continue normally
    }
  }

  // Create agent with direct library call
  const agent = createAgent(finalConfig)

  return agent
}

export { defineTool }
export type { ToolDef, Agent }

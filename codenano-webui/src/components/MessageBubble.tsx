import { useMemo, useState } from 'react'
import { ChevronRight, Wrench, AlertCircle, CheckCircle2, Brain, Loader2 } from 'lucide-react'
import { MarkdownText } from '@/components/MarkdownText' 
import { cn } from '@/lib/utils'
import type { UIMessage, ContentBlock } from '@/lib/types'

// ==========================================
// 1. 思考过程组件
// ==========================================
function ThinkingBlock({ block }: { block: Extract<ContentBlock, { type: 'thinking' }> }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="w-full max-w-[85%] rounded-md border border-border/60 bg-muted/10 overflow-hidden text-sm shadow-sm transition-all mb-1.5">
      <button type="button" onClick={() => setOpen(!open)} className="group flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/30 cursor-pointer">
        <Brain className="h-3.5 w-3.5 text-purple-500/70 shrink-0" />
        <span className="font-semibold text-foreground/80">Agent Thinking</span>
        <ChevronRight className={cn('ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200', open && 'rotate-90')} />
      </button>
      {open && (
        <div className="border-t border-border/40 p-3 text-[13px] leading-relaxed text-muted-foreground/90 bg-muted/5 text-left animate-in fade-in slide-in-from-top-1">
           <MarkdownText>{block.thinking}</MarkdownText>
        </div>
      )}
    </div>
  )
}

// ==========================================
// 2. 完美的成对 Action 组件
// ==========================================
type ToolUseBlock = Extract<ContentBlock, { type: 'tool_use' }>

function ToolActionBlock({ block }: { block: ToolUseBlock }) {
  const [open, setOpen] = useState(false) // 默认折叠

  // 状态推断
  const isPending = !block.result
  const isError = block.result?.is_error
  const isEmptySuccess = !isError && (!block.result?.content || block.result.content.trim() === '')

  // 格式化 Input
  const formattedInput = useMemo(() => {
    if (!block.input) return '{}'
    if (typeof block.input === 'string') {
      try { return JSON.stringify(JSON.parse(block.input), null, 2) } catch { return block.input }
    }
    return JSON.stringify(block.input, null, 2)
  }, [block.input])

  return (
    <div className={cn(
      "w-full max-w-[85%] rounded-md border overflow-hidden font-mono text-sm shadow-sm text-left mb-1.5 transition-all",
      isError ? "border-red-500/30" : "border-border/60"
    )}>
      {/* 统一折叠按钮：展示 Tool 状态 */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors cursor-pointer",
          isError ? "bg-red-500/10 hover:bg-red-500/20 text-red-600" : "bg-muted/20 hover:bg-muted/40 text-muted-foreground"
        )}
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-blue-500" />
        ) : isError ? (
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
        ) : (
          <Wrench className="h-3.5 w-3.5 shrink-0 text-green-600/70 dark:text-green-500/70" />
        )}
        
        <span className="font-semibold whitespace-nowrap">
          Action: {block.name || 'Unknown'}
        </span>

        {/* 状态简要预览 */}
        <span className="ml-2 truncate text-[10px] opacity-70 font-normal">
          {isPending ? '(Executing...)' : isError ? '(Failed)' : '(Completed)'}
        </span>

        <ChevronRight className={cn('ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200', open && 'rotate-90')} />
      </button>

      {/* 展开后的内容：Input 和 Output 上下完美拼接 */}
      {open && (
        <div className="flex flex-col animate-in fade-in slide-in-from-top-1 bg-muted/5">
          {/* 输入参数 */}
          <div className="px-3 py-2 text-[11px] leading-relaxed text-muted-foreground overflow-x-auto border-b border-border/20 border-dashed">
            <div className="mb-1 text-[10px] uppercase font-bold opacity-50">Input</div>
            <pre className="whitespace-pre-wrap break-words">{formattedInput}</pre>
          </div>

          {/* 结果输出 */}
          <div className={cn(
            "px-3 py-2 text-[11px] leading-relaxed overflow-x-auto",
            isError ? "bg-red-500/5 text-red-600 dark:text-red-400" : "text-muted-foreground/90"
          )}>
            <div className="mb-1 text-[10px] uppercase font-bold opacity-50">Output</div>
            {isPending ? (
              <span className="flex items-center gap-1.5 italic opacity-70 animate-pulse">
                Waiting for result...
              </span>
            ) : isEmptySuccess ? (
              <span className="flex items-center gap-1.5 italic opacity-70">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500/70" /> Completed with no output.
              </span>
            ) : (
              <pre className="whitespace-pre-wrap break-words">{block.result!.content}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ==========================================
// 3. 主气泡组件
// ==========================================
export function MessageBubble({ message }: { message: UIMessage }) {
  const baseAnim = 'animate-in fade-in-0 slide-in-from-bottom-1 duration-200 ease-out'

  // 注意：传进来的 message 已经是被 normalizeChatHistory 处理过的了
  const blocks: ContentBlock[] = Array.isArray(message.content) 
    ? message.content 
    : [{ type: 'text', text: String(message.content || '') }]

  // 纯用户侧判定（左边）
  if (message.role === 'user') {
    const textContent = blocks.find(b => b.type === 'text') as Extract<ContentBlock, { type: 'text' }> | undefined
    const hasOnlyText = blocks.length === 1 && blocks[0].type === 'text'

    if (hasOnlyText) {
      return (
        <div className={cn('group flex w-full justify-start py-2', baseAnim)}>
          <p className="max-w-[75%] md:max-w-[65%] rounded-2xl rounded-tl-sm bg-primary px-5 py-3 text-[15px] leading-relaxed text-primary-foreground whitespace-pre-wrap break-words shadow-sm text-left">
            {textContent?.text || String(message.content)}
          </p>
        </div>
      )
    }

    // 用户消息包含 tool_use/tool_result，使用类似 assistant 的渲染方式
    return (
      <div className={cn('group flex w-full justify-start py-0.5', baseAnim)}>
        <div className="w-full max-w-[90%] md:max-w-[85%] flex flex-col items-start">
          {blocks.map((block, i) => {
            if (block.type === 'thinking') {
              return <ThinkingBlock key={`think-${i}`} block={block} />
            }
            if (block.type === 'tool_use') {
              return <ToolActionBlock key={block.id || `tool-${i}`} block={block} />
            }
            if (block.type === 'text' && block.text?.trim()) {
              return (
                <div key={`text-${i}`} className="bg-primary rounded-2xl rounded-tl-sm px-4 py-2.5 my-1 text-[15px] leading-relaxed text-primary-foreground shadow-sm w-fit max-w-full text-left">
                  <MarkdownText>{block.text}</MarkdownText>
                </div>
              )
            }
            return null
          })}
        </div>
      </div>
    )
  }

  // Agent 侧（右边）
  return (
    <div className={cn('flex w-full justify-end py-0.5', baseAnim)}>
      <div className="w-full max-w-[90%] md:max-w-[85%] flex flex-col items-end">
        {blocks.map((block, i) => {
          if (block.type === 'thinking') {
            return <ThinkingBlock key={`think-${i}`} block={block} />
          }
          if (block.type === 'tool_use') {
            // 现在的 tool_use 已经自带 result 了！
            return <ToolActionBlock key={block.id || `tool-${i}`} block={block} />
          }
          if (block.type === 'text' && block.text?.trim()) {
            return (
              <div key={`text-${i}`} className="bg-secondary/60 border border-border/40 rounded-2xl rounded-tr-sm px-4 py-2.5 my-1 text-[15px] leading-relaxed text-foreground shadow-sm w-fit max-w-full text-left">
                <MarkdownText>{block.text}</MarkdownText>
              </div>
            )
          }
          return null
        })}
      </div>
    </div>
  )
}
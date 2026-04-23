import { useMemo, useState } from 'react'
import { ChevronRight, Wrench, AlertCircle, CheckCircle2, Brain, Loader2 } from 'lucide-react'
import { MarkdownText } from '@/components/MarkdownText'
import { cn } from '@/lib/utils'
import type { UIMessage, ContentBlock } from '@/lib/types'
import { i18n } from '@/lib/i18n'

// ==========================================
// 1. 思考过程组件 (加深背景 & 紧凑设计)
// ==========================================
function ThinkingBlock({ block }: { block: Extract<ContentBlock, { type: 'thinking' }> }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className={cn(
        "relative rounded-lg border transition-all duration-300 ease-out origin-left flex-shrink-0",
        open 
          ? "w-full bg-muted/30 border-border/60 mb-1 shadow-sm" 
          : "w-full max-w-[220px] bg-muted/20 border-border/30 hover:bg-muted/40 hover:border-border/50"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="group flex w-full items-center gap-2 px-2.5 h-[32px] text-xs transition-colors cursor-pointer select-none"
      >
        <Brain
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-colors duration-300",
            open ? "text-purple-500" : "text-muted-foreground/40 group-hover:text-purple-400"
          )}
        />
        <span className={cn(
          "flex-1 truncate text-left text-[13px] font-medium transition-colors",
          open ? "text-foreground" : "text-foreground/70"
        )}>
          {i18n.thinking}
        </span>
        <ChevronRight
          className={cn(
            'shrink-0 h-3 w-3 text-muted-foreground/40 transition-transform duration-300',
            open ? 'rotate-90 text-muted-foreground/70' : ''
          )}
        />
      </button>

      <div className={cn("grid transition-all duration-300 ease-in-out", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">
          {/* 这里加深了内层背景色 */}
          <div className="border-t border-border/40 p-3 text-[13px] leading-relaxed text-muted-foreground bg-muted/50 dark:bg-black/20 text-left">
            <MarkdownText>{block.thinking}</MarkdownText>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// 2. 工具调用组件 (高对比度终端背景)
// ==========================================
type ToolUseBlock = Extract<ContentBlock, { type: 'tool_use' }>

function ToolActionBlock({ block }: { block: ToolUseBlock }) {
  const [open, setOpen] = useState(false)

  const isPending = !block.result
  const isError = block.result?.is_error
  const isEmptySuccess = !isError && (!block.result?.content || block.result.content.trim() === '')

  const formattedInput = useMemo(() => {
    if (!block.input) return '{}'
    if (typeof block.input === 'string') {
      try { return JSON.stringify(JSON.parse(block.input), null, 2) } catch { return block.input }
    }
    return JSON.stringify(block.input, null, 2)
  }, [block.input])

  return (
    <div
      className={cn(
        "relative rounded-lg border overflow-hidden transition-all duration-300 ease-out origin-left flex-shrink-0",
        open 
          ? "w-full border-border/60 mb-1 shadow-md" 
          : cn("w-full max-w-[220px] border-border/30", isError ? "bg-red-500/5 border-red-500/20 hover:bg-red-500/10" : "bg-muted/20 hover:bg-muted/40")
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "group flex w-full items-center gap-2 px-2.5 h-[32px] text-xs transition-colors cursor-pointer whitespace-nowrap select-none",
          open ? "bg-background" : ""
        )}
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-blue-500" />
        ) : isError ? (
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
        ) : (
          <Wrench className="h-3.5 w-3.5 shrink-0 text-emerald-500/70" />
        )}

        <span className={cn(
          "font-mono text-[10.5px] font-medium truncate",
          open ? "text-foreground" : "text-foreground/70"
        )}>
          {block.name || 'Action'}
        </span>

        <span className="text-[9px] text-muted-foreground/50 font-medium ml-1">
          {isPending ? i18n.running : isError ? i18n.failed : 'DONE'}
        </span>

        <ChevronRight className={cn('ml-auto h-3 w-3 text-muted-foreground/40 shrink-0 transition-transform duration-300', open ? 'rotate-90 text-muted-foreground/70' : '')} />
      </button>

      <div className={cn("grid transition-all duration-300 ease-in-out bg-[#0D1117]", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">
          <div className="flex flex-col text-left border-t border-white/10">
            {/* Input 区 - 使用深色背景 */}
            <div className="px-3 py-2 border-b border-white/5 bg-black/20 overflow-x-auto">
              <span className="text-[13px] font-bold text-white/30 block mb-1">{i18n.input}</span>
              <pre className="text-[13px] font-mono leading-relaxed text-white/80 whitespace-pre-wrap break-words">{formattedInput}</pre>
            </div>

            {/* Output 区 - 纯黑/极深色背景 */}
            <div className={cn("px-3 py-2 overflow-x-auto max-h-[300px] overflow-y-auto custom-scrollbar bg-black/40", isError && "bg-red-950/30")}>
              <span className="text-[13px] font-bold text-white/30 block mb-1">{i18n.output}</span>
              {isPending ? (
                <span className="flex items-center gap-2 text-white/30 text-[13px] font-mono italic">
                  Running...
                </span>
              ) : isEmptySuccess ? (
                <span className="text-emerald-500/60 text-[13px] font-mono font-medium">
                  ✓ Success
                </span>
              ) : (
                <pre className={cn("text-[13px] font-mono leading-relaxed whitespace-pre-wrap break-words", isError ? "text-red-400" : "text-white/60")}>
                  {block.result!.content}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// 3. 主气泡组件
// ==========================================
export function MessageBubble({ message }: { message: UIMessage }) {
  const baseAnim = 'animate-in fade-in-0 slide-in-from-bottom-1 duration-300 ease-out'

  const blocks: ContentBlock[] = Array.isArray(message.content)
    ? message.content
    : [{ type: 'text', text: String(message.content || '') }]

  const hasRenderableContent = blocks.some(b => b.type === 'text' || b.type === 'thinking' || b.type === 'tool_use')
  if (!hasRenderableContent) return null;

  if (message.role === 'user') {
    const textContent = blocks.find(b => b.type === 'text') as Extract<ContentBlock, { type: 'text' }> | undefined
    return (
      <div className={cn('group flex w-full justify-end py-1', baseAnim)}>
        <p className="max-w-[85%] md:max-w-[75%] rounded-2xl rounded-tr-sm bg-foreground text-background px-4 py-2 text-[15px] leading-relaxed whitespace-pre-wrap break-words shadow-sm text-left">
          {textContent?.text || String(message.content)}
        </p>
      </div>
    )
  }

  return (
    <div className={cn('flex w-full justify-start py-1', baseAnim)}>
      <div className="mx-auto w-full max-w-3xl px-4 flex flex-col items-start gap-1">
        {blocks.map((block, i) => {
          if (block.type === 'thinking') {
            return <ThinkingBlock key={`think-${i}`} block={block} />
          }
          if (block.type === 'tool_use') {
            return <ToolActionBlock key={block.id || `tool-${i}`} block={block} />
          }
          if (block.type === 'text' && block.text?.trim()) {
            return (
              <div key={`text-${i}`} className="px-1 pt-2 pb-1 w-full text-[15px] leading-relaxed text-foreground text-left max-w-none prose prose-neutral dark:prose-invert">
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
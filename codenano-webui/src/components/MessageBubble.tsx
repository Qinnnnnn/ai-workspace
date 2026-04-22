import { useMemo, useState } from 'react'
import { ChevronRight, Wrench, AlertCircle, CheckCircle2, Brain, Loader2 } from 'lucide-react'
import { MarkdownText } from '@/components/MarkdownText'
import { cn } from '@/lib/utils'
import type { UIMessage, ContentBlock } from '@/lib/types'

// ==========================================
// 1. 思考过程组件 (轻量化胶囊设计)
// ==========================================
function ThinkingBlock({ block }: { block: Extract<ContentBlock, { type: 'thinking' }> }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className={cn(
        "relative rounded-xl border border-border/40 overflow-hidden shadow-sm transition-all duration-300 ease-out origin-left flex-shrink-0",
        // 收起时是灰色小胶囊，展开时变成全宽卡片
        open ? "w-full bg-background" : "w-full max-w-[260px] bg-muted/30 hover:bg-muted/50"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="group flex w-full items-center gap-2.5 px-3 h-[38px] text-xs transition-colors cursor-pointer select-none"
      >
        <Brain
          className={cn(
            "h-4 w-4 shrink-0 transition-colors duration-300",
            open ? "text-purple-500" : "text-muted-foreground/50 group-hover:text-purple-400"
          )}
        />

        <span className="flex-1 truncate text-left font-medium text-foreground/80">
          Agent Thinking
        </span>

        <ChevronRight
          className={cn(
            'shrink-0 h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-300 ease-out',
            open ? 'rotate-90' : ''
          )}
        />
      </button>

      {/* 💡 魔法黑科技：使用 CSS Grid 实现平滑的 height: auto 动画，永远告别 max-h 写死的高度！ */}
      <div className={cn("grid transition-all duration-300 ease-in-out", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">
          <div className="border-t border-border/30 p-4 text-[14px] leading-relaxed text-muted-foreground bg-muted/5 text-left">
            <MarkdownText>{block.thinking}</MarkdownText>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// 2. 工具调用组件 (终端美学)
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
        "relative rounded-xl border overflow-hidden shadow-sm transition-all duration-300 ease-out origin-left flex-shrink-0",
        isError ? "border-red-500/20" : "border-border/40",
        open ? "w-full bg-background" : cn("w-full max-w-[260px]", isError ? "bg-red-500/5 hover:bg-red-500/10" : "bg-muted/30 hover:bg-muted/50")
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="group flex w-full items-center gap-2.5 px-3 h-[38px] text-xs transition-colors cursor-pointer whitespace-nowrap select-none"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-500" />
        ) : isError ? (
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
        ) : (
          <Wrench className="h-4 w-4 shrink-0 text-emerald-500/80" />
        )}

        <span className="font-mono text-[11px] font-medium text-foreground/80">
          {block.name || 'Unknown Action'}
        </span>

        <span className="ml-1 text-[10px] text-muted-foreground/60 font-medium">
          {isPending ? 'running...' : isError ? 'failed' : '0.4s'}
        </span>

        <ChevronRight className={cn('ml-auto h-3.5 w-3.5 text-muted-foreground/50 shrink-0 transition-transform duration-300 ease-out', open ? 'rotate-90' : '')} />
      </button>

      {/* Grid 动画展开域 */}
      <div className={cn("grid transition-all duration-300 ease-in-out bg-[#0D1117]", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">
          <div className="flex flex-col text-left">
            {/* Input 区 */}
            <div className="px-4 py-3 border-b border-white/5 overflow-x-auto">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-white/40">Input</span>
              </div>
              <pre className="text-[12px] font-mono leading-relaxed text-white/80 whitespace-pre-wrap break-words">{formattedInput}</pre>
            </div>

            {/* Output 区 */}
            <div className={cn("px-4 py-3 overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar", isError && "bg-red-950/30")}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-white/40">Output</span>
              </div>
              
              {isPending ? (
                <span className="flex items-center gap-2 text-white/40 text-[12px] animate-pulse font-mono">
                  <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-ping" />
                  Awaiting output stream...
                </span>
              ) : isEmptySuccess ? (
                <span className="flex items-center gap-1.5 text-emerald-500/70 text-[12px] font-mono">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Execution completed with no console output.
                </span>
              ) : (
                <pre className={cn("text-[12px] font-mono leading-relaxed whitespace-pre-wrap break-words", isError ? "text-red-400" : "text-white/70")}>
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
  const baseAnim = 'animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out'

  const blocks: ContentBlock[] = Array.isArray(message.content)
    ? message.content
    : [{ type: 'text', text: String(message.content || '') }]

  const hasRenderableContent = blocks.some(b => b.type === 'text' || b.type === 'thinking' || b.type === 'tool_use')
  if (!hasRenderableContent) return null;

  // 用户侧（右侧）
  if (message.role === 'user') {
    const textContent = blocks.find(b => b.type === 'text') as Extract<ContentBlock, { type: 'text' }> | undefined
    return (
      <div className={cn('group flex w-full justify-end py-1', baseAnim)}>
        <p className="max-w-[80%] md:max-w-[70%] rounded-2xl rounded-tr-sm bg-foreground text-background px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap break-words shadow-sm text-left">
          {textContent?.text || String(message.content)}
        </p>
      </div>
    )
  }

  // Agent 侧（左侧）
  return (
    <div className={cn('flex w-full justify-start py-2', baseAnim)}>
      <div className="w-full max-w-3xl flex flex-col items-start gap-2.5">
        {blocks.map((block, i) => {
          if (block.type === 'thinking') {
            return <ThinkingBlock key={`think-${i}`} block={block} />
          }
          if (block.type === 'tool_use') {
            return <ToolActionBlock key={block.id || `tool-${i}`} block={block} />
          }
          if (block.type === 'text' && block.text?.trim()) {
            return (
              <div key={`text-${i}`} className="px-1 py-1 w-full text-[15px] leading-relaxed text-foreground text-left max-w-none prose prose-neutral dark:prose-invert">
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
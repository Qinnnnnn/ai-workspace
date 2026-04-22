import { useState } from 'react'
import { ChevronRight, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StreamEvent } from '@/lib/types'

interface ToolCallBlockProps {
  toolName: string
  toolUseId: string
  input: unknown
  output?: string
  isError?: boolean
}

export function ToolCallBlock({ toolName, input, output, isError }: ToolCallBlockProps) {
  const [open, setOpen] = useState(true)

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'group flex w-full items-center gap-2 rounded-md px-2 py-1.5',
          'text-xs text-muted-foreground transition-colors hover:bg-muted/45',
        )}
      >
        <Wrench className="h-3.5 w-3.5" aria-hidden />
        <span className="font-medium font-mono">{toolName}</span>
        <ChevronRight
          aria-hidden
          className={cn('ml-auto h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-90')}
        />
      </button>
      {open && (
        <div
          className={cn(
            'mt-1 space-y-1 border-l border-muted-foreground/20 pl-3',
            'animate-in fade-in-0 slide-in-from-top-1 duration-200',
          )}
        >
          {input != null && (
            <div className="font-mono text-[11.5px] leading-relaxed text-muted-foreground/90">
              <span className="text-muted-foreground/60">input: </span>
              <pre className="whitespace-pre-wrap break-words">{JSON.stringify(input, null, 2)}</pre>
            </div>
          )}
          {output !== undefined && (
            <div
              className={cn(
                'font-mono text-[11.5px] leading-relaxed',
                isError ? 'text-destructive' : 'text-muted-foreground/90',
              )}
            >
              <span className="text-muted-foreground/60">output: </span>
              <pre className="whitespace-pre-wrap break-words">{output}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ToolCallSequence renders a list of tool_use/tool_result events
export function ToolCallSequence({ events }: { events: StreamEvent[] }) {
  const toolCalls: { toolName: string; toolUseId: string; input: unknown; output?: string; isError?: boolean }[] = []

  for (const event of events) {
    if (event.type === 'tool_use') {
      toolCalls.push({ toolName: event.toolName, toolUseId: event.toolUseId, input: event.input })
    } else if (event.type === 'tool_result') {
      const existing = toolCalls.find((t) => t.toolUseId === event.toolUseId)
      if (existing) {
        existing.output = event.output
        existing.isError = event.isError
      }
    }
  }

  if (toolCalls.length === 0) return null

  return (
    <div className="mt-2 space-y-1">
      {toolCalls.map((tc) => (
        <ToolCallBlock
          key={tc.toolUseId}
          toolName={tc.toolName}
          toolUseId={tc.toolUseId}
          input={tc.input}
          output={tc.output}
          isError={tc.isError}
        />
      ))}
    </div>
  )
}

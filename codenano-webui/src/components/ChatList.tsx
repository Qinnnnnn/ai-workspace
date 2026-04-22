import { MoreHorizontal, Trash2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { SessionSummary } from '@/lib/types'
import { i18n } from '@/lib/i18n'

interface ChatListProps {
  sessions: SessionSummary[]
  activeId: string | null
  onSelect: (sessionId: string) => void
  onRequestDelete: (sessionId: string, label: string) => void
  loading?: boolean
}

function titleFor(s: SessionSummary, fallbackTitle: string): string {
  if (!s.sessionId) return fallbackTitle
  return fallbackTitle.length > 48 ? `${fallbackTitle.slice(0, 45)}…` : fallbackTitle
}

export function ChatList({ sessions, activeId, onSelect, onRequestDelete, loading }: ChatListProps) {
  if (loading && sessions.length === 0) {
    return <div className="px-3 py-6 text-[12px] text-muted-foreground">{i18n.loading}</div>
  }

  if (sessions.length === 0) {
    return <div className="px-3 py-6 text-xs text-muted-foreground">{i18n.noConversationsYet}</div>
  }

  return (
    <ScrollArea className="h-full">
      <ul className="space-y-0.5 px-2 py-1">
        {sessions.map((s) => {
          const active = s.sessionId === activeId
          const label = titleFor(s, s.sessionId.slice(0, 6))
          return (
            <li key={s.sessionId}>
              <div
                className={cn(
                  'group flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] transition-colors',
                  active
                    ? 'bg-sidebar-accent/80 text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_hsl(var(--border)/0.4)]'
                    : 'text-sidebar-foreground/88 hover:bg-sidebar-accent/45',
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(s.sessionId)}
                  className="flex min-w-0 flex-1 flex-col items-start text-left"
                >
                  <span className="w-full truncate font-medium leading-5">{label}</span>
                  <span className="text-[10.5px] text-muted-foreground/80">
                    {relativeTime(s.lastActivity ?? s.createdAt, 'zh') || '—'}
                  </span>
                </button>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger
                    className={cn(
                      'inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity',
                      'hover:bg-sidebar-accent hover:text-sidebar-foreground group-hover:opacity-100',
                      'focus-visible:opacity-100',
                      active && 'opacity-100',
                    )}
                    aria-label={`Actions for ${label}`}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => {
                        window.setTimeout(() => onRequestDelete(s.sessionId, label), 0)
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {i18n.delete}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          )
        })}
      </ul>
    </ScrollArea>
  )
}

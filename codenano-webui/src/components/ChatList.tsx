import { MoreHorizontal, Trash2, Pencil, Share2, Pin } from 'lucide-react'
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
    return (
      <div className="px-4 py-3 flex justify-start">
        <p className="text-sm text-muted-foreground/50 font-normal">
          {i18n.noConversationsYet}
        </p>
      </div>
    )
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
                  'group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-all duration-200',
                  active
                    ? 'bg-sidebar-accent/80 text-sidebar-accent-foreground shadow-sm'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(s.sessionId)}
                  className="flex min-w-0 flex-1 flex-col items-start text-left"
                >
                  <span className={cn(
                    "w-full truncate leading-5 transition-colors",
                    active ? "font-semibold" : "font-medium"
                  )}>
                    {label}
                  </span>
                  <span className="text-[11px] opacity-50 font-normal">
                    {relativeTime(s.lastActivity ?? s.createdAt, 'zh') || '—'}
                  </span>
                </button>

                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger
                    className={cn(
                      'inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground/60 transition-all',
                      'hover:bg-background hover:text-foreground hover:shadow-sm group-hover:opacity-100',
                      'focus-visible:ring-2 focus-visible:ring-ring outline-none',
                      active ? 'opacity-100' : 'lg:opacity-0',
                    )}
                    aria-label={`Actions for ${label}`}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>

                  {/* 下拉菜单样式优化 */}
                  <DropdownMenuContent
                    side="right"
                    align="start"
                    sideOffset={8}
                    className="min-w-[160px] rounded-xl p-1.5 shadow-xl border-border/50 animate-in fade-in zoom-in-95 duration-200"
                  >
                    {/* 分享 */}
                    <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors">
                      <Share2 className="h-4 w-4 text-muted-foreground/70" />
                      <span className="text-[13px] font-medium">分享对话</span>
                    </DropdownMenuItem>

                    {/* 重命名 */}
                    <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors">
                      <Pencil className="h-4 w-4 text-muted-foreground/70" />
                      <span className="text-[13px] font-medium">重命名</span>
                    </DropdownMenuItem>

                    {/* 删除按钮 */}
                    <DropdownMenuItem
                      onSelect={() => {
                        window.setTimeout(() => onRequestDelete(s.sessionId, label), 0)
                      }}
                      className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="text-[13px] font-medium">{i18n.delete}</span>
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
